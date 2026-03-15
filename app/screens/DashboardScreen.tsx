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
import { getDashboardTeams, getMemberBalancesForUser } from '../services/firestore';
import { useCurrency } from '../theme/useCurrency';
import { useTheme } from '../theme/useTheme';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { Colors } from '../theme/colors';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setDashboardData } from '../store/slices/cacheSlice';

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

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      dispatch(setDashboardData({ teams: [], memberBalances: [] }));
      setLoading(false);
      return;
    }
    try {
      const [teamsData, memberData] = await Promise.all([
        getDashboardTeams(uid),
        getMemberBalancesForUser(uid),
      ]);
      dispatch(setDashboardData({ teams: teamsData, memberBalances: memberData }));
    } catch {
      dispatch(setDashboardData({ teams: [], memberBalances: [] }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const totalYouOwe = teams.reduce((sum, t) => sum + t.youOwe, 0);
  const totalOwedToYou = teams.reduce((sum, t) => sum + t.owedToYou, 0);
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

      {memberBalances.length > 0 && (
        <View style={styles.peopleSection}>
          <Text style={styles.peopleSectionTitle}>People summary</Text>
          {memberBalances.map((m) => (
            <View key={m.teamId ? `${m.teamId}_${m.id}` : m.id} style={styles.personCard}>
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
        </View>
      )}
    </ScrollView>
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
    paddingBottom: 32,
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
    marginBottom: 126,
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
