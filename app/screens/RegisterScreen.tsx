import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { ensureUserProfile } from '../services/firestore';
import { showToast } from '../utils/toast';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';

type RegisterScreenNavigation = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigation>();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    console.log('[Register] payload', {
      name: name.trim(),
      email: email.trim(),
      passwordLength: password.length,
    });
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      try {
        await ensureUserProfile(cred.user.uid, name.trim(), email.trim());
      } catch {
        // Firestore may not be set up yet; still allow registration
      }
      showToast('Account created');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e) {
      const err = e as FirebaseError;
      console.log('[Register] error', { code: err.code, message: err.message });
      const message = err.message || 'Unable to register. Try a different email.';
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={56}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.replace('Login')}
            style={styles.backButton}
            hitSlop={{ top: 32, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            
          </TouchableOpacity>
        </View>

        <View style={styles.logoWrap}>
          <Text style={styles.logoS}>TS</Text>
          <Text style={styles.brandName}>Team Split</Text>
          <Text style={styles.subtitle}>Join your team and start splitting expenses</Text>
        </View>
        <Text style={styles.label}>Full name</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor={colors.mutedText}
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.mutedText}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={colors.mutedText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.eyeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.mutedText}
            />
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primaryTextOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Sign up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function makeStyles(colors: Colors, radius: { lg: number }) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 76,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerRow: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    zIndex: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoS: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 0,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedText,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  error: {
    color: colors.danger,
    marginBottom: 8,
    textAlign: 'center',
  },
  footerRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.mutedText,
  },
  footerLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  });
}

export default RegisterScreen;
