import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Divider, Eyebrow, Screen } from '@/src/components';
import { formatDateTime, formatDuration, formatKm } from '@/src/format';
import { useOpenDash } from '@/src/store';

type Point = { lat: number; lng: number; t: number };

function haversine(a: Point, b: Point): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export default function RidesScreen() {
  const dash = useOpenDash();
  const { palette, rides } = dash;
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [liveKm, setLiveKm] = useState(0);
  const [liveSec, setLiveSec] = useState(0);
  const points = useRef<Point[]>([]);
  const startMs = useRef(0);
  const sub = useRef<Location.LocationSubscription | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      sub.current?.remove();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function startRide() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location needed', 'Allow location while using the app to record a ride.');
      return;
    }
    points.current = [];
    startMs.current = Date.now();
    setLiveKm(0);
    setLiveSec(0);
    setRecording(true);
    timer.current = setInterval(() => setLiveSec(Math.round((Date.now() - startMs.current) / 1000)), 1000);
    sub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 8, timeInterval: 2000 },
      (loc) => {
        const p: Point = { lat: loc.coords.latitude, lng: loc.coords.longitude, t: Date.now() };
        const prev = points.current[points.current.length - 1];
        points.current.push(p);
        if (prev) setLiveKm((km) => km + haversine(prev, p) / 1000);
      },
    );
  }

  async function stopRide() {
    sub.current?.remove();
    sub.current = null;
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    const track = points.current;
    if (track.length < 2) {
      Alert.alert('Ride too short', 'Move a little before stopping so a path can be saved.');
      return;
    }
    let distance = 0;
    let maxSpeed = 0;
    for (let i = 1; i < track.length; i++) {
      const d = haversine(track[i - 1], track[i]);
      distance += d;
      const dt = (track[i].t - track[i - 1].t) / 1000;
      if (dt > 0) maxSpeed = Math.max(maxSpeed, d / dt);
    }
    const durationSec = Math.max(1, Math.round((Date.now() - startMs.current) / 1000));
    await dash.addRide({
      startMs: startMs.current,
      endMs: Date.now(),
      distanceMeters: distance,
      durationSec,
      avgSpeedMps: distance / durationSec,
      maxSpeedMps: maxSpeed,
      startLat: track[0].lat,
      startLng: track[0].lng,
      endLat: track[track.length - 1].lat,
      endLng: track[track.length - 1].lng,
    });
  }

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
        <Eyebrow>{recording ? 'Recording' : 'Phone GPS'}</Eyebrow>
        <Text style={{ color: palette.accent, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {liveKm.toFixed(2)} km
        </Text>
        <Text style={{ color: palette.textMid, marginTop: 4 }}>{formatDuration(liveSec)}</Text>
        <View style={{ height: 14 }} />
        {recording ? (
          <Button label="Stop and save" onPress={stopRide} />
        ) : (
          <Button label="Start ride" icon="radio-button-on" onPress={startRide} />
        )}
      </Card>
      <Card>
        <Eyebrow>History</Eyebrow>
        {rides.length === 0 ? (
          <Text style={{ color: palette.textMid }}>No rides yet. Start one before you roll out.</Text>
        ) : (
          rides.map((ride, i) => (
            <View key={ride.sid}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: '700' }}>{formatKm(ride.distanceMeters / 1000)}</Text>
                  <Text style={{ color: palette.textLo, marginTop: 3 }}>{formatDateTime(ride.startMs)}</Text>
                  <Text style={{ color: palette.textMid, marginTop: 3 }}>
                    {formatDuration(ride.durationSec)} · avg {(ride.avgSpeedMps * 3.6).toFixed(0)} km/h
                  </Text>
                </View>
                <Pressable onPress={() => dash.deleteRide(ride.sid)} hitSlop={8}>
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
