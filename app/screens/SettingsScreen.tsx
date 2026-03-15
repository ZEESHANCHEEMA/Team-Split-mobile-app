import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SelectList } from 'react-native-dropdown-select-list';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { rootNavigationRef } from '../navigation/AppNavigator';
import { auth } from '../services/firebaseConfig';
import { updateUserProfile } from '../services/firestore';
import { useTheme } from '../theme/useTheme';
import { useCurrencyCode } from '../theme/useCurrency';
import { CURRENCIES } from '../theme/colors';
import { useAppDispatch } from '../store/hooks';
import { setTheme, setCurrency } from '../store/slices/settingsSlice';

type SettingsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Settings'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Settings screen – reference-style layout: title, card sections, list rows.
 * Theme toggle, currency select (10 main currencies), Profile link.
 */
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  key: c.code,
  value: `${c.symbol} ${c.name} (${c.code})`,
}));

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNav>();
  const dispatch = useAppDispatch();
  const { colors, radius, theme } = useTheme();
  const currencyCode = useCurrencyCode();
  const defaultCurrencyOption = useMemo(
    () => CURRENCY_OPTIONS.find((o) => o.key === currencyCode) ?? CURRENCY_OPTIONS[0],
    [currencyCode]
  );

  const handleLogout = async () => {
    await signOut(auth);
    const root = navigation.getParent();
    (root as any)?.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const toggleTheme = () => {
    dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'));
  };

  const styles = useStyles(colors, radius);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Profile', { editing: true })}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
        <View style={styles.rowDivider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            if (rootNavigationRef.isReady()) {
              rootNavigationRef.navigate('ChangePassword');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="key-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Change password</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <TouchableOpacity style={styles.row} onPress={toggleTheme} activeOpacity={0.7}>
          <Ionicons name="moon-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Theme</Text>
          <Text style={styles.rowValue}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
        <View style={styles.rowDivider} />
        <View style={styles.currencySelectWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="cash-outline" size={20} color={colors.mutedText} style={styles.currencyRowIcon} />
            <Text style={styles.currencyLabel}>Currency</Text>
          </View>
          <SelectList
            key={currencyCode}
            setSelected={(val: string) => {
              dispatch(setCurrency(val));
              const user = auth.currentUser;
              if (user) {
                updateUserProfile(
                  user.uid,
                  user.displayName || '',
                  user.email || '',
                  undefined,
                  undefined,
                  undefined,
                  val
                ).catch(() => {});
              }
            }}
            data={CURRENCY_OPTIONS}
            save="key"
            defaultOption={defaultCurrencyOption}
            placeholder="Select currency"
            search={true}
            searchPlaceholder="Search"
            boxStyles={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.lg,
              borderWidth: 1,
              paddingHorizontal: 12,
              minHeight: 44,
              marginTop: 4,
            }}
            inputStyles={{ color: colors.text, fontSize: 15 }}
            dropdownStyles={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.lg,
              borderWidth: 1,
              maxHeight: 280,
            }}
            dropdownItemStyles={{ paddingVertical: 12, paddingHorizontal: 16 }}
            dropdownTextStyles={{ color: colors.text, fontSize: 15 }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => rootNavigationRef.isReady() && rootNavigationRef.navigate('About')}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>About TeamSplit</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
        <View style={styles.rowDivider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => rootNavigationRef.isReady() && rootNavigationRef.navigate('Terms')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Terms & Privacy</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Log out</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>TeamSplit</Text>
    </ScrollView>
  );
};

function useStyles(
  colors: ReturnType<typeof import('../theme/colors').getColors>,
  radius: { xl: number; lg: number }
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 100,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      overflow: 'hidden',
      paddingTop: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedText,
      marginBottom: 8,
      marginHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    rowValue: {
      fontSize: 14,
      color: colors.mutedText,
      marginRight: 4,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 48,
    },
    currencySelectWrap: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    currencyRowIcon: {
      marginRight: 8,
    },
    currencyLabel: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
    },
    footer: {
      fontSize: 12,
      color: colors.mutedText,
      textAlign: 'center',
      marginTop: 24,
    },
  });
}

export default SettingsScreen;
