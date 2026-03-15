import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { getDashboardTeams } from '../services/firestore';
import { useCurrency } from '../theme/useCurrency';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setDashboardData } from '../store/slices/cacheSlice';

type CreateTeamNav = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'CreateTeam'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const CreateTeamScreen: React.FC = () => {
  const navigation = useNavigation<CreateTeamNav>();
  const dispatch = useAppDispatch();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const CURRENCY = useCurrency();
  const { teams, lastFetchedAt } = useAppSelector((s) => s.cache);
  const [listLoading, setListLoading] = useState(!lastFetchedAt);

  const loadTeams = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      dispatch(setDashboardData({ teams: [], memberBalances: [] }));
      setListLoading(false);
      return;
    }
    try {
      const data = await getDashboardTeams(uid);
      // Reuse the same cache slice used by Dashboard
      dispatch(setDashboardData({ teams: data, memberBalances: [] }));
    } catch {
      dispatch(setDashboardData({ teams: [], memberBalances: [] }));
    } finally {
      setListLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      // If we already have cached teams, show them immediately and avoid refetching on every focus
      if (lastFetchedAt && teams.length > 0) {
        setListLoading(false);
        return;
      }
      setListLoading(true);
      loadTeams();
    }, [lastFetchedAt, teams.length, loadTeams])
  );

  const handleTeamPress = (teamId: string) => {
    navigation.navigate('TeamDetail', { teamId });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Teams</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewTeam')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={22} color={colors.primaryTextOnPrimary} />
        </TouchableOpacity>
      </View>

      {listLoading ? (
        <View style={styles.listLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No teams yet</Text>
              <Text style={styles.emptySubtext}>Create a team to start splitting bills!</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.teamSpacer} />}
          renderItem={({ item }) => {
            const amountDue = item.youOwe > 0 ? item.youOwe : item.owedToYou;
            const memberCount = item.memberCount ?? 0;
            const isPending = item.youOwe + item.owedToYou > 0;
            return (
              <TouchableOpacity
                style={styles.teamCard}
                activeOpacity={0.7}
                onPress={() => handleTeamPress(item.id)}
              >
                <View style={styles.teamIconWrap}>
                  {item.icon ? (
                    <Text style={styles.teamIconEmoji}>{item.icon}</Text>
                  ) : (
                    <Text style={styles.teamIconText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.teamCardMiddle}>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.teamSubtitle}>
                    {memberCount} member{memberCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.teamCardRight}>
                  {amountDue > 0 && (
                    <Text style={styles.teamAmount}>
                      {CURRENCY} {Math.round(amountDue)}
                    </Text>
                  )}
                  <Text style={styles.teamStatus}>
                    {isPending ? 'pending' : 'settled'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLoading: {
    paddingVertical: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  teamSpacer: {
    height: 12,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(232, 92, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  teamIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  teamIconEmoji: {
    fontSize: 26,
  },
  teamCardMiddle: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  teamSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 2,
  },
  teamCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  teamAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  teamStatus: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.mutedText,
  },
  });
}

export default CreateTeamScreen;
