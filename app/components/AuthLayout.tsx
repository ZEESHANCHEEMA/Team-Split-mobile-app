import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';

interface Props {
  children: React.ReactNode;
  subtitle: string;
  showBack?: boolean;
  backScreen?: string;
}

const AuthLayout: React.FC<Props> = ({
  children,
  subtitle,
  showBack = false,
  backScreen = 'Welcome',
}) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.replace(backScreen)}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}

        <View style={styles.logoWrap}>
          <Text style={[styles.logo, { color: colors.primary }]}>TS</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Team Split
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {subtitle}
          </Text>
        </View>

        {children}
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 20,
  },

  logoWrap: {
    alignItems: 'center',
    marginBottom: 30,
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