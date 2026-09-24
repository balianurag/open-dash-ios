import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components';
import { DashGrid, dashColors, useGarageContext, useNow, type DashColors } from '@/src/DashGrid';
import { activeLayout, nextLayoutId, selectLayout, type DashContext } from '@/src/dashboard';
import { gpsStatus, useRideSensors, type RideSensors } from '@/src/rideSensors';
import { useOpenDash } from '@/src/store';

export default function RideDashboardScreen() {
  useKeepAwake('opendash-ride-dashboard', { suppressDeactivateWarnings: true });
  const dash = useOpenDash();
  const board = dash.settings.dashboard;
  const layout = activeLayout(board);
  const night = board.nightMode;
  const colors = dashColors(dash.palette, night);
  const sensors = useRideSensors();
  const now = useNow();
  const garage = useGarageContext(sensors.sessionMeters / 1000);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 2500);
    return () => clearTimeout(id);
  }, [hint]);

  const ctx: DashContext = {
    now,
    gps: gpsStatus(sensors, now),
    speedMps: sensors.fix?.speedMps ?? null,
    accuracyM: sensors.fix?.accuracyM ?? null,
    tripMeters: sensors.tripMeters,
    tripStartMs: sensors.tripStartMs,
    headingDeg: sensors.heading?.deg ?? null,
    headingSource: sensors.heading?.source ?? null,
    compass: sensors.compass,
    ...garage,
  };

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/dashboard');
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + 6,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingHorizontal: 10,
      }}
    >
      <StatusBar hidden />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <RoundButton icon="close" label="Close dashboard" colors={colors} onPress={close} />
        <Pressable
          disabled={board.layouts.length < 2}
          onPress={() => dash.updateDashboard((d) => selectLayout(d, nextLayoutId(d)))}
          accessibilityRole="button"
          accessibilityLabel={`Layout ${layout.name}. Tap to switch layout.`}
          style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Text numberOfLines={1} style={{ color: colors.label, fontSize: night ? 18 : 16, fontWeight: '800' }}>
            {layout.name}
          </Text>
          {board.layouts.length > 1 ? <Ionicons name="swap-horizontal" size={16} color={colors.caption} /> : null}
        </Pressable>
        <RoundButton
          icon="refresh"
          label="Reset trip. Press and hold."
          colors={colors}
          onPress={() => setHint(true)}
          onLongPress={() => {
            sensors.resetTrip();
            setHint(false);
          }}
        />
        <RoundButton
          icon={night ? 'sunny' : 'moon'}
          label={night ? 'Turn night mode off' : 'Turn night mode on'}
          colors={colors}
          onPress={() => dash.updateDashboard((d) => ({ ...d, nightMode: !d.nightMode }))}
        />
      </View>
      <DashGrid tiles={layout.tiles} ctx={ctx} colors={colors} night={night} />
      <SensorBanner sensors={sensors} colors={colors} />
      {hint ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 62,
            left: 24,
            right: 24,
            borderRadius: 14,
            padding: 12,
            backgroundColor: colors.tile,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.value, textAlign: 'center', fontWeight: '700' }}>
            Hold reset to clear trip and ride time
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function RoundButton({
  icon,
  label,
  colors,
  onPress,
  onLongPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: DashColors;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={600}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.tile,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={colors.label} />
    </Pressable>
  );
}

function SensorBanner({ sensors, colors }: { sensors: RideSensors; colors: DashColors }) {
  const copy =
    sensors.watch === 'denied'
      ? {
          title: 'Location is off for OpenDash',
          body: 'Speed, trip, and heading need location while the dashboard is open. In Settings, set Location to “While Using the App”. The other tiles keep working.',
          settings: true,
        }
      : sensors.watch === 'services-off'
        ? {
            title: 'Location Services are off',
            body: 'Turn on Location Services in Settings › Privacy & Security to see speed and trip distance.',
            settings: true,
          }
        : sensors.watch === 'unavailable'
          ? {
              title: 'GPS is not available right now',
              body: 'Speed and trip appear once the phone can get a location fix.',
              settings: false,
            }
          : null;
  if (!copy) return null;
  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.warn,
        backgroundColor: colors.tile,
        padding: 14,
        gap: 6,
      }}
    >
      <Text style={{ color: colors.warn, fontSize: 16, fontWeight: '800' }}>{copy.title}</Text>
      <Text style={{ color: colors.label, lineHeight: 20 }}>{copy.body}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        {copy.settings && Platform.OS !== 'web' ? (
          <View style={{ flex: 1 }}>
            <Button label="Open Settings" icon="settings-outline" onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button label="Try again" variant="secondary" onPress={sensors.retry} />
        </View>
      </View>
    </View>
  );
}
