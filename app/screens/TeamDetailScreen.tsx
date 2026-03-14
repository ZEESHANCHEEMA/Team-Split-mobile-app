import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../services/firebaseConfig';
import {
  getTeam,
  getExpensesForTeam,
  computeBalanceForUserInTeam,
  getMemberBalancesForTeam,
  deleteTeam,
  removeMemberFromTeam,
} from '../services/firestore';
import { useCurrency } from '../theme/useCurrency';
import { useTheme } from '../theme/useTheme';
import type { Team, Expense, MemberBalanceSummary } from '../types/firestore';
import type { Colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

const TeamDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { teamId } = route.params;
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const CURRENCY = useCurrency();
  const [team, setTeam] = useState<Team | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [memberBalances, setMemberBalances] = useState<MemberBalanceSummary[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [t, ex, members] = await Promise.all([
        getTeam(teamId),
        getExpensesForTeam(teamId),
        getMemberBalancesForTeam(teamId, uid),
      ]);
      setTeam(t || null);
      setExpenses(ex);
      setMemberBalances(members);
      setBalance(t ? computeBalanceForUserInTeam(ex, uid) : 0);
    } catch {
      setTeam(null);
      setExpenses([]);
      setMemberBalances([]);
      setBalance(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

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

  const handleAddExpense = () => {
    navigation.navigate('AddExpense', { teamId });
  };

  const uid = auth.currentUser?.uid;
  const isCreator = !!team && uid === team.createdBy;

  const handleRemoveMember = useCallback(
    (memberId: string, memberName: string) => {
      const isSelf = memberId === uid;
      Alert.alert(
        isSelf ? 'Leave group?' : 'Remove member?',
        isSelf
          ? `You will leave "${team?.name}". You can be re-added by the creator.`
          : `Remove ${memberName} from this group?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isSelf ? 'Leave' : 'Remove',
            style: 'destructive',
            onPress: async () => {
              setActionLoading(true);
              try {
                await removeMemberFromTeam(teamId, memberId);
                if (isSelf) {
                  navigation.goBack();
                } else {
                  load();
                }
              } catch (e) {
                Alert.alert('Error', (e as Error).message ?? 'Could not remove member');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    },
    [teamId, team?.name, uid, load, navigation]
  );

  const handleDeleteGroup = useCallback(() => {
    Alert.alert(
      'Delete group?',
      `Permanently delete "${team?.name}" and all its bills? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteTeam(teamId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', (e as Error).message ?? 'Could not delete group');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [teamId, team?.name, navigation]);

  if (loading && !team) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Team not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSettled = balance === 0;
  const getPayerName = (paidById: string) =>
    paidById === uid ? 'You' : (memberBalances.find((m) => m.id === paidById)?.name ?? 'Someone');

  return (
    <View style={styles.container}>
      {/* Reference: back + emoji + name */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={colors.mutedText} />
        </TouchableOpacity>
        <View style={styles.teamEmoji}>
          {team.icon ? (
            <Text style={styles.teamEmojiEmoji}>{team.icon}</Text>
          ) : (
            <Text style={styles.teamEmojiText}>{team.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.title} numberOfLines={1}>{team.name}</Text>
      </View>

      {/* Members strip – reference: horizontal scroll, avatar, name, +$X/-$X/Settled */}
      {memberBalances.length > 0 && (
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members</Text>
          <FlatList
            horizontal
            data={memberBalances}
            keyExtractor={(m) => m.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersScroll}
            renderItem={({ item }) => {
              const isSelf = item.id === uid;
              const canRemove = isCreator ? true : isSelf;
              const statusColor = item.net > 0 ? colors.success : item.net < 0 ? colors.primary : colors.mutedText;
              return (
                <View style={[styles.memberCard, { borderLeftColor: statusColor }]}>
                  <Text style={styles.memberName} numberOfLines={1}>{item.name}</Text>
                  <Text
                    style={[
                      styles.memberNet,
                      item.net > 0 && styles.memberNetPositive,
                      item.net < 0 && styles.memberNetNegative,
                    ]}
                  >
                    {item.net > 0 ? `+${CURRENCY}${Math.round(item.net)}` : item.net < 0 ? `-${CURRENCY}${Math.round(Math.abs(item.net))}` : 'Settled'}
                  </Text>
                  {canRemove && (
                    <TouchableOpacity
                      style={styles.memberRemoveBtn}
                      onPress={() => handleRemoveMember(item.id, item.name)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.memberRemoveText}>
                        {isSelf ? 'Leave group' : 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Add Bill – reference: full-width h-12 rounded-xl */}
      <TouchableOpacity style={styles.addBillButton} onPress={handleAddExpense} activeOpacity={0.8}>
        <Ionicons name="add" size={20} color={colors.primaryTextOnPrimary} />
        <Text style={styles.addBillButtonText}>Add Bill</Text>
      </TouchableOpacity>

      {/* Bills – reference: bg-card rounded-2xl border p-4, Paid by X · date, Settled pill */}
      <Text style={styles.sectionTitle}>Bills</Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No bills yet</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddExpense}>
              <Text style={styles.emptyButtonText}>Add expense</Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.billSpacer} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.billCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AddExpense', { teamId, expenseId: item.id })}
          >
            <View style={styles.billCardTop}>
              <View>
                <Text style={styles.billTitle}>{item.title}</Text>
                <Text style={styles.billMeta}>
                  Paid by {getPayerName(item.paidBy)} · {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                </Text>
              </View>
              <View style={styles.billCardRight}>
                <Text style={styles.billAmount}>{CURRENCY} {item.amount.toFixed(2)}</Text>
                <View style={styles.settledPill}>
                  <Ionicons name="checkmark" size={12} color={colors.success} />
                  <Text style={styles.settledPillText}>Settled</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {isCreator && (
        <TouchableOpacity
          style={styles.deleteGroupButton}
          onPress={handleDeleteGroup}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteGroupButtonText}>Delete group</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  teamEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(232, 92, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamEmojiText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  teamEmojiEmoji: {
    fontSize: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  membersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  membersScroll: {
    paddingBottom: 8,
    gap: 8,
  },
  memberCard: {
    minWidth: 100,
    marginRight: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.mutedText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  memberNet: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedText,
    marginTop: 4,
  },
  memberNetPositive: {
    color: colors.success,
  },
  memberNetNegative: {
    color: colors.primary,
  },
  memberRemoveBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  memberRemoveText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  addBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginBottom: 24,
  },
  addBillButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  listContent: {
    paddingBottom: 24,
  },
  billSpacer: {
    height: 12,
  },
  billCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  billCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billCardRight: {
    alignItems: 'flex-end',
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  billMeta: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  settledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  settledPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 12,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    color: colors.primary,
    fontWeight: '600',
  },
  deleteGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.lg,
  },
  deleteGroupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  });
}

export default TeamDetailScreen;
