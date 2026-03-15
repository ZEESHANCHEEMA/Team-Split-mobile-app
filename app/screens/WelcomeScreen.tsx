import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';

type WelcomeNav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

/**
 * SplitEase welcome screen: logo, brand name, title, tagline,
 * Log In (primary) + Create Account (outline) buttons, Terms & Privacy footer.
 */
const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeNav>();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo: orange stylized S with TM */}
      <View style={styles.logoWrap}>
        <Text style={styles.logoS}>TS</Text>
      </View>
      {/* Main heading */}
      <Text style={styles.title}>Team Split</Text>
      <Text style={styles.tagline}>
        Split bills effortlessly with your team.{'\n'}
        Track expenses, settle up, stay{'\n'}
        organized.
      </Text>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.replace('Login')}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Register')}
        activeOpacity={0.9}
      >
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </TouchableOpacity>

      {/* Legal */}
      <Text style={styles.legal}>
        By continuing, you agree to our{' '}
        <Text
          style={styles.legalLink}
          onPress={() => navigation.navigate('Terms')}
        >
          Terms & Privacy Policy
        </Text>
      </Text>
    </ScrollView>
  );
};

function makeStyles(colors: Colors, radius: { lg: number }) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 156,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  logoS: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  logoTm: {
    position: 'absolute',
    top: -4,
    right: -16,
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '600',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.mutedText,
    textAlign: 'center',
    marginBottom: 40,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryTextOnPrimary,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  legal: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  legalLink: {
    fontWeight: '600',
    color: colors.text,
    textDecorationLine: 'underline',
  },
  });
}

export default WelcomeScreen;
