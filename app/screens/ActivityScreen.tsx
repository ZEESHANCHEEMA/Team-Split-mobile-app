import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { getRecentActivity, getDashboardTeams } from '../services/firestore';
import { useCurrency } from '../theme/useCurrency';
import { useTheme } from '../theme/useTheme';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import type { ActivityExpense } from '../types/firestore';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { Colors } from '../theme/colors';
import type { TeamSummary } from '../types/firestore';
import { EXPENSE_CATEGORIES } from '../constants/categories';

type ActivityNav = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'Activity'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type PeriodFilter = 'all' | 'week' | 'month';

const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<ActivityNav>();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const CURRENCY = useCurrency();
  const [items, setItems] = useState<ActivityExpense[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeamId, setFilterTeamId] = useState<string | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setItems([]);
      setTeams([]);
      setLoading(false);
      return;
    }
    try {
      const [data, teamsData] = await Promise.all([
        getRecentActivity(uid),
        getDashboardTeams(uid),
      ]);
      setItems(data);
      setTeams(teamsData);
    } catch {
      setItems([]);
      setTeams([]);
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

  const handleItemPress = (teamId: string, _expenseId: string) => {
    navigation.navigate('TeamDetail', { teamId });
  };

  const filteredItems = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const weekAgo = now - 7 * 24 * 60 * 60;
    const monthAgo = now - 30 * 24 * 60 * 60;

    return items.filter((item) => {
      if (filterTeamId !== 'all' && item.teamId !== filterTeamId) return false;
      if (filterPeriod === 'week' && item.createdAt.seconds < weekAgo) return false;
      if (filterPeriod === 'month' && item.createdAt.seconds < monthAgo) return false;
      if (filterCategory !== 'all' && (item.category || 'general') !== filterCategory) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchPayer = (item.paidByName ?? '').toLowerCase().includes(q);
        const matchTeam = item.teamName.toLowerCase().includes(q);
        if (!matchTitle && !matchPayer && !matchTeam) return false;
      }
      return true;
    });
  }, [items, searchQuery, filterTeamId, filterPeriod, filterCategory]);

  if (loading && items.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity</Text>

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.mutedText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by title, payer or team..."
          placeholderTextColor={colors.mutedText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color={colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.filterLabel}>Team</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
        <TouchableOpacity
          style={[styles.chip, filterTeamId === 'all' && styles.chipActive, { borderColor: colors.border }]}
          onPress={() => setFilterTeamId('all')}
        >
          <Text style={[styles.chipText, filterTeamId === 'all' && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {teams.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.chip, filterTeamId === t.id && styles.chipActive, { borderColor: colors.border }]}
            onPress={() => setFilterTeamId(t.id)}
          >
            <Text style={[styles.chipText, filterTeamId === t.id && styles.chipTextActive]} numberOfLines={1}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Time</Text>
      <View style={styles.chipRow}>
        {(['all', 'week', 'month'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, filterPeriod === p && styles.chipActive, { borderColor: colors.border }]}
            onPress={() => setFilterPeriod(p)}
          >
            <Text style={[styles.chipText, filterPeriod === p && styles.chipTextActive]}>
              {p === 'all' ? 'All' : p === 'week' ? 'This week' : 'This month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.filterLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
        <TouchableOpacity
          style={[styles.chip, filterCategory === 'all' && styles.chipActive, { borderColor: colors.border }]}
          onPress={() => setFilterCategory('all')}
        >
          <Text style={[styles.chipText, filterCategory === 'all' && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {EXPENSE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.chip, filterCategory === cat.value && styles.chipActive, { borderColor: colors.border }]}
            onPress={() => setFilterCategory(cat.value)}
          >
            <Text style={[styles.chipText, filterCategory === cat.value && styles.chipTextActive]} numberOfLines={1}>{cat.emoji} {cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => `${item.teamId}-${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {items.length === 0 ? 'No activity yet' : 'No matching activity'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const catInfo = EXPENSE_CATEGORIES.find((c) => c.value === (item.category || 'general'));
          return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleItemPress(item.teamId, item.id)}
          >
            <View style={styles.teamEmoji}>
              <Text style={styles.teamEmojiText}>{item.teamName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {catInfo?.emoji ? `${catInfo.emoji} ` : ''}{item.title}
              </Text>
              <Text style={styles.cardMeta}>
                {item.paidByName ?? 'Someone'} paid · {item.teamName}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardAmount}>
                {CURRENCY} {item.amount.toFixed(2)}
              </Text>
              <View style={[styles.statusPill, styles.statusPillSettled]}>
                <Ionicons name="checkmark" size={12} color={colors.success} />
                <Text style={styles.statusPillText}>Settled</Text>
              </View>
            </View>
          </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

function makeStyles(colors: Colors, radius: { lg: number }) {
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedText,
    marginBottom: 8,
  },
  chipScroll: {
    marginBottom: 12,
    maxHeight: 44,
  },
  chipScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 20,
    marginVertical: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  separator: {
    height: 12,
  },
  card: {
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
  cardLeft: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusPillSettled: {},
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedText,
  },
  });
}

export default ActivityScreen;
