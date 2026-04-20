/**
 * Shared layout tokens for tab screens, scroll padding, and AppScreen defaults.
 * Keep floating tab bar geometry in sync with scroll content bottom inset.
 */

export const SCREEN_HORIZONTAL_PADDING = 20;

/** Welcome / marketing auth entry uses slightly wider side margins. */
export const WELCOME_HORIZONTAL_PADDING = 28;

/** Extra space below the status bar / safe area for main tab headers. */
export const TAB_SCREEN_TOP_OFFSET = 12;

/** Floating tab bar (matches AppNavigator). Tall enough for icon + label without clipping. */
export const TAB_BAR_HEIGHT = 72;
export const TAB_BAR_HORIZONTAL_INSET = 20;
export const TAB_BAR_BOTTOM_MARGIN = 0;
export const TAB_BAR_RADIUS = 28;

/** Space between scroll content and top of the tab bar. */
const TAB_SCROLL_GAP_ABOVE_BAR = 28;

/**
 * Bottom padding for ScrollView content above the floating tab bar.
 * Aligns with AppScreen `bottomInsetMode="tabs"`.
 */
export const getScrollBottomPaddingForTabs = (safeAreaBottom: number): number => {
  return Math.max(
    safeAreaBottom + TAB_BAR_HEIGHT + TAB_SCROLL_GAP_ABOVE_BAR,
    TAB_BAR_HEIGHT + 52
  );
};

/**
 * Bottom padding for full-screen stack routes (no tab bar).
 */
export const getScrollBottomPaddingForScreen = (safeAreaBottom: number): number => {
  return Math.max(safeAreaBottom + 28, 36);
};
