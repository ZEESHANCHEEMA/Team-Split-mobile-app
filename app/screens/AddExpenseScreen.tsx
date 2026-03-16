import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
  addExpense,
  getUserProfile,
  addGuestMemberToTeam,
  getExpense,
  updateExpense,
  deleteExpense,
  removeMemberFromTeam,
} from '../services/firestore';
import { showToast } from '../utils/toast';
import { useCurrency } from '../theme/useCurrency';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import { EXPENSE_CATEGORIES } from '../constants/categories';

interface MemberOption {
  id: string;
  name: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

const AddExpenseScreen: React.FC<Props> = ({ navigation, route }) => {
  const { teamId, expenseId } = route.params;
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const CURRENCY = useCurrency();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [paidById, setPaidById] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('general');
  const isEditing = !!expenseId;

  const handleRemoveGuestMember = async (memberId: string) => {
    // Only allow removing guest members (ids created via addGuestMemberToTeam, usually 'guest_*')
    if (!memberId.startsWith('guest_')) return;
    setLoading(true);
    setError(null);
    try {
      await removeMemberFromTeam(teamId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
      if (paidById === memberId) {
        setPaidById(null);
      }
    } catch {
      setError('Could not remove member. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadTeam = async () => {
        try {
          const t = await getTeam(teamId);
          if (!t || !isActive) return;

          setTeamName(t.name);

          const currentUid = auth.currentUser?.uid;
          if (currentUid && isActive) {
            setCurrentUserId(currentUid);
          }
          const memberIds =
            t.memberIds && t.memberIds.length
              ? t.memberIds
              : currentUid
              ? [currentUid]
              : [];

          const baseMemberOptions: MemberOption[] = await Promise.all(
            memberIds.map(async (id) => {
              try {
                const profile = await getUserProfile(id);
                if (profile) {
                  return { id, name: profile.displayName || 'Friend' };
                }
              } catch {
                // ignore profile fetch errors
              }
              if (id === currentUid) {
                return { id, name: 'You' };
              }
              return { id, name: 'Friend' };
            })
          );

          const guestOptions: MemberOption[] =
            t.guestMembers?.map((g) => ({ id: g.id, name: g.name })) || [];

          const allOptions = [...baseMemberOptions, ...guestOptions];

          if (!isActive) return;
          setMembers(allOptions);

          if (expenseId) {
            // load existing expense to edit
            try {
              const existing = await getExpense(teamId, expenseId);
              if (existing && isActive) {
                setTitle(existing.title);
                setAmount(existing.amount.toString());
                setCategory(existing.category || 'general');
                const validSplit = existing.splitBetween.filter((id) =>
                  allOptions.some((m) => m.id === id)
                );
                setSelectedMemberIds(validSplit.length ? validSplit : allOptions.map((m) => m.id));
                const validPayer = allOptions.find((m) => m.id === existing.paidBy);
                setPaidById(validPayer ? validPayer.id : allOptions[0]?.id ?? null);
              }
            } catch {
              // ignore; user can still add new
            }
          } else {
            const defaultIds = allOptions.map((m) => m.id);
            setSelectedMemberIds(defaultIds);
            const defaultPayer =
              (currentUid && allOptions.find((m) => m.id === currentUid)) ??
              allOptions[0] ??
              null;
            setPaidById(defaultPayer ? defaultPayer.id : null);
          }
        } catch {
          // leave defaults; minimal impact on UX
        }
      };

      loadTeam();

      return () => {
        isActive = false;
      };
    }, [teamId])
  );

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const numAmount = parseFloat(amount.replace(/,/g, '.'));
    if (!trimmedTitle) {
      const message = 'Enter a description';
      setError(message);
      showToast(message);
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      const message = 'Enter a valid amount';
      setError(message);
      showToast(message);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      const message = 'Not signed in';
      setError(message);
      showToast(message);
      return;
    }
    const payerId = paidById || uid;
    const splitBetween = selectedMemberIds.length ? selectedMemberIds : [payerId];

    setLoading(true);
    setError(null);
    try {
      if (expenseId) {
        await updateExpense(teamId, expenseId, trimmedTitle, numAmount, payerId, splitBetween, category);
        showToast('Expense updated');
      } else {
        await addExpense(teamId, trimmedTitle, numAmount, payerId, splitBetween, undefined, category);
        showToast('Expense added');
      }
      setTitle('');
      setAmount('');
      navigation.goBack();
    } catch {
      const message = 'Could not save expense. Try again.';
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (id: string): string => {
    const match = members.find((m) => m.id === id);
    if (match) return match.name;
    if (currentUserId && id === currentUserId) return 'You';
    return 'Friend';
  };

  const orderedMembers: MemberOption[] = [...members].sort((a, b) => {
    if (currentUserId) {
      if (a.id === currentUserId && b.id !== currentUserId) return -1;
      if (b.id === currentUserId && a.id !== currentUserId) return 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="chevron-back" size={20} color={colors.mutedText} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit expense' : 'Split a Bill'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={56}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dinner at Joe's"
          placeholderTextColor={colors.mutedText}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setError(null);
          }}
          editable={!loading}
        />

        <Text style={styles.label}>Amount ({CURRENCY})</Text>
        <TextInput
          style={[styles.input, styles.amountInput]}
          placeholder="0.00"
          placeholderTextColor={colors.mutedText}
          value={amount}
          onChangeText={(t) => {
            setAmount(t.replace(/[^0-9.]/g, ''));
            setError(null);
          }}
          keyboardType="decimal-pad"
          editable={!loading}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const isSelected = category === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                  { borderColor: isSelected ? colors.primary : colors.border },
                ]}
                onPress={() => setCategory(cat.value)}
                disabled={loading}
              >
                <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryChipLabel,
                    { color: colors.text },
                    isSelected && styles.categoryChipLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.addMemberRow}>
          <TextInput
            style={[styles.input, styles.addMemberInput]}
            placeholder="Add member name"
            placeholderTextColor="#6b7280"
            value={newMemberName}
            onChangeText={(t) => {
              setNewMemberName(t);
              setError(null);
            }}
            editable={!loading && !addingMember}
          />
          <TouchableOpacity
            style={[styles.addMemberButton, (loading || addingMember) && styles.buttonDisabled]}
            disabled={loading || addingMember || !newMemberName.trim()}
            onPress={async () => {
              const trimmed = newMemberName.trim();
              if (!trimmed) return;
              setAddingMember(true);
              try {
                const guest = await addGuestMemberToTeam(teamId, trimmed);
                setMembers((prev) => [...prev, { id: guest.id, name: guest.name }]);
                setSelectedMemberIds((prev) => [...prev, guest.id]);
                setNewMemberName('');
              } catch {
                setError('Could not add member. Try again.');
              } finally {
                setAddingMember(false);
              }
            }}
          >
            {addingMember ? (
              <ActivityIndicator color={colors.primaryTextOnPrimary} />
            ) : (
              <Ionicons name="person-add" size={20} color={colors.primaryTextOnPrimary} />
            )}
          </TouchableOpacity>
        </View>
        {members.length > 0 && (
          <View style={styles.paidByContainer}>
            <Text style={styles.label}>Who paid?</Text>
            <View style={styles.paidByRow}>
              {orderedMembers.map((m) => {
                const isSelected = paidById === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.paidByChip,
                      isSelected && styles.paidByChipSelected,
                    ]}
                    disabled={loading}
                    onPress={() => {
                      setError(null);
                      setPaidById(m.id);
                    }}
                  >
                    <Ionicons
                      name={isSelected ? 'wallet' : 'person-outline'}
                      size={16}
                      color={isSelected ? colors.primaryTextOnPrimary : colors.mutedText}
                    />
                    <Text
                      style={[
                        styles.paidByChipText,
                        isSelected && styles.paidByChipTextSelected,
                      ]}
                    >
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {members.length > 0 && (
          <View style={styles.splitContainer}>
            <View style={styles.splitAmongRow}>
              <Text style={styles.label}>Split among</Text>
              <TouchableOpacity
                onPress={() => {
                  setError(null);
                  setSelectedMemberIds(orderedMembers.map((m) => m.id));
                }}
                disabled={loading}
              >
                <Text style={styles.selectAllText}>Select all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.splitMemberList}>
              {orderedMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const perPerson =
                  selectedMemberIds.length > 0 && amount
                    ? parseFloat(amount.replace(/,/g, '.')) / selectedMemberIds.length
                    : 0;
              const isGuest = m.id.startsWith('guest_');
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.splitMemberRow,
                      isSelected && styles.splitMemberRowSelected,
                    ]}
                    disabled={loading}
                    onPress={() => {
                      setError(null);
                      setSelectedMemberIds((prev) => {
                        const exists = prev.includes(m.id);
                        if (exists) {
                          if (prev.length === 1) return prev;
                          return prev.filter((id) => id !== m.id);
                        }
                        return [...prev, m.id];
                      });
                    }}
                  >
                    <View
                      style={[
                        styles.splitCheckbox,
                        isSelected && styles.splitCheckboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color={colors.primaryTextOnPrimary} />
                      )}
                    </View>
                    <Text style={styles.splitMemberName}>{m.name}</Text>
                    {isSelected && perPerson > 0 && (
                      <Text style={styles.splitPerPerson}>
                        {CURRENCY} {perPerson.toFixed(2)}
                      </Text>
                    )}
                  {isGuest && (
                    <TouchableOpacity
                      style={styles.removeMemberButton}
                      onPress={() => handleRemoveGuestMember(m.id)}
                      disabled={loading}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryTextOnPrimary} />
          ) : (
            <>
              <Ionicons
                name={isEditing ? 'save-outline' : 'checkmark'}
                size={20}
                color={colors.primaryTextOnPrimary}
              />
              <Text style={styles.buttonText}>
                {isEditing ? 'Save changes' : 'Split Bill'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={styles.deleteButton}
            disabled={loading}
            onPress={async () => {
              if (!expenseId) return;
              setLoading(true);
              setError(null);
              try {
                await deleteExpense(teamId, expenseId);
                navigation.goBack();
              } catch {
                setError('Could not delete expense. Try again.');
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text style={styles.deleteButtonText}>Delete expense</Text>
          </TouchableOpacity>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

function makeStyles(colors: Colors, radius: { lg: number }) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formWrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 48,
    color: colors.text,
    fontSize: 16,
    marginBottom: 20,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  categoryChipLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  categoryChipLabelSelected: {
    color: colors.primaryTextOnPrimary,
    fontWeight: '600',
  },
  paidByContainer: {
    marginBottom: 20,
  },
  paidByRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paidByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
  },
  paidByChipSelected: {
    backgroundColor: colors.primary,
  },
  paidByChipText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  paidByChipTextSelected: {
    color: colors.primaryTextOnPrimary,
  },
  splitContainer: {
    marginBottom: 20,
  },
  splitAmongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  splitMemberList: {
    gap: 8,
  },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  splitMemberRowSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(232, 92, 58, 0.06)',
  },
  splitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  splitCheckboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  splitMemberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  splitPerPerson: {
    fontSize: 14,
    color: colors.mutedText,
  },
  removeMemberButton: {
    marginLeft: 8,
    padding: 4,
  },
  addMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  addMemberInput: {
    flex: 1,
    marginBottom: 0,
  },
  addMemberButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  summaryInfo: {
    marginBottom: 12,
  },
  summaryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  summaryInfoText: {
    fontSize: 13,
    color: colors.mutedText,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  deleteButton: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
  },
  });
}

export default AddExpenseScreen;
