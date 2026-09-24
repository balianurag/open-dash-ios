import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Button, Card, Divider, Eyebrow, Field, Screen } from '@/src/components';
import { appleMapsUrl, googleMapsUrl, parseSharedLocation, resolveMapUrl } from '@/src/locationParser';
import { useOpenDash } from '@/src/store';

export default function RouteScreen() {
  const dash = useOpenDash();
  const { palette, settings, savedLocations } = dash;
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const incoming = typeof params.q === 'string' ? params.q : '';
  const [input, setInput] = useState(incoming);
  const [seenIncoming, setSeenIncoming] = useState(incoming);
  if (incoming !== seenIncoming) {
    setSeenIncoming(incoming);
    if (incoming.trim()) setInput(incoming);
  }
  const [name, setName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function applyText(text: string) {
    const parsed = parseSharedLocation(text);
    setName(parsed.name);
    if (parsed.lat != null && parsed.lng != null) {
      setLat(parsed.lat);
      setLng(parsed.lng);
      return;
    }
    if (parsed.url && parsed.needsExpansion) {
      setBusy(true);
      const resolved = await resolveMapUrl(parsed.url);
      setBusy(false);
      if (resolved?.lat && resolved.lng) {
        setLat(resolved.lat);
        setLng(resolved.lng);
        if (resolved.name) setName(resolved.name);
      } else {
        Alert.alert('Could not read that link', 'Paste a Google, Apple, OSM, or geo: link with coordinates.');
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (incoming.trim()) void applyText(incoming);
  }, [incoming]);

  function openNav() {
    if (lat == null || lng == null) return;
    const url = settings.mapProvider === 'google' ? googleMapsUrl(lat, lng) : appleMapsUrl(lat, lng, name);
    void Linking.openURL(url);
  }

  return (
    <Screen
      title="Route preview"
      action={
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>Close</Text>
        </Pressable>
      }
    >
      <Card>
        <Eyebrow>Shared destination</Eyebrow>
        <Field
          label="Paste a Maps or geo: link"
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://maps.app.goo.gl/… or geo:12.97,77.59"
        />
        <View style={{ height: 12 }} />
        <Button label={busy ? 'Reading link…' : 'Preview'} disabled={busy || !input.trim()} onPress={() => applyText(input)} />
      </Card>
      {lat != null && lng != null ? (
        <Card>
          <Text style={{ color: palette.accent, fontSize: 20, fontWeight: '700' }}>{name || 'Dropped pin'}</Text>
          <Text style={{ color: palette.textMid, marginTop: 6, fontVariant: ['tabular-nums'] }}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>
          <View style={{ height: 14 }} />
          <Button label={`Open in ${settings.mapProvider === 'google' ? 'Google Maps' : 'Apple Maps'}`} icon="navigate" onPress={openNav} />
          <View style={{ height: 8 }} />
          <Button
            label="Save destination"
            variant="secondary"
            icon="bookmark-outline"
            onPress={() => dash.saveLocation({ name: name || 'Saved pin', lat, lng, note: '', createdMs: Date.now() })}
          />
        </Card>
      ) : null}
      {savedLocations.length ? (
        <Card>
          <Eyebrow>Saved destinations</Eyebrow>
          {savedLocations.map((loc, i) => (
            <Pressable
              key={loc.sid}
              onPress={() => {
                setName(loc.name);
                setLat(loc.lat);
                setLng(loc.lng);
              }}
            >
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="location-outline" size={18} color={palette.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: '600' }}>{loc.name}</Text>
                  <Text style={{ color: palette.textLo, fontSize: 12 }}>
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </Text>
                </View>
                <Pressable onPress={() => dash.deleteLocation(loc.sid)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={palette.textLo} />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
