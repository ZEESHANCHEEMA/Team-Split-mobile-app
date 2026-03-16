import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { getDashboardExtended, getReminders, dismissReminder } from '../services/firestore';
import { getFriends, getFriendBalance } from '../services/friendsFirestore';
import { useCurrency } from '../theme/useCurrency';
import { useTheme } from '../theme/useTheme';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { Colors } from '../theme/colors';
import type { Friend, Reminder } from '../types/firestore';
import { shareContent } from '../utils/shareUtils';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setDashboardData } from '../store/slices/cacheSlice';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { getOnboardingComplete, setOnboardingComplete } from '../utils/onboardingStorage';
import { EXPENSE_CATEGORIES } from '../constants/categories';

type DashboardNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavigation>();
  const dispatch = useAppDispatch();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const { teams, memberBalances } = useAppSelector(state => state.cache);
  const CURRENCY = useCurrency();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [onboardingComplete, setOnboardingCompleteState] = useState<boolean | null>(null);
  const [monthlySpendingTeam, setMonthlySpendingTeam] = useState(0);
  const [categoryTotalsTeam, setCategoryTotalsTeam] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      dispatch(setDashboardData({ teams: [], memberBalances: [] }));
      setFriends([]);
      setReminders([]);
      setLoading(false);
      return;
    }
    try {
      const [extended, friendsData, remindersData] = await Promise.all([
        getDashboardExtended(uid),
        getFriends(uid),
        getReminders(uid),
      ]);
      dispatch(setDashboardData({ teams: extended.teams, memberBalances: extended.memberBalances }));
      setFriends(friendsData);
      setReminders(remindersData);
      setMonthlySpendingTeam(extended.monthlySpending);
      setCategoryTotalsTeam(extended.categoryTotals);
    } catch {
      dispatch(setDashboardData({ teams: [], memberBalances: [] }));
      setFriends([]);
      setReminders([]);
      setMonthlySpendingTeam(0);
      setCategoryTotalsTeam({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      getOnboardingComplete().then(setOnboardingCompleteState);
    }, [load])
  );

  const handleOnboardingComplete = useCallback(async () => {
    await setOnboardingComplete();
    setOnboardingCompleteState(true);
  }, []);

  const showOnboarding =
    onboardingComplete === false &&
    !loading &&
    teams.length === 0 &&
    friends.length === 0;

  const handleSendReminder = useCallback(
    (r: Reminder) => {
      const msg = r.description
        ? `Hi ${r.targetName}, a friendly reminder: ${CURRENCY} ${r.amount.toFixed(2)} – ${r.description}. (TeamSplit)`
        : `Hi ${r.targetName}, a friendly reminder about ${CURRENCY} ${r.amount.toFixed(2)}. (TeamSplit)`;
      shareContent(msg, 'Remind');
    },
    [CURRENCY]
  );

  const handleDismissReminder = useCallback(
    async (reminderId: string) => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        await dismissReminder(uid, reminderId);
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      } catch {
        // ignore
      }
    },
    []
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const friendNet = friends.reduce((sum, f) => {
    const bal = getFriendBalance(f);
    return sum + (bal.theyOweMe - bal.iOweThem);
  }, 0);
  const friendsToReceive = Math.max(0, friendNet);
  const friendsToPay = Math.max(0, -friendNet);

  const now = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000, [now]);
  const currentMonthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000, [now]);
  const { monthlyFromFriends, categoryFromFriends } = useMemo(() => {
    let monthly = 0;
    const byCat: Record<string, number> = {};
    for (const f of friends) {
      for (const bill of f.bills || []) {
        const sec = bill.createdAt?.seconds ?? 0;
        if (sec >= currentMonthStart && sec <= currentMonthEnd) {
          monthly += bill.totalAmount;
          const cat = bill.category || 'general';
          byCat[cat] = (byCat[cat] || 0) + bill.totalAmount;
        }
      }
    }
    return { monthlyFromFriends: monthly, categoryFromFriends: byCat };
  }, [friends, currentMonthStart, currentMonthEnd]);
  const totalMonthlySpending = monthlySpendingTeam + monthlyFromFriends;
  const mergedCategoryTotals = useMemo(() => {
    const m: Record<string, number> = { ...categoryTotalsTeam };
    for (const [cat, val] of Object.entries(categoryFromFriends)) {
      m[cat] = (m[cat] || 0) + val;
    }
    return m;
  }, [categoryTotalsTeam, categoryFromFriends]);
  const topCategories = useMemo(() => {
    return EXPENSE_CATEGORIES.map((c) => ({ ...c, total: mergedCategoryTotals[c.value] || 0 }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [mergedCategoryTotals]);

  const totalYouOwe = teams.reduce((sum, t) => sum + t.youOwe, 0) + friendsToPay;
  const totalOwedToYou = teams.reduce((sum, t) => sum + t.owedToYou, 0) + friendsToReceive;
  const totalPending = totalYouOwe + totalOwedToYou;
  const totalSettled = 0; // optional: sum of settled amounts if we track it
  const netBalance = totalOwedToYou - totalYouOwe;

  const handleTeamPress = (teamId: string) => {
    navigation.navigate('TeamDetail', { teamId });
  };

  const handleSeeAllTeams = () => {
    navigation.navigate('CreateTeam');
  };

  const handleAddExpense = () => {
    if (teams.length === 0) {
      navigation.navigate('CreateTeam');
      return;
    }
    navigation.navigate('AddExpense', { teamId: teams[0].id });
  };

  if (loading && teams.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayTeams = teams.slice(0, 3);

  return (
    <>
      <OnboardingOverlay
        visible={showOnboarding}
        onCreateTeam={handleSeeAllTeams}
        onAddFriend={() => navigation.navigate('Friends')}
        onComplete={handleOnboardingComplete}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>Welcome back 👋</Text>
      <Text style={styles.appTitle}>TeamSplit</Text>

      {/* Primary stat card – reference: bg-primary rounded-2xl p-5 */}
      {/* <View style={styles.primaryCard}>
        <Text style={styles.primaryCardLabel}>Total Pending</Text>
        <Text style={styles.primaryCardAmount}>
          {CURRENCY} {totalPending.toFixed(2)}
        </Text>
        <View style={styles.primaryCardRow}>
          <Text style={styles.primaryCardMeta}>
            {teams.length} {teams.length === 1 ? 'team' : 'teams'}
          </Text>
          <Text style={styles.primaryCardMeta}>
            {CURRENCY} {totalSettled.toFixed(2)} settled
          </Text>
        </View>
      </View> */}

      {/* Two small cards – You're owed (لینے ہیں) / You owe (دینے ہیں) */}
      <View style={styles.twoColRow}>
        <View style={styles.smallCard}>
          <View style={[styles.smallCardIcon, styles.smallCardIconSuccess]}>
            <Ionicons name="arrow-down-outline" size={16} color={colors.primaryTextOnPrimary} />
          </View>
          <Text style={styles.smallCardLabel}>To Receive</Text>
          <Text style={[styles.smallCardAmount, styles.smallCardAmountSuccess]}>
            {CURRENCY} {totalOwedToYou.toFixed(2)}
          </Text>
        </View>
        <View style={styles.smallCard}>
          <View style={[styles.smallCardIcon, styles.smallCardIconWarning]}>
            <Ionicons name="arrow-up-outline" size={16} color={colors.primaryTextOnPrimary} />
          </View>
          <Text style={styles.smallCardLabel}>To Pay</Text>
          <Text style={[styles.smallCardAmount, styles.smallCardAmountWarning]}>
            {CURRENCY} {totalYouOwe.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Monthly spending */}
      <View style={[styles.monthlyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.monthlyCardRow}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[styles.monthlyCardLabel, { color: colors.mutedText }]}>This month</Text>
        </View>
        <Text style={[styles.monthlyCardAmount, { color: colors.text }]}>
          {CURRENCY} {totalMonthlySpending.toFixed(2)}
        </Text>
      </View>

      {/* Category breakdown */}
      {topCategories.length > 0 && (
        <View style={[styles.categorySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.categorySectionTitle, { color: colors.text }]}>Spending by category</Text>
          {topCategories.map((cat) => (
            <View key={cat.value} style={styles.categoryRow}>
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: colors.text }]} numberOfLines={1}>{cat.label}</Text>
              <Text style={[styles.categoryAmount, { color: colors.text }]}>{CURRENCY} {cat.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

    
{/* 
      <FlatList
        data={displayTeams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No teams yet</Text>
            <Text style={styles.emptySubtext}>Create a team to start splitting expenses</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleSeeAllTeams}>
              <Text style={styles.emptyButtonText}>Create team</Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.teamSpacer} />}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const pending = item.youOwe > 0 ? item.youOwe : item.owedToYou;
          return (
            <TouchableOpacity
              style={styles.teamRow}
              onPress={() => handleTeamPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.teamEmoji}>
                <Text style={styles.teamEmojiText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.teamMiddle}>
                <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.teamSubtitle}>
                  {item.youOwe + item.owedToYou > 0 ? 'Pending' : 'Settled'} · balance
                </Text>
              </View>
              {pending > 0 && (
                <Text style={styles.teamPending}>
                  {CURRENCY} {Math.round(pending)}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      /> */}

      {(memberBalances.length > 0 || friends.length > 0) && (
        <View style={styles.peopleSection}>
          <Text style={styles.peopleSectionTitle}>People summary</Text>
          {memberBalances.map((m) => (
            <View key={m.teamId ? `team_${m.teamId}_${m.id}` : m.id} style={styles.personCard}>
              <View style={styles.personCardLeft}>
                <Text style={styles.personName}>{m.name}</Text>
                <Text style={styles.personSubtitle}>
                  {m.net > 0 ? 'To Receive' : m.net < 0 ? 'To Pay' : 'Settled up'}
                  {m.teamName ? ` · ${m.teamName}` : ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.personAmount,
                  m.net > 0 && styles.summaryPositive,
                  m.net < 0 && styles.summaryNegative,
                ]}
              >
                {CURRENCY} {Math.abs(m.net).toFixed(2)}
              </Text>
            </View>
          ))}
          {friends.map((f) => {
            const bal = getFriendBalance(f);
            const net = bal.theyOweMe - bal.iOweThem;
            return (
              <TouchableOpacity
                key={`friend_${f.id}`}
                style={styles.personCard}
                onPress={() => navigation.navigate('FriendDetail', { friendId: f.id })}
                activeOpacity={0.7}
              >
                <View style={styles.personCardLeft}>
                  <Text style={styles.personName}>{f.name}</Text>
                  <Text style={styles.personSubtitle}>
                    {net > 0 ? 'To Receive' : net < 0 ? 'To Pay' : 'Settled up'} · Friend
                  </Text>
                </View>
                <View style={styles.personCardRight}>
                  <Text
                    style={[
                      styles.personAmount,
                      net > 0 && styles.summaryPositive,
                      net < 0 && styles.summaryNegative,
                    ]}
                  >
                    {CURRENCY} {Math.abs(net).toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.personEditBtn}
                    onPress={() => navigation.navigate('FriendDetail', { friendId: f.id })}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {reminders.length > 0 && (
        <View style={styles.remindersSection}>
          <Text style={styles.peopleSectionTitle}>Reminders</Text>
          {reminders.map((r) => (
            <View key={r.id} style={styles.reminderCard}>
              <View style={styles.reminderCardLeft}>
                <Text style={styles.reminderTitle}>Remind {r.targetName}</Text>
                <Text style={styles.reminderSubtitle}>
                  {CURRENCY} {r.amount.toFixed(2)}
                  {r.description ? ` · ${r.description}` : ''}
                </Text>
              </View>
              <View style={styles.reminderActions}>
                <TouchableOpacity
                  style={[styles.reminderSendBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleSendReminder(r)}
                >
                  <Ionicons name="share-outline" size={16} color={colors.primaryTextOnPrimary} />
                  <Text style={styles.reminderSendBtnText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reminderDismissBtn}
                  onPress={() => handleDismissReminder(r.id)}
                >
                  <Ionicons name="close" size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
      </ScrollView>
    </>
  );
};

function makeStyles(colors: Colors, radius: { xl: number; lg: number }) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  primaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 24,
  },
  primaryCardLabel: {
    fontSize: 14,
    color: colors.primaryTextOnPrimary,
    opacity: 0.9,
  },
  primaryCardAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryTextOnPrimary,
    marginTop: 4,
  },
  primaryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  primaryCardMeta: {
    fontSize: 14,
    color: colors.primaryTextOnPrimary,
    opacity: 0.9,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  smallCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  smallCardIconSuccess: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  smallCardIconWarning: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  smallCardLabel: {
    fontSize: 12,
    color: colors.primaryTextOnPrimary,
    opacity: 0.95,
    paddingBottom: 14,
  },
  smallCardLabelUrdu: {
    fontSize: 11,
    color: colors.primaryTextOnPrimary,
    opacity: 0.9,
    marginTop: 1,
  },
  smallCardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryTextOnPrimary,
    marginTop: 2,
  },
  smallCardAmountSuccess: {
    color: '#B8F5D4',
  },
  smallCardAmountWarning: {
    color: '#FEF3C7',
  },
  monthlyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  monthlyCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  monthlyCardLabel: { fontSize: 14 },
  monthlyCardAmount: { fontSize: 22, fontWeight: '700' },
  categorySection: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  categorySectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  categoryEmoji: { fontSize: 18 },
  categoryLabel: { flex: 1, fontSize: 14 },
  categoryAmount: { fontSize: 14, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  listContent: {
    flex:1,
    paddingBottom: 24,
  },
  teamSpacer: {
    height: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(232, 92, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamEmojiText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  teamMiddle: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  teamSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  teamPending: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  summaryPositive: {
    color: colors.success,
  },
  summaryNegative: {
    color: colors.warning,
  },
  peopleSection: {
    marginTop: 4,
    marginBottom: 24,
  },
  remindersSection: {
    marginBottom: 126,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  reminderCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
  reminderSendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  reminderDismissBtn: {
    padding: 4,
  },
  peopleSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  personCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  personCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personEditBtn: { padding: 4 },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  personSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 8,
  },
  personAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  });
}

export default DashboardScreen;
