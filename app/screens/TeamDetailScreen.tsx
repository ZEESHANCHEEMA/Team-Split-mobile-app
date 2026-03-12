import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  CURRENCY,
} from '../services/firestore';
import type { Team, Expense } from '../types/firestore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

const TeamDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { teamId } = route.params;
  const [team, setTeam] = useState<Team | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [t, ex] = await Promise.all([getTeam(teamId), getExpensesForTeam(teamId)]);
      setTeam(t || null);
      setExpenses(ex);
      setBalance(t ? computeBalanceForUserInTeam(ex, uid) : 0);
    } catch {
      setTeam(null);
      setExpenses([]);
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

  const youOwe = balance < 0 ? Math.abs(balance) : 0;
  const owedToYou = balance > 0 ? balance : 0;
  const isSettled = balance === 0;
  const groupTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{team.name}</Text>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeaderRow}>
          <View>
            <Text style={styles.balanceLabel}>Your balance</Text>
            <Text
              style={[
                styles.balanceAmount,
                balance > 0 && styles.balancePositive,
                balance < 0 && styles.balanceNegative,
              ]}
            >
              {isSettled
                ? `${CURRENCY} 0.00`
                : balance > 0
                ? `${CURRENCY} ${owedToYou.toFixed(2)}`
                : `${CURRENCY} ${youOwe.toFixed(2)}`}
            </Text>
            <Text style={styles.balanceHint}>
              {isSettled
                ? 'You are all settled with this group.'
                : balance > 0
                ? 'Friends owe you this amount.'
                : 'You owe this amount in this group.'}
            </Text>
            <Text style={styles.balanceHint}>
              Group total: {CURRENCY} {groupTotal.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              isSettled && styles.statusPillSettled,
              !isSettled && balance > 0 && styles.statusPillPositive,
              !isSettled && balance < 0 && styles.statusPillNegative,
            ]}
          >
            <Ionicons
              name={
                isSettled
                  ? 'checkmark-circle'
                  : balance > 0
                  ? 'trending-up'
                  : 'trending-down'
              }
              size={18}
              color={colors.primaryTextOnPrimary}
            />
            <Text style={styles.statusPillText}>
              {isSettled ? 'Settled' : balance > 0 ? 'You are owed' : 'You owe'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddExpense}>
              <Text style={styles.emptyButtonText}>Add expense</Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.expenseRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AddExpense', { teamId, expenseId: item.id })}
          >
            <View style={styles.expenseLeft}>
              <Text style={styles.expenseTitle}>{item.title}</Text>
              <Text style={styles.expenseMeta}>
                {CURRENCY} {item.amount.toFixed(2)} · split {item.splitBetween.length} way
              </Text>
            </View>
            <Text style={styles.expenseAmount}>
              {CURRENCY} {item.amount.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 16,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.mutedText,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  balancePositive: {
    color: '#16a34a',
  },
  balanceNegative: {
    color: colors.danger,
  },
  balanceHint: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
    maxWidth: 220,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  statusPillSettled: {
    backgroundColor: '#22c55e',
  },
  statusPillPositive: {
    backgroundColor: '#1d4ed8',
  },
  statusPillNegative: {
    backgroundColor: colors.danger,
  },
  statusPillText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  expenseLeft: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  expenseMeta: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.mutedText,
    marginBottom: 12,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020617',
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#38bdf8',
    fontWeight: '600',
  },
});

export default TeamDetailScreen;
