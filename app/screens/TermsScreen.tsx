import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

const TermsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Privacy</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Terms of Service</Text>
        <Text style={styles.body}>
          By using TeamSplit, you agree to use the app only for lawful purposes and to split
          expenses in good faith. You are responsible for the accuracy of the information you enter
          and for settling balances with your group members.
        </Text>
        <Text style={styles.body}>
          TeamSplit is provided "as is". We do not guarantee uninterrupted service or that the app
          will meet every specific need. We may update these terms from time to time; continued use
          after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.body}>
          We collect and store the information you provide—such as your email, display name, and
          the teams and expenses you create—to operate the service. This data is stored securely
          and used to power features like bill splitting and balance calculations.
        </Text>
        <Text style={styles.body}>
          We do not sell your personal information. Data may be shared only as required by law or
          to provide and improve the service (e.g. with our infrastructure providers). You can
          delete your account and associated data through the app or by contacting us.
        </Text>

        <Text style={styles.body}>
          If you have questions about these terms or our privacy practices, please contact us
          through the app or at the support address provided in the app listing.
        </Text>
      </ScrollView>
    </View>
  );
};

function makeStyles(colors: Colors, radius: { xl: number; lg: number }) {
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
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 8,
      marginBottom: 12,
    },
    body: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 16,
    },
  });
}

export default TermsScreen;
