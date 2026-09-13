import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { C } from '../../lib/theme';
import AnalyticsScreen from './AnalyticsScreen';
import AuditLogScreen from './AuditLogScreen';
import LiveMapScreen from './LiveMapScreen';
import OperationsScreen from './OperationsScreen';
import RespondersScreen from './RespondersScreen';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, { on: any; off: any }> = {
  Operations: { on: 'albums', off: 'albums-outline' },
  Map: { on: 'map', off: 'map-outline' },
  Responders: { on: 'people', off: 'people-outline' },
  Analytics: { on: 'stats-chart', off: 'stats-chart-outline' },
  Audit: { on: 'time', off: 'time-outline' },
};

export default function DispatcherTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? ICONS[route.name].on : ICONS[route.name].off} size={size - 3} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Operations" component={OperationsScreen} />
      <Tab.Screen name="Map" component={LiveMapScreen} />
      <Tab.Screen name="Responders" component={RespondersScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Audit" component={AuditLogScreen} />
    </Tab.Navigator>
  );
}
