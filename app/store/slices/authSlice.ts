import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Auth state for display only. No passwords or tokens.
 * Firebase Auth remains source of truth; this is a cache for fast UI.
 */
export interface AuthState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const initialState: AuthState = {
  uid: null,
  email: null,
  displayName: null,
  photoURL: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        uid: string | null;
        email?: string | null;
        displayName?: string | null;
        photoURL?: string | null;
      }>
    ) => {
      const { uid, email, displayName, photoURL } = action.payload;
      state.uid = uid;
      if (email !== undefined) state.email = email ?? null;
      if (displayName !== undefined) state.displayName = displayName ?? null;
      if (photoURL !== undefined) state.photoURL = photoURL ?? null;
    },
    clearUser: state => {
      state.uid = null;
      state.email = null;
      state.displayName = null;
      state.photoURL = null;
    },
    updateProfileDisplay: (
      state,
      action: PayloadAction<{ displayName?: string; email?: string; photoURL?: string }>
    ) => {
      if (action.payload.displayName !== undefined) state.displayName = action.payload.displayName;
      if (action.payload.email !== undefined) state.email = action.payload.email;
      if (action.payload.photoURL !== undefined) state.photoURL = action.payload.photoURL;
    },
  },
});

export const { setUser, clearUser, updateProfileDisplay } = authSlice.actions;
export default authSlice.reducer;
