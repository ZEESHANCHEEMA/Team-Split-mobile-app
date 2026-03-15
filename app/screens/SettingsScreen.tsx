import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { rootNavigationRef } from '../navigation/navigationRef';
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

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const handleSelectCurrency = (code: string) => {
    dispatch(setCurrency(code));
    const user = auth.currentUser;
    if (user) {
      updateUserProfile(
        user.uid,
        user.displayName || '',
        user.email || '',
        undefined,
        undefined,
        undefined,
        code
      ).catch(() => {});
    }
    setCurrencyModalVisible(false);
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
          onPress={() => rootNavigationRef.isReady() && rootNavigationRef.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Profile</Text>
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
        <TouchableOpacity
          style={styles.row}
          onPress={() => setCurrencyModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="cash-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Currency</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {defaultCurrencyOption.value}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      <Modal visible={currencyModalVisible} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCurrencyModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Currency</Text>
          <FlatList
            data={CURRENCY_OPTIONS}
            keyExtractor={(item) => item.key}
            style={styles.currencyList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.currencyOption,
                  { borderColor: colors.border },
                  item.key === currencyCode && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => handleSelectCurrency(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.currencyOptionText, { color: colors.text }]}>{item.value}</Text>
                {item.key === currencyCode && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={[styles.modalCloseButton, { borderColor: colors.border }]}
            onPress={() => setCurrencyModalVisible(false)}
          >
            <Text style={[styles.modalCloseText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        </View>
      </Modal>

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

    
        <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.mutedText} />
          <Text style={styles.rowLabel}>Log out</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </TouchableOpacity>
  
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
      gap: 4,
      padding: 10,
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
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,

    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
      textAlign: 'left',
      lineHeight: 20,
    },
    rowValue: {
      fontSize: 14,
      color: colors.mutedText,
      marginRight: 4,
      maxWidth: '55%',
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 48,
    },
    modalWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 16,
    },
    currencyList: {
      maxHeight: 320,
      marginBottom: 16,
    },
    currencyOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginBottom: 8,
    },
    currencyOptionText: {
      fontSize: 16,
      flex: 1,
    },
    modalCloseButton: {
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    modalCloseText: {
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      fontSize: 12,
      color: colors.mutedText,
      textAlign: 'left',
      marginTop: 24,
    },
  });
}

export default SettingsScreen;
