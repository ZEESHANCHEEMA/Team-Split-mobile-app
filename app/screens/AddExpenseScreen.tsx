import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../services/firebaseConfig';
import {
  getTeam,
  addExpense,
  CURRENCY,
  getUserProfile,
  addGuestMemberToTeam,
  getExpense,
  updateExpense,
  deleteExpense,
} from '../services/firestore';
import { colors } from '../theme/colors';

interface MemberOption {
  id: string;
  name: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

const AddExpenseScreen: React.FC<Props> = ({ navigation, route }) => {
  const { teamId, expenseId } = route.params;
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
  const isEditing = !!expenseId;

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
      setError('Enter a description');
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError('Not signed in');
      return;
    }
    const payerId = paidById || uid;
    const splitBetween = selectedMemberIds.length ? selectedMemberIds : [payerId];

    setLoading(true);
    setError(null);
    try {
      if (expenseId) {
        await updateExpense(teamId, expenseId, trimmedTitle, numAmount, payerId, splitBetween);
      } else {
        await addExpense(teamId, trimmedTitle, numAmount, payerId, splitBetween);
      }
      setTitle('');
      setAmount('');
      navigation.goBack();
    } catch {
      setError('Could not save expense. Try again.');
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit expense' : 'Add expense'}</Text>
      </View>
      {teamName ? (
        <Text style={styles.subtitle}>Team: {teamName}</Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="What was it for?"
        placeholderTextColor="#6b7280"
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          setError(null);
        }}
        editable={!loading}
      />

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
      <TextInput
        style={styles.input}
        placeholder={`Amount (${CURRENCY})`}
        placeholderTextColor="#6b7280"
        value={amount}
        onChangeText={(t) => {
          setAmount(t.replace(/[^0-9.]/g, ''));
          setError(null);
        }}
        keyboardType="decimal-pad"
        editable={!loading}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {members.length > 0 && (
        <View style={styles.paidByContainer}>
          <Text style={styles.splitLabel}>Paid by</Text>
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
          <Text style={styles.splitLabel}>Split between</Text>
          <View style={styles.splitChipsRow}>
            {orderedMembers.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.splitChip,
                    isSelected && styles.splitChipSelected,
                  ]}
                  disabled={loading}
                  onPress={() => {
                    setError(null);
                    setSelectedMemberIds((prev) => {
                      const exists = prev.includes(m.id);
                      if (exists) {
                        if (prev.length === 1) {
                          return prev; // keep at least one person
                        }
                        return prev.filter((id) => id !== m.id);
                      }
                      return [...prev, m.id];
                    });
                  }}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={isSelected ? colors.primaryTextOnPrimary : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.splitChipText,
                      isSelected && styles.splitChipTextSelected,
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

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#020617" />
        ) : (
          <>
            <Ionicons name={isEditing ? 'save-outline' : 'add-circle'} size={20} color="#020617" />
            <Text style={styles.buttonText}>{isEditing ? 'Save changes' : 'Add expense'}</Text>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  splitContainer: {
    marginBottom: 12,
  },
  splitLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedText,
    marginBottom: 8,
  },
  splitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  splitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  splitChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  splitChipText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.mutedText,
  },
  splitChipTextSelected: {
    color: colors.primaryTextOnPrimary,
    fontWeight: '600',
  },
  paidByContainer: {
    marginBottom: 12,
  },
  paidByRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paidByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paidByChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paidByChipText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.mutedText,
  },
  paidByChipTextSelected: {
    color: colors.primaryTextOnPrimary,
    fontWeight: '600',
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
    borderRadius: 999,
    paddingVertical: 14,
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

export default AddExpenseScreen;
