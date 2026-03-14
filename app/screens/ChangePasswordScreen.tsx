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
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

const ChangePasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    const cur = currentPassword.trim();
    const newP = newPassword.trim();
    const conf = confirmPassword.trim();
    if (!cur) {
      setError('Enter your current password.');
      return;
    }
    if (!newP) {
      setError('Enter a new password.');
      return;
    }
    if (newP.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newP !== conf) {
      setError('New passwords do not match.');
      return;
    }
    const user = auth.currentUser;
    if (!user?.email) {
      setError('Not signed in.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, cur);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newP);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else if (err.code === 'auth/weak-password') {
        setError('New password is too weak.');
      } else {
        setError(err.message || 'Could not update password. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Change password</Text>
        </View>

        {success ? (
          <View style={styles.successWrap}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.successText}>Password updated successfully.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Current password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={(t) => { setCurrentPassword(t); setError(null); }}
                placeholder="Enter current password"
                placeholderTextColor={colors.mutedText}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((s) => !s)}
                style={styles.eyeButton}
                hitSlop={12}
              >
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.mutedText}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setError(null); }}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.mutedText}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowNew((s) => !s)}
                style={styles.eyeButton}
                hitSlop={12}
              >
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.mutedText}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm new password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                placeholder="Confirm new password"
                placeholderTextColor={colors.mutedText}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((s) => !s)}
                style={styles.eyeButton}
                hitSlop={12}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.mutedText}
                />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryTextOnPrimary} />
              ) : (
                <Text style={styles.buttonText}>Update password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 56,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 32,
      gap: 12,
    },
    backButton: {
      padding: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
      marginTop: 4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      marginBottom: 16,
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
    errorText: {
      fontSize: 14,
      color: colors.danger,
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryTextOnPrimary,
    },
    successWrap: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    successText: {
      fontSize: 16,
      color: colors.success,
      marginTop: 16,
      fontWeight: '500',
    },
  });
}

export default ChangePasswordScreen;
