import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Mirror of reference NotFound.tsx: full-screen centered bg-muted,
 * 404, "Oops! Page not found", "Return to Home" link.
 */
const NotFoundScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const goHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.message}>Oops! Page not found</Text>
        <TouchableOpacity onPress={goHome} activeOpacity={0.8}>
          <Text style={styles.link}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

function makeStyles(colors: Colors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  code: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    color: colors.mutedText,
    marginBottom: 16,
  },
  link: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  });
}

export default NotFoundScreen;
