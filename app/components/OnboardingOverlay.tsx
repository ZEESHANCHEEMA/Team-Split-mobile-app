import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

type OnboardingOverlayProps = {
  visible: boolean;
  onCreateTeam: () => void;
  onAddFriend: () => void;
  onComplete: () => void;
};

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  visible,
  onCreateTeam,
  onAddFriend,
  onComplete,
}) => {
  const { colors, radius } = useTheme();
  const styles = makeStyles(colors, radius);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="people" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to TeamSplit</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            Split bills with friends or create a team for roommates, trips, or shared expenses.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              onComplete();
              onCreateTeam();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="people-outline" size={22} color={colors.primaryTextOnPrimary} />
            <Text style={styles.primaryButtonText}>Create a team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => {
              onComplete();
              onAddFriend();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={22} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Add a friend</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
            <Text style={[styles.skipText, { color: colors.mutedText }]}>I'll do this later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

function makeStyles(colors: Colors, radius: { lg: number }) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: width - 48,
      maxWidth: 360,
      borderRadius: radius.lg + 8,
      padding: 28,
      alignItems: 'center',
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
      paddingVertical: 14,
      borderRadius: radius.lg,
      marginBottom: 12,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryTextOnPrimary,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
      paddingVertical: 14,
      borderRadius: radius.lg,
      borderWidth: 2,
      marginBottom: 16,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    skipButton: {
      paddingVertical: 8,
    },
    skipText: {
      fontSize: 14,
    },
  });
}

export default OnboardingOverlay;
