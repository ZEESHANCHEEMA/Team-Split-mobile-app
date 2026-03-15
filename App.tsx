import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AppNavigator from './app/navigation/AppNavigator';
import { AuthProvider, useAuthContext } from './app/context/AuthContext';
import { store, persistor } from './app/store';
import { getColors } from './app/theme/colors';
import type { RootState } from './app/store';
import Toast from 'react-native-toast-message';

const Root: React.FC = () => {
  const { loading } = useAuthContext();
  const theme = useSelector((s: RootState) => s.settings.theme);
  const colors = getColors(theme);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
      <Toast />
    </>
  );
};

const App: React.FC = () => {
  const fallbackColors = getColors('light');
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={{ flex: 1, backgroundColor: fallbackColors.background, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={fallbackColors.primary} size="large" />
          </View>
        }
        persistor={persistor}
      >
        <AuthProvider>
          <Root />
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;

