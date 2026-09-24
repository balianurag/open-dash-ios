import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, Switch, Text, View } from 'react-native';

import { Card, Chip, Divider, Eyebrow, Screen } from '@/src/components';
import { formatDate } from '@/src/format';
import { CURRENCIES } from '@/src/models';
import { notificationsSupported, requestNotificationPermission } from '@/src/notifications';
import { useOpenDash } from '@/src/store';
import { THEME_NAMES } from '@/src/theme';

export default function MoreScreen() {
  const dash = useOpenDash();
  const { palette, settings } = dash;
  const [page, setPage] = useState<'root' | 'appearance' | 'reminders' | 'about' | 'help'>('root');
  const [asking, setAsking] = useState(false);

  async function toggleReminders(enabled: boolean) {
    if (!enabled) return dash.setRemindersEnabled(false);
    if (!notificationsSupported) {
      return Alert.alert('Reminders need the iPhone app', 'Notifications are not available in the web preview.');
    }
    setAsking(true);
    const allowed = await requestNotificationPermission().catch(() => false);
    setAsking(false);
    if (allowed) return dash.setRemindersEnabled(true);
    Alert.alert(
      'Notifications are off',
      'Allow notifications for OpenDash in Settings to get service, PUC, and insurance reminders.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ],
    );
  }

  if (page === 'reminders') {
    const upcoming = dash.upcomingReminders.slice(0, 5);
    return (
      <Screen title="Reminders" action={<Back onPress={() => setPage('root')} />}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Service & document reminders</Text>
              <Text style={{ color: palette.textMid, marginTop: 4, lineHeight: 20 }}>
                PUC and insurance: 7 days before and on the expiry day at 9:00. Service: when an interval
                becomes due or overdue by distance, and on its 12-month date.
              </Text>
            </View>
            <Switch
              value={settings.remindersEnabled}
              disabled={asking}
              onValueChange={(on) => void toggleReminders(on)}
              trackColor={{ true: palette.accent, false: palette.surfaceHigh }}
            />
          </View>
        </Card>
        {settings.remindersEnabled ? (
          <>
            <Eyebrow>Coming up</Eyebrow>
            <Card>
              {upcoming.length === 0 ? (
                <Text style={{ color: palette.textMid, lineHeight: 20 }}>
                  Nothing scheduled. Add PUC and insurance expiry dates in Vehicles.
                </Text>
              ) : (
                upcoming.map((r, i) => (
                  <View key={r.id}>
                    {i > 0 ? <Divider /> : null}
                    <Text style={{ color: palette.text, fontWeight: '600' }}>{r.title}</Text>
                    <Text style={{ color: palette.textLo, marginTop: 3 }}>{formatDate(r.date.getTime())} · 9:00</Text>
                  </View>
                ))
              )}
            </Card>
          </>
        ) : null}
      </Screen>
    );
  }

  if (page === 'appearance') {
    return (
      <Screen title="Appearance" action={<Back onPress={() => setPage('root')} />}>
        <Eyebrow>Theme</Eyebrow>
        <Card>
          {THEME_NAMES.map((name, i) => (
            <Pressable key={name} onPress={() => dash.setTheme(name)}>
              {i > 0 ? <Divider /> : null}
              <Row label={name} selected={settings.theme === name} />
            </Pressable>
          ))}
        </Card>
        <Eyebrow>Currency</Eyebrow>
        <Card>
          {CURRENCIES.map((c, i) => (
            <Pressable key={c.code} onPress={() => dash.setCurrency(c.code)}>
              {i > 0 ? <Divider /> : null}
              <Row label={`${c.symbol}  ${c.label}`} selected={settings.currency === c.code} />
            </Pressable>
          ))}
        </Card>
        <Eyebrow>Navigation</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Apple Maps" active={settings.mapProvider === 'apple'} onPress={() => dash.setMapProvider('apple')} />
          <Chip label="Google Maps" active={settings.mapProvider === 'google'} onPress={() => dash.setMapProvider('google')} />
        </View>
      </Screen>
    );
  }

  if (page === 'about') {
    return (
      <Screen title="About" action={<Back onPress={() => setPage('root')} />}>
        <Card>
          <Text style={{ color: palette.accent, fontSize: 22, fontWeight: '700' }}>OpenDash iOS</Text>
          <Text style={{ color: palette.textMid, marginTop: 8, lineHeight: 22 }}>
            Independent, unofficial iOS companion derived from OpenDash. Local-first rider tools for vehicles,
            garage, expenses, route preview, and ride history.
          </Text>
          <Text style={{ color: palette.textLo, marginTop: 12, lineHeight: 20 }}>
            This app does not pair with, project to, or control a motorcycle dashboard. Royal Enfield names remain
            their trademarks. Apache License 2.0.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (page === 'help') {
    return (
      <Screen title="Help" action={<Back onPress={() => setPage('root')} />}>
        <Card>
          {[
            ['Vehicles', 'Add your Himalayan 450, set it current, and keep PUC / insurance dates.'],
            ['Expenses', 'Log fuel and ownership costs. Fuel entries also feed garage mileage.'],
            ['Garage', 'Track odometer and Himalayan 450 service intervals from the owner’s manual.'],
            ['Route preview', 'Paste a Maps or geo: link, then open turn-by-turn in Apple or Google Maps.'],
            ['Rides', 'Record a GPS session on the phone. The screen can stay in your pocket.'],
          ].map(([title, body], i) => (
            <View key={title}>
              {i > 0 ? <Divider /> : null}
              <Text style={{ color: palette.text, fontWeight: '700' }}>{title}</Text>
              <Text style={{ color: palette.textMid, marginTop: 4, lineHeight: 20 }}>{body}</Text>
            </View>
          ))}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="More">
      <Card>
        <Link href="/route" asChild>
          <Pressable>
            <MenuRow icon="map-outline" label="Preview a route" />
          </Pressable>
        </Link>
        <Divider />
        <Link href="/rides" asChild>
          <Pressable>
            <MenuRow icon="navigate-outline" label="Ride history" />
          </Pressable>
        </Link>
      </Card>
      <Card>
        <Pressable onPress={() => setPage('appearance')}>
          <MenuRow icon="color-palette-outline" label="Appearance & units" />
        </Pressable>
        <Divider />
        <Pressable onPress={() => setPage('reminders')}>
          <MenuRow icon="notifications-outline" label="Reminders" />
        </Pressable>
        <Divider />
        <Pressable onPress={() => setPage('help')}>
          <MenuRow icon="help-circle-outline" label="Help" />
        </Pressable>
        <Divider />
        <Pressable onPress={() => setPage('about')}>
          <MenuRow icon="information-circle-outline" label="About" />
        </Pressable>
      </Card>
    </Screen>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  const { palette } = useOpenDash();
  return (
    <Pressable onPress={onPress}>
      <Text style={{ color: palette.accent, fontWeight: '700' }}>Back</Text>
    </Pressable>
  );
}

function Row({ label, selected }: { label: string; selected: boolean }) {
  const { palette } = useOpenDash();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ color: palette.text, fontSize: 16 }}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={18} color={palette.accent} /> : null}
    </View>
  );
}

function MenuRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { palette } = useOpenDash();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <Ionicons name={icon} size={20} color={palette.accent} />
      <Text style={{ color: palette.text, fontSize: 16, flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={palette.textLo} />
    </View>
  );
}
