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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  updateTeamName,
  removeMemberFromTeam,
  getRecurringForTeam,
  addRecurringExpense,
  createExpenseFromRecurring,
  deleteRecurringExpense,
  deleteExpense,
} from '../services/firestore';
import { useCurrency } from '../theme/useCurrency';
import { useTheme } from '../theme/useTheme';
import type { Team, Expense, MemberBalanceSummary, RecurringExpense } from '../types/firestore';
import { showToast } from '../utils/toast';
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
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [recurringTitle, setRecurringTitle] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringPaidBy, setRecurringPaidBy] = useState<string | null>(null);
  const [recurringSplitBetween, setRecurringSplitBetween] = useState<string[]>([]);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringAddingId, setRecurringAddingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [t, ex, members, recList] = await Promise.all([
        getTeam(teamId),
        getExpensesForTeam(teamId),
        getMemberBalancesForTeam(teamId, uid),
        getRecurringForTeam(teamId),
      ]);
      setTeam(t || null);
      setExpenses(ex);
      setMemberBalances(members);
      setBalance(t ? computeBalanceForUserInTeam(ex, uid) : 0);
      setRecurring(recList);
    } catch {
      setTeam(null);
      setExpenses([]);
      setMemberBalances([]);
      setBalance(0);
      setRecurring([]);
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

  const openEditName = useCallback(() => {
    if (team) {
      setEditNameValue(team.name);
      setEditNameVisible(true);
    }
  }, [team]);

  const handleSaveEditName = useCallback(async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed) return;
    setActionLoading(true);
    try {
      await updateTeamName(teamId, trimmed);
      setEditNameVisible(false);
      load();
    } catch (e) {
      Alert.alert('Error', (e as Error).message ?? 'Could not update name');
    } finally {
      setActionLoading(false);
    }
  }, [teamId, editNameValue, load]);

  const openRecurringModal = useCallback(() => {
    const allIds = memberBalances.map((m) => m.id);
    setRecurringTitle('');
    setRecurringAmount('');
    setRecurringPaidBy(uid ?? null);
    setRecurringSplitBetween(allIds.length ? allIds : uid ? [uid] : []);
    setRecurringFrequency('monthly');
    setRecurringModalVisible(true);
  }, [memberBalances, uid]);

  const handleSaveRecurring = useCallback(async () => {
    const title = recurringTitle.trim();
    const num = parseFloat(recurringAmount.replace(/,/g, '.'));
    if (!title || !Number.isFinite(num) || num <= 0) {
      showToast('Enter title and valid amount', 'error');
      return;
    }
    const paidBy = recurringPaidBy ?? uid;
    const splitBetween = recurringSplitBetween.length ? recurringSplitBetween : (uid ? [uid] : []);
    if (!paidBy || splitBetween.length === 0) {
      showToast('Select who paid and who to split with', 'error');
      return;
    }
    setRecurringSaving(true);
    try {
      await addRecurringExpense(teamId, title, num, paidBy, splitBetween, recurringFrequency, 1);
      setRecurringModalVisible(false);
      showToast('Recurring expense added');
      load();
    } catch (e) {
      showToast((e as Error).message ?? 'Could not add recurring', 'error');
    } finally {
      setRecurringSaving(false);
    }
  }, [teamId, recurringTitle, recurringAmount, recurringPaidBy, recurringSplitBetween, recurringFrequency, uid, load]);

  const handleCreateFromRecurring = useCallback(
    async (recId: string) => {
      setRecurringAddingId(recId);
      try {
        await createExpenseFromRecurring(teamId, recId);
        showToast('Expense added');
        load();
      } catch (e) {
        showToast((e as Error).message ?? 'Could not add expense', 'error');
      } finally {
        setRecurringAddingId(null);
      }
    },
    [teamId, load]
  );

  const handleDeleteRecurring = useCallback(
    (rec: RecurringExpense) => {
      Alert.alert('Delete recurring?', `Remove "${rec.title}" from recurring?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurringExpense(teamId, rec.id);
              showToast('Removed');
              load();
            } catch {
              showToast('Could not remove', 'error');
            }
          },
        },
      ]);
    },
    [teamId, load]
  );

  const handleDeleteExpense = useCallback(
    (expense: Expense) => {
      Alert.alert(
        'Delete bill?',
        `Remove "${expense.title}" (${CURRENCY} ${expense.amount.toFixed(2)})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setActionLoading(true);
              try {
                await deleteExpense(teamId, expense.id);
                showToast('Bill removed');
                load();
              } catch {
                showToast('Could not remove bill', 'error');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    },
    [teamId, load, CURRENCY]
  );

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
        {isCreator && (
          <TouchableOpacity onPress={openEditName} style={styles.editNameButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={20} color={colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={editNameVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditNameVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit group name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Group name"
              placeholderTextColor={colors.mutedText}
              value={editNameValue}
              onChangeText={setEditNameValue}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButtonCancel, { borderColor: colors.border }]} onPress={() => setEditNameVisible(false)}>
                <Text style={[styles.modalButtonCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSave, { backgroundColor: colors.primary }]}
                onPress={handleSaveEditName}
                disabled={actionLoading || !editNameValue.trim()}
              >
                {actionLoading ? <ActivityIndicator size="small" color={colors.primaryTextOnPrimary} /> : <Text style={styles.modalButtonSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={recurringModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setRecurringModalVisible(false)} />
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add recurring expense</Text>
              <Text style={styles.modalLabel}>Title (e.g. Rent, Internet)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Title"
                placeholderTextColor={colors.mutedText}
                value={recurringTitle}
                onChangeText={setRecurringTitle}
              />
              <Text style={styles.modalLabel}>Amount</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="0"
                placeholderTextColor={colors.mutedText}
                value={recurringAmount}
                onChangeText={setRecurringAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.modalLabel}>Repeat</Text>
              <View style={styles.frequencyRow}>
                <TouchableOpacity
                  style={[styles.frequencyChip, recurringFrequency === 'weekly' && styles.frequencyChipActive, { borderColor: colors.border }]}
                  onPress={() => setRecurringFrequency('weekly')}
                >
                  <Text style={[styles.frequencyChipText, recurringFrequency === 'weekly' && styles.frequencyChipTextActive, { color: colors.text }]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.frequencyChip, recurringFrequency === 'monthly' && styles.frequencyChipActive, { borderColor: colors.border }]}
                  onPress={() => setRecurringFrequency('monthly')}
                >
                  <Text style={[styles.frequencyChipText, recurringFrequency === 'monthly' && styles.frequencyChipTextActive, { color: colors.text }]}>Monthly</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalLabel}>Paid by</Text>
              <View style={styles.paidByRow}>
                {memberBalances.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.paidByChip, recurringPaidBy === m.id && styles.paidByChipActive, { borderColor: colors.border }]}
                    onPress={() => setRecurringPaidBy(m.id)}
                  >
                    <Text style={[styles.paidByChipText, recurringPaidBy === m.id && styles.paidByChipTextActive, { color: colors.text }]} numberOfLines={1}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.modalLabelHint}>Split between all members by default</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButtonCancel, { borderColor: colors.border }]} onPress={() => setRecurringModalVisible(false)}>
                  <Text style={[styles.modalButtonCancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonSave, { backgroundColor: colors.primary }]}
                  onPress={handleSaveRecurring}
                  disabled={recurringSaving || !recurringTitle.trim() || !recurringAmount.trim()}
                >
                  {recurringSaving ? <ActivityIndicator size="small" color={colors.primaryTextOnPrimary} /> : <Text style={styles.modalButtonSaveText}>Add recurring</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

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

      {/* Recurring expenses */}
      <View style={styles.recurringSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recurring</Text>
          <TouchableOpacity onPress={openRecurringModal}>
            <Text style={styles.addRecurringLink}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {recurring.length === 0 ? (
          <Text style={styles.recurringEmpty}>No recurring expenses. Add rent, subscriptions, etc.</Text>
        ) : (
          recurring.map((rec) => (
            <View key={rec.id} style={[styles.recurringCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.recurringCardLeft}>
                <Text style={styles.recurringTitle}>{rec.title}</Text>
                <Text style={styles.recurringMeta}>
                  {CURRENCY} {rec.amount.toFixed(2)} · {rec.frequency}
                </Text>
              </View>
              <View style={styles.recurringCardRight}>
                <TouchableOpacity
                  style={[styles.recurringAddBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleCreateFromRecurring(rec.id)}
                  disabled={!!recurringAddingId}
                >
                  {recurringAddingId === rec.id ? (
                    <ActivityIndicator size="small" color={colors.primaryTextOnPrimary} />
                  ) : (
                    <Text style={styles.recurringAddBtnText}>Add this {rec.frequency === 'monthly' ? 'month' : 'week'}</Text>
                  )}
                </TouchableOpacity>
                {isCreator && (
                  <TouchableOpacity onPress={() => handleDeleteRecurring(rec)} style={styles.recurringDeleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

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
          <View style={styles.billCard}>
            <TouchableOpacity
              style={styles.billCardTouchable}
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
            <TouchableOpacity
              style={styles.billDeleteBtn}
              onPress={() => handleDeleteExpense(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
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
  editNameButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderRadius: radius.xl,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSave: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedText,
    marginBottom: 8,
  },
  modalLabelHint: {
    fontSize: 12,
    color: colors.mutedText,
    marginBottom: 16,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  frequencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  frequencyChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  frequencyChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  paidByRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  paidByChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  paidByChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  paidByChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  paidByChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  recurringSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addRecurringLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  recurringEmpty: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 8,
  },
  recurringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  recurringCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  recurringTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  recurringMeta: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  recurringCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
  recurringAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  recurringDeleteBtn: {
    padding: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  billCardTouchable: { flex: 1 },
  billDeleteBtn: { padding: 8, marginLeft: 4 },
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
