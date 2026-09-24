import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useOpenDash } from '@/src/store';

export default function TabLayout() {
  const { palette } = useOpenDash();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textLo,
        tabBarStyle: {
          backgroundColor: palette.surfaceHigh,
          borderTopWidth: 0,
          marginHorizontal: 12,
          marginBottom: 10,
          borderRadius: 28,
          height: 64,
          paddingTop: 6,
          position: 'absolute',
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', paddingBottom: 6 },
        sceneStyle: { backgroundColor: palette.bg, paddingBottom: 76 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ color }) => <Ionicons name="bicycle-outline" size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: 'Garage',
          tabBarIcon: ({ color }) => <Ionicons name="construct-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
