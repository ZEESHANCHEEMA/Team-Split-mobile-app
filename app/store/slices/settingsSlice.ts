import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ThemeType } from '../../theme/colors';

export interface SettingsState {
  theme: ThemeType;
  currency: string;
}

const initialState: SettingsState = {
  theme: 'dark',
  currency: 'PKR',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
    },
  },
});

export const { setTheme, setCurrency } = settingsSlice.actions;
export default settingsSlice.reducer;
