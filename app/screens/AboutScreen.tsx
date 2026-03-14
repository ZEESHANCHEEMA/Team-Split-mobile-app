import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const APP_VERSION = '1.0.0';

const AboutScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>About TeamSplit</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>TeamSplit</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>
        <Text style={styles.body}>
          TeamSplit helps you split bills and expenses with friends, roommates, and groups. Create
          teams, add expenses, and see who owes whom at a glance.
        </Text>
        <Text style={styles.body}>
          Track shared costs for trips, household expenses, dinners, and more—all in one place.
        </Text>
      </ScrollView>
    </View>
  );
};

function makeStyles(colors: Colors, radius: { xl: number; lg: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    appName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    version: {
      fontSize: 14,
      color: colors.mutedText,
      marginBottom: 20,
    },
    body: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 16,
    },
  });
}

export default AboutScreen;
