import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();
