import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { getDashboardTeams, getMemberBalancesForUser, CURRENCY } from '../services/firestore';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import type { TeamSummary, MemberBalanceSummary } from '../types/firestore';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { colors } from '../theme/colors';

type DashboardNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavigation>();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [memberBalances, setMemberBalances] = useState<MemberBalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setTeams([]);
      setMemberBalances([]);
      setLoading(false);
      return;
    }
    try {
      const [teamsData, memberData] = await Promise.all([
        getDashboardTeams(uid),
        getMemberBalancesForUser(uid),
      ]);
      setTeams(teamsData);
      setMemberBalances(memberData);
    } catch {
      setTeams([]);
      setMemberBalances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
  const netBalance = totalOwedToYou - totalYouOwe;
  const isSettled = teams.length > 0 && netBalance === 0;

  const handleTeamPress = (teamId: string) => {
    navigation.navigate('TeamDetail', { teamId });
  };

  const handleNewTeam = () => {
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

  const userName = auth.currentUser?.displayName || auth.currentUser?.email || 'there';
  const firstName = userName.split(' ')[0];

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome back, {firstName} 👋</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeaderRow}>
          <View>
            <Text style={styles.summaryLabel}>Overall balance</Text>
            <Text
              style={[
                styles.summaryAmount,
                netBalance > 0 && styles.summaryPositive,
                netBalance < 0 && styles.summaryNegative,
              ]}
            >
              {`${CURRENCY} ${Math.abs(netBalance).toFixed(2)}`}
            </Text>
            <Text style={styles.summaryHint}>
              {teams.length === 0
                ? 'Create a team to start tracking shared expenses.'
                : isSettled
                ? 'Nice! Everyone is settled up for now.'
                : netBalance > 0
                ? 'You should receive this amount from your friends.'
                : 'You currently owe this amount across your teams.'}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              isSettled && styles.statusPillSettled,
              !isSettled && netBalance > 0 && styles.statusPillPositive,
              !isSettled && netBalance < 0 && styles.statusPillNegative,
            ]}
          >
            <Ionicons
              name={
                isSettled
                  ? 'checkmark-circle'
                  : netBalance > 0
                  ? 'trending-up'
                  : 'trending-down'
              }
              size={18}
              color={colors.primaryTextOnPrimary}
            />
            <Text style={styles.statusPillText}>
              {isSettled ? 'All settled' : netBalance > 0 ? 'You are owed' : 'You owe'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <View style={styles.summaryPillTopRow}>
              <Ionicons name="arrow-redo-outline" size={16} color={colors.danger} />
              <Text style={styles.summaryPillLabel}>You owe</Text>
            </View>
            <Text style={styles.summaryPillAmount}>
              {CURRENCY} {totalYouOwe.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryPill}>
            <View style={styles.summaryPillTopRow}>
              <Ionicons name="arrow-undo-outline" size={16} color="#16a34a" />
              <Text style={styles.summaryPillLabel}>You are owed</Text>
            </View>
            <Text style={styles.summaryPillAmount}>
              {CURRENCY} {totalOwedToYou.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your teams</Text>
        <TouchableOpacity style={styles.sectionAction} onPress={handleNewTeam}>
          <Ionicons name="add-circle-outline" size={18} color="#38bdf8" />
          <Text style={styles.sectionActionText}>New team</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No teams yet</Text>
            <Text style={styles.emptySubtext}>Create a team to start splitting expenses</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleNewTeam}>
              <Text style={styles.emptyButtonText}>Create team</Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          memberBalances.length > 0 ? (
            <View style={styles.peopleList}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>People summary</Text>
              </View>
              {memberBalances.map((m) => (
                <View key={m.id} style={styles.personRow}>
                  <View>
                    <Text style={styles.personName}>{m.name}</Text>
                    <Text style={styles.personSubtitle}>
                      {m.net > 0
                        ? 'They owe you'
                        : m.net < 0
                        ? 'You owe them'
                        : 'Settled up'}
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
          ) : null
        }
        renderItem={({ item }) => {
          const teamNet = item.owedToYou - item.youOwe;
          const isSettled = teamNet === 0;

          return (
            <TouchableOpacity
              style={styles.teamRow}
              onPress={() => handleTeamPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.teamLeft}>
                <View style={styles.teamAvatar}>
                  <Text style={styles.teamAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.teamName}>{item.name}</Text>
                  <Text style={styles.teamSubtitle}>
                    {isSettled
                      ? 'You are all settled up'
                      : teamNet > 0
                      ? `You should receive ${CURRENCY} ${Math.abs(teamNet).toFixed(2)}`
                      : `You owe ${CURRENCY} ${Math.abs(teamNet).toFixed(2)}`}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddExpense} activeOpacity={0.9}>
        <Ionicons name="add" size={22} color={colors.primaryTextOnPrimary} />
        <Text style={styles.fabText}>Add expense</Text>
      </TouchableOpacity>
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
  greeting: {
    fontSize: 18,
    color: colors.mutedText,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 0,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.mutedText,
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  summaryPositive: {
    color: '#4ade80',
  },
  summaryNegative: {
    color: '#f97373',
  },
  summaryHint: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
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
    backgroundColor: colors.success,
  },
  statusPillPositive: {
    backgroundColor: colors.primary,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryPill: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  summaryPillTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  summaryPillLabel: {
    fontSize: 12,
    color: '#4B5563',
  },
  summaryPillAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  peopleList: {
    marginTop: 8,
    paddingBottom: 24,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  personSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  personAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
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
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionActionText: {
    fontSize: 13,
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 96,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020617',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teamAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0ecff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d4ed8',
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
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

export default DashboardScreen;
