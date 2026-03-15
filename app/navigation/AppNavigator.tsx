import React from 'react';
import { Platform } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import NewTeamScreen from '../screens/NewTeamScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ActivityScreen from '../screens/ActivityScreen';
import NotFoundScreen from '../screens/NotFoundScreen';
import SplitTabScreen from '../screens/SplitTabScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import AboutScreen from '../screens/AboutScreen';
import TermsScreen from '../screens/TermsScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  NewTeam: undefined;
  TeamDetail: { teamId: string };
  AddExpense: { teamId: string; expenseId?: string };
  ExpenseDetail: { expenseId: string; teamId: string };
  ChangePassword: undefined;
  About: undefined;
  Terms: undefined;
  NotFound: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  CreateTeam: undefined;
  Split: undefined;
  Activity: undefined;
  Profile: { editing?: boolean } | undefined;
  Settings: undefined;
};

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_HEIGHT = 54;
const BOTTOM_MARGIN = 0;
const HORIZONTAL_MARGIN = 20;
const TAB_BAR_RADIUS = 28;

const MainTabsNavigator: React.FC = () => {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? insets.bottom : 16;
  const tabBarBottom = bottomInset + BOTTOM_MARGIN;
  const tabBarBg =
    theme === 'dark'
      ? 'rgba(37,40,48,0.92)'
      : Platform.OS === 'ios'
        ? 'rgba(255,255,255,0.88)'
        : 'rgba(255,255,255,0.92)';

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: HORIZONTAL_MARGIN,
          right: HORIZONTAL_MARGIN,
          bottom: tabBarBottom,
          height: TAB_BAR_HEIGHT,
          borderRadius: TAB_BAR_RADIUS,
          backgroundColor: tabBarBg,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          overflow: 'hidden',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'CreateTeam') iconName = 'people-outline';
          else if (route.name === 'Split') iconName = 'add-circle-outline';
          else if (route.name === 'Activity') iconName = 'receipt-outline';
          else if (route.name === 'Profile') iconName = 'person-circle-outline';
          else if (route.name === 'Settings') iconName = 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <MainTab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <MainTab.Screen
        name="CreateTeam"
        component={CreateTeamScreen}
        options={{ title: 'Teams' }}
      />
      {/* <MainTab.Screen name="Split" component={SplitTabScreen} options={{ title: 'Split' }} /> */}
      <MainTab.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
      <MainTab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <MainTab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </MainTab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const navigationTheme: Theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
      border: colors.border,
    },
  };
  return (
    <NavigationContainer ref={rootNavigationRef} theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
        <Stack.Screen name="NewTeam" component={NewTeamScreen} />
        <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
        <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
