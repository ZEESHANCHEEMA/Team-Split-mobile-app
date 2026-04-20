import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import AppScreen from './AppScreen';
import { useTheme } from '../theme/useTheme';
import { SCREEN_HORIZONTAL_PADDING } from '../theme/screenLayout';

/** Auth flows only navigate back to stack routes that need no params. */
type AuthBackRoute = Extract<keyof RootStackParamList, 'Welcome' | 'Login' | 'Register'>;

interface Props {
  children: React.ReactNode;
  subtitle: string;
  showBack?: boolean;
  backScreen?: AuthBackRoute;
}

const AuthLayout: React.FC<Props> = ({
  children,
  subtitle,
  showBack = false,
  backScreen = 'Welcome',
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  return (
    <AppScreen
      scrollable
      keyboardAware
      horizontalPadding={SCREEN_HORIZONTAL_PADDING}
      extraTop={0}
      bottomInsetMode="screen"
      contentContainerStyle={styles.scrollContent}
    >
      {showBack ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
          onPress={() => navigation.replace(backScreen)}
          hitSlop={{ top: 1, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.logoWrap}>
        <Text style={[styles.logo, { color: colors.primary }]}>TS</Text>
        <Text style={[styles.title, { color: colors.text }]}>Team Split</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text>
      </View>

      {children}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 56,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AuthLayout;
