import type { TextInputProps } from 'react-native';

/** Baseline for data/auth fields — reduces autocorrect fights and odd keyboard behavior. */
export const mobileTextInputDefaults: Pick<
  TextInputProps,
  'autoCorrect' | 'spellCheck' | 'blurOnSubmit'
> = {
  autoCorrect: false,
  spellCheck: false,
  blurOnSubmit: false,
};

export const emailTextInputProps: Pick<
  TextInputProps,
  'autoCapitalize' | 'keyboardType' | 'autoComplete' | 'textContentType' | 'autoCorrect' | 'spellCheck' | 'blurOnSubmit'
> = {
  ...mobileTextInputDefaults,
  autoCapitalize: 'none',
  keyboardType: 'email-address',
  autoComplete: 'email',
  textContentType: 'emailAddress',
};

export const passwordTextInputProps: Pick<
  TextInputProps,
  'autoCapitalize' | 'autoComplete' | 'textContentType' | 'autoCorrect' | 'spellCheck' | 'blurOnSubmit'
> = {
  ...mobileTextInputDefaults,
  autoCapitalize: 'none',
  autoComplete: 'password',
  textContentType: 'password',
};

export const newPasswordTextInputProps: Pick<
  TextInputProps,
  'autoCapitalize' | 'autoComplete' | 'textContentType' | 'autoCorrect' | 'spellCheck' | 'blurOnSubmit'
> = {
  ...mobileTextInputDefaults,
  autoCapitalize: 'none',
  autoComplete: 'password-new',
  textContentType: 'newPassword',
};

export const nameTextInputProps: Pick<
  TextInputProps,
  'autoCapitalize' | 'autoComplete' | 'textContentType' | 'autoCorrect' | 'spellCheck' | 'blurOnSubmit'
> = {
  ...mobileTextInputDefaults,
  autoCapitalize: 'words',
  autoComplete: 'name',
  textContentType: 'name',
};
