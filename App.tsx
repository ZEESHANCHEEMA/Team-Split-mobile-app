import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import AppNavigator from './app/navigation/AppNavigator';
import { AuthProvider, useAuthContext } from './app/context/AuthContext';

const Root: React.FC = () => {
  const { loading } = useAuthContext();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#020617',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  return <AppNavigator />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Root />
    </AuthProvider>
  );
};

export default App;

