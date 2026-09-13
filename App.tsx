import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C } from './lib/theme';
import type { RootStackParamList } from './lib/types';

import ReportIncidentScreen from './screens/citizen/ReportIncidentScreen';
import TrackDetailScreen from './screens/citizen/TrackDetailScreen';
import TrackLookupScreen from './screens/citizen/TrackLookupScreen';
import DispatcherLoginScreen from './screens/dispatcher/DispatcherLoginScreen';
import DispatcherTabs from './screens/dispatcher/DispatcherTabs';
import IncidentManageScreen from './screens/dispatcher/IncidentManageScreen';
import HomeScreen from './screens/HomeScreen';
import ResponderAuthScreen from './screens/responder/ResponderAuthScreen';
import ResponderHomeScreen from './screens/responder/ResponderHomeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.bg,
    card: C.card,
    text: C.text,
    border: C.border,
    primary: C.accent,
  },
};

export default function App() {
  // Preload icon fonts for web - required for icons to display correctly
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Report" component={ReportIncidentScreen} />
            <Stack.Screen name="Track" component={TrackLookupScreen} />
            <Stack.Screen name="TrackDetail" component={TrackDetailScreen} />
            <Stack.Screen name="DispatcherLogin" component={DispatcherLoginScreen} />
            <Stack.Screen name="Dispatcher" component={DispatcherTabs} />
            <Stack.Screen name="IncidentManage" component={IncidentManageScreen} />
            <Stack.Screen name="ResponderAuth" component={ResponderAuthScreen} />
            <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
