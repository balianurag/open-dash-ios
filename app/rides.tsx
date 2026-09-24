import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Button, Card, Divider, Eyebrow, Screen } from '@/src/components';
import { formatDateTime, formatDuration, formatKm } from '@/src/format';
import {
  discardRide,
  finishRide,
  restoreRide,
  startRide,
  subscribeRide,
  type LiveRide,
  type RideStatus,
} from '@/src/rideRecorder';
import { useOpenDash } from '@/src/store';

function openSettings() {
  void Linking.openSettings();
}

function recordingNote(status: Pick<RideStatus, 'mode' | 'always'>): string {
  if (status.mode === 'paused') {
    return 'Location access is off, so this ride is paused. Allow location for OpenDash in Settings to keep recording.';
  }
  if (status.mode === 'foreground') {
    return 'Recording with the screen locked needs the OpenDash development build. Keep the app open while you ride.';
  }
  if (!status.always) {
    return 'Recording continues with the screen locked. Set location to "Always" in Settings so iOS can resume the ride if it closes OpenDash.';
  }
  return 'Recording continues with the screen locked and on the Lock Screen.';
}

export default function RidesScreen() {
  const dash = useOpenDash();
  const { palette, rides, activeVehicle } = dash;
  const router = useRouter();
  const [ride, setRide] = useState<LiveRide | null>(null);
  const [status, setStatus] = useState<Pick<RideStatus, 'mode' | 'always'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribeRide((next) => {
      if (alive) setRide(next);
    });
    restoreRide()
      .then((restored) => {
        if (!alive || !restored) return;
        setRide(restored.ride);
        setStatus(restored);
        setNow(Date.now());
      })
      .catch((error) => console.warn('OpenDash could not restore the ride', error));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const recordingSince = ride?.startMs;
  useEffect(() => {
    if (recordingSince == null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [recordingSince]);

  async function start() {
    setBusy(true);
    try {
      const result = await startRide(activeVehicle.title);
      if (result === 'services-off') {
        Alert.alert(
          'Location Services are off',
          'Turn on Location Services in Settings > Privacy & Security to record a ride.',
          [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: openSettings }],
        );
        return;
      }
      if (result === 'denied') {
        Alert.alert(
          'Allow location to record rides',
          'OpenDash only uses your location while a ride is recording. Turn on location for OpenDash in Settings.',
          [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: openSettings }],
        );
        return;
      }
      setRide(result.ride);
      setStatus(result);
      setNow(Date.now());
    } catch (error) {
      console.warn('OpenDash could not start the ride', error);
      Alert.alert('Could not start recording', 'Location updates are unavailable right now. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      const summary = await finishRide();
      if (summary) await dash.addRide(summary);
      await discardRide();
      setRide(null);
      setStatus(null);
      if (!summary) Alert.alert('Ride too short', 'Move a little before stopping so a path can be saved.');
    } catch (error) {
      console.warn('OpenDash could not save the ride', error);
      Alert.alert('Could not save the ride', 'Your track is still stored on this phone. Tap Stop and save again.');
    } finally {
      setBusy(false);
    }
  }

  const elapsedSec = ride ? Math.max(0, Math.round((now - ride.startMs) / 1000)) : 0;

  return (
    <Screen
      title="Rides"
      action={
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>Close</Text>
        </Pressable>
      }
    >
      <Card>
        <Eyebrow>{ride ? `Recording · ${ride.bike}` : 'Phone GPS'}</Eyebrow>
        <Text style={{ color: palette.accent, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {((ride?.distanceM ?? 0) / 1000).toFixed(2)} km
        </Text>
        <Text style={{ color: palette.textMid, marginTop: 4 }}>{formatDuration(elapsedSec)}</Text>
        {ride && status ? (
          <Text style={{ color: palette.textLo, marginTop: 10, lineHeight: 19 }}>{recordingNote(status)}</Text>
        ) : null}
        {ride && status && (status.mode === 'paused' || (status.mode === 'background' && !status.always)) ? (
          <Pressable onPress={openSettings} hitSlop={8}>
            <Text style={{ color: palette.accent, fontWeight: '700', marginTop: 8 }}>Open Settings</Text>
          </Pressable>
        ) : null}
        <View style={{ height: 14 }} />
        {ride ? (
          <Button label="Stop and save" onPress={stop} disabled={busy} />
        ) : (
          <Button label="Start ride" icon="radio-button-on" onPress={start} disabled={busy} />
        )}
      </Card>
      <Card>
        <Eyebrow>History</Eyebrow>
        {rides.length === 0 ? (
          <Text style={{ color: palette.textMid }}>No rides yet. Start one before you roll out.</Text>
        ) : (
          rides.map((r, i) => (
            <View key={r.sid}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: '700' }}>{formatKm(r.distanceMeters / 1000)}</Text>
                  <Text style={{ color: palette.textLo, marginTop: 3 }}>{formatDateTime(r.startMs)}</Text>
                  <Text style={{ color: palette.textMid, marginTop: 3 }}>
                    {formatDuration(r.durationSec)} · avg {(r.avgSpeedMps * 3.6).toFixed(0)} km/h
                  </Text>
                </View>
                <Pressable onPress={() => dash.deleteRide(r.sid)} hitSlop={8}>
                  <Text style={{ color: palette.textLo }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
