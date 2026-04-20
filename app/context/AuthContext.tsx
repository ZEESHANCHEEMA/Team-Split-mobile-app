import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, firebaseAuthPersistenceReady } from '../services/firebaseConfig';
import { logFirebaseInfo } from '../utils/firebaseDebug';
import { store } from '../store';
import { setUser, clearUser } from '../store/slices/authSlice';
import { clearCache } from '../store/slices/cacheSlice';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const startAuthListener = () => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, currentUser => {
          if (currentUser) {
            logFirebaseInfo('auth', `onAuthStateChanged: signed in uid=${currentUser.uid}`);
          } else {
            logFirebaseInfo('auth', 'onAuthStateChanged: signed out');
          }
          setUserState(currentUser);
          if (currentUser) {
            store.dispatch(
              setUser({
                uid: currentUser.uid,
                email: currentUser.email ?? null,
                displayName: currentUser.displayName ?? null,
                photoURL: currentUser.photoURL ?? null,
              })
            );
          } else {
            store.dispatch(clearUser());
            store.dispatch(clearCache());
          }
          setLoading(false);
        });
    };

    firebaseAuthPersistenceReady
      .catch(err => {
        console.warn('[Auth] Firebase persistence setup failed', err);
      })
      .then(async () => {
        const a = auth as { authStateReady?: () => Promise<void> };
        if (typeof a.authStateReady === 'function') {
          await a.authStateReady();
        }
      })
      .then(() => {
        startAuthListener();
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    store.dispatch(clearUser());
    store.dispatch(clearCache());
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};
