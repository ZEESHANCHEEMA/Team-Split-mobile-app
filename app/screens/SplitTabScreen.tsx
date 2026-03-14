import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { useAppSelector } from '../store/hooks';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';

type SplitTabNav = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'Split'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Reference: Split tab goes to /add-bill. This tab shows a single CTA
 * "Add a bill" that navigates to AddExpense (first team) or prompts to create a team.
 */
const SplitTabScreen: React.FC = () => {
  const navigation = useNavigation<SplitTabNav>();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const teams = useAppSelector((s) => s.cache.teams);

  const handleAddBill = () => {
    if (teams.length > 0) {
      const root = navigation.getParent();
      (root as any)?.navigate('AddExpense', { teamId: teams[0].id });
    } else {
      navigation.navigate('CreateTeam');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Split</Text>
      <Text style={styles.subtitle}>
        {teams.length > 0
          ? 'Split a bill with your team'
          : 'Create a team first to split bills'}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleAddBill} activeOpacity={0.9}>
        <Text style={styles.buttonText}>
          {teams.length > 0 ? 'Add a bill' : 'Create team'}
        </Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  });
}

export default SplitTabScreen;
