import React, { useCallback, useState, useMemo } from 'react';
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
import { getRecentActivity } from '../services/firestore';
import { useCurrency } from '../theme/useCurrency';
import { useTheme } from '../theme/useTheme';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import type { ActivityExpense } from '../types/firestore';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { Colors } from '../theme/colors';

type ActivityNav = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'Activity'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<ActivityNav>();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const CURRENCY = useCurrency();
  const [items, setItems] = useState<ActivityExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getRecentActivity(uid);
      setItems(data);
    } catch {
      setItems([]);
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

  const handleItemPress = (teamId: string, expenseId: string) => {
    navigation.navigate('TeamDetail', { teamId });
  };

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

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.teamId}-${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No activity yet</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleItemPress(item.teamId, item.id)}
          >
            <View style={styles.teamEmoji}>
              <Text style={styles.teamEmojiText}>{item.teamName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
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
        )}
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
    marginBottom: 24,
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
