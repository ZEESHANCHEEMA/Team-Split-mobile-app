import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { createTeam, addGuestMemberToTeam } from '../services/firestore';
import { showToast } from '../utils/toast';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'NewTeam'>;

const TEAM_ICONS = ['🏠', '🍕', '✈️', '🎮', '🏖️', '🎉', '💼', '🍔', '☕', '🎬'];

const NewTeamScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius, insets.bottom), [colors, radius, insets.bottom]);
  const [icon, setIcon] = useState<string>(TEAM_ICONS[0]);
  const [name, setName] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMemberRow = () => {
    setMemberNames((prev) => [...prev, '']);
  };

  const removeMemberRow = (index: number) => {
    setMemberNames((prev) => prev.filter((_, i) => i !== index));
  };

  const setMemberNameAt = (index: number, value: string) => {
    setMemberNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      const message = 'Enter a team name';
      setError(message);
      showToast(message);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      const message = 'Not signed in';
      setError(message);
      showToast(message);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const teamId = await createTeam(trimmed, [uid], icon);
      const namesToAdd = memberNames.map((n) => n.trim()).filter(Boolean);
      for (const memberName of namesToAdd) {
        await addGuestMemberToTeam(teamId, memberName);
      }
      navigation.goBack();
      showToast('Team created');
    } catch {
      const message = 'Could not create team. Try again.';
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      enableOnAndroid
      extraScrollHeight={24}
      enableAutomaticScroll
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Team</Text>
      </View>
        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconRow}>
          {TEAM_ICONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.iconOption, icon === emoji && styles.iconOptionSelected]}
              onPress={() => setIcon(emoji)}
              disabled={loading}
            >
              <Text style={styles.iconEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Team Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Roommates"
          placeholderTextColor={colors.mutedText}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          editable={!loading}
          autoCorrect={false}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Members</Text>
        <View style={styles.memberListWrap}>
          {memberNames.map((value, index) => (
            <View key={index} style={styles.memberRow}>
              <TextInput
                style={styles.memberInput}
                placeholder={`Member ${index + 1}`}
                placeholderTextColor={colors.mutedText}
                value={value}
                onChangeText={(t) => setMemberNameAt(index, t)}
                editable={!loading}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={styles.memberDeleteBtn}
                onPress={() => removeMemberRow(index)}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.addMemberButton} onPress={addMemberRow} disabled={loading}>
          <Ionicons name="add" size={20} color={colors.danger} />
          <Text style={styles.addMemberButtonText}>Add Member</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttonFooter}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryTextOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Create Team</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
};

function makeStyles(colors: Colors, radius: { xl: number; lg: number }, bottomInset: number) {
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
      paddingBottom: 54,
    },
    buttonFooter: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Math.max(bottomInset, 56),
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    iconRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    iconOption: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '18',
    },
    iconEmoji: {
      fontSize: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.mutedText,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      height: 48,
      color: colors.text,
      fontSize: 16,
      marginBottom: 20,
    },
    memberListWrap: {
      marginBottom: 8,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
    },
    memberInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      height: 44,
      color: colors.text,
      fontSize: 15,
    },
    memberDeleteBtn: {
      padding: 6,
    },
    addMemberButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      marginBottom: 20,
    },
    addMemberButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.danger,
    },
    error: {
      color: colors.danger,
      marginBottom: 12,
    },
    button: {
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryTextOnPrimary,
    },
  });
}

export default NewTeamScreen;
