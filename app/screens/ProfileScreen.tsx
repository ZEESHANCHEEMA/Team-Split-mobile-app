import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { auth, storage } from '../services/firebaseConfig';
import { getUserProfile, updateUserProfile } from '../services/firestore';
import type { UserProfile } from '../types/firestore';
import { updateProfile, updateEmail, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getUserProfile(user.uid);
        const name = data?.displayName || user.displayName || '';
        const mail = data?.email || user.email || '';
        const phoneVal = data?.phone || '';
        const photoVal = data?.photoUrl || user.photoURL || '';
        setProfile(
          data || {
            displayName: name,
            email: mail,
            phone: phoneVal,
            photoUrl: photoVal,
            createdAt: { seconds: 0, nanoseconds: 0 },
          }
        );
        setDisplayName(name);
        setEmail(mail);
        setPhone(phoneVal);
        setPhotoUrl(photoVal || undefined);
      } catch {
        setError('Unable to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedEmail) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (user.email !== trimmedEmail) {
        await updateEmail(user, trimmedEmail);
      }
      await updateProfile(user, { displayName: trimmedName, photoURL: photoUrl });
    } catch (e) {
      setSaving(false);
      setError('Could not update profile. Please try again.');
      return;
    }

    try {
      await updateUserProfile(user.uid, trimmedName, trimmedEmail, trimmedPhone, photoUrl);
    } catch (e) {
      // Firestore might not be fully configured yet; log and continue
      // so the UI still reflects the updated Auth profile.
      // eslint-disable-next-line no-console
      console.warn('[Profile] Failed to update Firestore profile', e);
    }

    setProfile((prev) =>
      prev
        ? { ...prev, displayName: trimmedName, email: trimmedEmail, phone: trimmedPhone, photoUrl }
        : {
            displayName: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
            photoUrl,
            createdAt: { seconds: 0, nanoseconds: 0 },
          }
    );
    setEditing(false);
    setSaving(false);
  };

  const handlePickImage = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('We need photo permissions to update your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const avatarRef = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(avatarRef, blob);
      const url = await getDownloadURL(avatarRef);

      setPhotoUrl(url);
      await updateProfile(user, { photoURL: url });
      await updateUserProfile(
        user.uid,
        displayName.trim() || user.displayName || '',
        email.trim() || user.email || '',
        phone.trim(),
        url
      );
    } catch {
      setError('Could not update photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    (displayName || email)
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!auth.currentUser) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Please log in to view your profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.name}>{displayName || 'Your name'}</Text>
            <Text style={styles.email}>{email || 'you@example.com'}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarEditButton}
            onPress={handlePickImage}
            disabled={saving}
          >
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color={colors.mutedText} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedText}
              editable={!saving}
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color={colors.mutedText} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={email}
              onChangeText={setEmail}
              placeholder="Your email"
              placeholderTextColor={colors.mutedText}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          </View>

          <Text style={styles.label}>Contact number</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={20} color={colors.mutedText} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={phone}
              onChangeText={setPhone}
              placeholder="Add phone number"
              placeholderTextColor={colors.mutedText}
              keyboardType="phone-pad"
              editable={!saving}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryTextOnPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await signOut(auth);
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  avatarInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 2,
  },
  avatarEditButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  form: {
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 4,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 4,
    paddingVertical: 4,
  },
  inputIcon: {
    marginLeft: 14,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoutText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
  },
});

export default ProfileScreen;

