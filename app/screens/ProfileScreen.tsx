import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountryPicker } from 'react-native-country-codes-picker';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import { auth } from '../services/firebaseConfig';
import { getUserProfile, updateUserProfile } from '../services/firestore';
import type { UserProfile } from '../types/firestore';
import { updateProfile, updateEmail } from 'firebase/auth';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { useAppDispatch } from '../store/hooks';
import { updateProfileDisplay } from '../store/slices/authSlice';
import { setCurrency } from '../store/slices/settingsSlice';
import { useCurrencyCode } from '../theme/useCurrency';
import { showToast } from '../utils/toast';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const route = useRoute<RouteProp<MainTabParamList, 'Profile'>>();
  const dispatch = useAppDispatch();
  const { colors, radius } = useTheme();
  const currencyCode = useCurrencyCode();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(route.params?.editing === true);
  const [error, setError] = useState<string | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

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
        setCountry((data?.country as string) || '');
        setPhotoUrl(photoVal || undefined);
        if (data?.currency) dispatch(setCurrency(data.currency));
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
      const message = 'Name and email are required.';
      setError(message);
      showToast(message);
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
      const message = 'Could not update profile. Please try again.';
      setError(message);
      showToast(message);
      return;
    }

    try {
      await updateUserProfile(user.uid, trimmedName, trimmedEmail, trimmedPhone, photoUrl, country.trim() || undefined, currencyCode);
    } catch (e) {
      // Firestore might not be fully configured yet; log and continue
      // so the UI still reflects the updated Auth profile.
      // eslint-disable-next-line no-console
      console.warn('[Profile] Failed to update Firestore profile', e);
    }

    const savedCountry = country.trim() || undefined;
    setProfile((prev) =>
      prev
        ? { ...prev, displayName: trimmedName, email: trimmedEmail, phone: trimmedPhone, photoUrl, country: savedCountry, currency: currencyCode }
        : {
            displayName: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
            photoUrl,
            country: savedCountry,
            currency: currencyCode,
            createdAt: { seconds: 0, nanoseconds: 0 },
          }
    );
    dispatch(updateProfileDisplay({ displayName: trimmedName, email: trimmedEmail, photoURL: photoUrl }));
    setEditing(false);
    setSaving(false);
    showToast('Profile updated');
  };

  const initials =
    (displayName || email)
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);

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

  const handleEditPress = () => {
    setError(null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setDisplayName(profile?.displayName ?? '');
    setEmail(profile?.email ?? '');
    setPhone(profile?.phone ?? '');
    setCountry(profile?.country ?? '');
    setError(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{editing ? 'Edit Profile' : 'Profile'}</Text>
      </View>

      {/* Avatar section: centered, large circle */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
        </View>
        <Text style={styles.avatarName}>{displayName || 'Your name'}</Text>
        <Text style={styles.avatarEmail}>{email || 'you@example.com'}</Text>
      </View>

      {/* Form: label + field rows */}
      <View style={styles.formSection}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Full name"
          placeholderTextColor={colors.mutedText}
          editable={editing && !saving}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.mutedText}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={editing && !saving}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 8900"
          placeholderTextColor={colors.mutedText}
          keyboardType="phone-pad"
          editable={editing && !saving}
        />

        <Text style={styles.label}>Country</Text>
        <TouchableOpacity
          style={styles.countryInputRow}
          onPress={() => editing && setShowCountryPicker(true)}
          disabled={!editing}
        >
          <Text style={[styles.inputValue, !country && { color: colors.mutedText }]}>
            {country || 'Select country'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      <CountryPicker
        show={showCountryPicker}
        lang="en"
        inputPlaceholder="Search country or code"
        searchMessage="No country found"
        style={{
          modal: { height: '75%', maxHeight: '75%' },
          itemsList: { flex: 1 },
        }}
        pickerButtonOnPress={(item) => {
          const name = item.name?.en ?? item.name?.['en'] ?? Object.values(item.name ?? {})[0] ?? '';
          setCountry(name);
          setShowCountryPicker(false);
        }}
        onBackdropPress={() => setShowCountryPicker(false)}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {editing ? (
        <>
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
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCancelEdit} disabled={saving}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.editProfileButton} onPress={handleEditPress} activeOpacity={0.8}>
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
};

function makeStyles(colors: Colors, radius: { xl: number; lg: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 56,
      paddingBottom: 100,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      gap: 12,
    },
    backButton: {
      padding: 4,
    },
    screenTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: 12,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarText: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.primaryTextOnPrimary,
    },
    avatarName: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    avatarEmail: {
      fontSize: 14,
      color: colors.mutedText,
    },
    formSection: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
      height: 48,
      color: colors.text,
      fontSize: 16,
      marginBottom: 4,
    },
    inputValue: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    countryInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      height: 48,
      marginBottom: 4,
    },
    editProfileButton: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editProfileButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    disabledButton: {
      opacity: 0.7,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryTextOnPrimary,
    },
    secondaryButton: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      marginTop: 8,
    },
  });
}

export default ProfileScreen;

