import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import {
  getScrollBottomPaddingForScreen,
  getScrollBottomPaddingForTabs,
  SCREEN_HORIZONTAL_PADDING,
} from '../theme/screenLayout';

type BottomInsetMode = 'screen' | 'tabs' | 'none';

interface AppScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAware?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  withGlow?: boolean;
  bottomInsetMode?: BottomInsetMode;
  extraTop?: number;
  horizontalPadding?: number;
  /** Safe-area edges applied by the root `SafeAreaView` (default: top/left/right; omit bottom when using `bottomInsetMode`). */
  edges?: Edge[];
  scrollProps?: Omit<ScrollViewProps, 'style' | 'contentContainerStyle'>;
}

const AppScreen: React.FC<AppScreenProps> = ({
  children,
  scrollable = false,
  keyboardAware = false,
  style,
  contentContainerStyle,
  withGlow = true,
  bottomInsetMode = 'screen',
  extraTop = 16,
  horizontalPadding = SCREEN_HORIZONTAL_PADDING,
  edges = ['top', 'left', 'right'],
  scrollProps,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bottomPadding =
    bottomInsetMode === 'tabs'
      ? getScrollBottomPaddingForTabs(insets.bottom)
      : bottomInsetMode === 'screen'
        ? getScrollBottomPaddingForScreen(insets.bottom)
        : 0;

  const baseContentStyle: StyleProp<ViewStyle> = [
    styles.content,
    {
      paddingHorizontal: horizontalPadding,
      paddingTop: extraTop,
      paddingBottom: bottomPadding,
    },
    scrollable ? styles.scrollContent : undefined,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor: colors.background }, style]}>
      {withGlow ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[`${colors.primary}1f`, `${colors.accent}16`, 'transparent']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 0.75 }}
            style={[styles.glow, styles.primaryGlow]}
          />
          <LinearGradient
            colors={[`${colors.accent}14`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.glow, styles.accentGlow]}
          />
        </View>
      ) : null}
      {scrollable ? (
        keyboardAware ? (
          <KeyboardAwareScrollView
            style={styles.fill}
            contentContainerStyle={baseContentStyle}
            showsVerticalScrollIndicator={false}
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={28}
            extraHeight={Platform.select({ ios: 84, android: 112 })}
            keyboardShouldPersistTaps="handled"
            keyboardOpeningTime={0}
            keyboardDismissMode="interactive"
            {...scrollProps}
          >
            {children}
          </KeyboardAwareScrollView>
        ) : (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={baseContentStyle}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            {...scrollProps}
          >
            {children}
          </ScrollView>
        )
      ) : (
        <View style={baseContentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  primaryGlow: {
    top: -120,
    left: -40,
    width: 300,
    height: 300,
  },
  accentGlow: {
    top: 120,
    right: -100,
    width: 240,
    height: 240,
  },
});

export default AppScreen;
