import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Switch, Text, View } from 'react-native';

import { Button, Card, Chip, Divider, Eyebrow, Field, Screen } from '@/src/components';
import { DashGrid, dashColors, useGarageContext, useNow } from '@/src/DashGrid';
import {
  activeLayout,
  addTile,
  applySpeedFocus,
  createLayout,
  DEFAULT_TANK_LITRES,
  deleteLayout,
  isValidTank,
  MAX_TANK_LITRES,
  moveTile,
  removeTile,
  renameLayout,
  selectLayout,
  setTankLitres,
  tankLitresFor,
  TILE_KINDS,
  TILE_META,
  toggleTileSize,
  type DashContext,
} from '@/src/dashboard';
import { newSid } from '@/src/repo';
import { useOpenDash } from '@/src/store';

export default function DashboardTab() {
  const dash = useOpenDash();
  const { palette, settings, activeVehicle, avgKmplLast5 } = dash;
  const board = settings.dashboard;
  const layout = activeLayout(board);
  const update = dash.updateDashboard;
  const router = useRouter();
  const now = useNow(30_000);
  const garage = useGarageContext(0);
  const [naming, setNaming] = useState<{ mode: 'new' | 'rename'; name: string } | null>(null);
  const missing = TILE_KINDS.filter((kind) => !layout.tiles.some((t) => t.kind === kind));
  const tankLitres = tankLitresFor(board, activeVehicle.id);
  const previewColors = dashColors(palette, board.nightMode);

  const preview: DashContext = {
    now,
    gps: 'preview',
    speedMps: null,
    accuracyM: null,
    tripMeters: 0,
    tripStartMs: now,
    headingDeg: null,
    headingSource: null,
    compass: true,
    ...garage,
  };

  async function saveName() {
    const name = naming?.name.trim();
    if (!naming || !name) return;
    if (naming.mode === 'new') {
      const id = newSid();
      await update((d) => createLayout(d, id, name));
    } else {
      await update((d) => renameLayout(d, layout.id, name));
    }
    setNaming(null);
  }

  function confirmDelete() {
    Alert.alert(`Delete “${layout.name}”?`, 'Your other layouts stay as they are.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void update((d) => deleteLayout(d, layout.id)) },
    ]);
  }

  return (
    <Screen title="Dashboard">
      <Card>
        <Eyebrow>Ride dashboard</Eyebrow>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>A phone dash for your handlebar mount</Text>
        <Text style={{ color: palette.textMid, marginTop: 6, lineHeight: 20 }}>
          Full screen, big numerals, and the screen stays on while it is open.
        </Text>
        <Text style={{ color: palette.textLo, marginTop: 6, lineHeight: 19 }}>
          Uses the phone’s GPS and compass only. It does not connect to your motorcycle or its Tripper Dash.
        </Text>
        <View style={{ height: 12 }} />
        <Button
          label={`Start ${layout.name} dashboard`}
          icon="speedometer-outline"
          onPress={() => router.push('/ride-dashboard')}
        />
      </Card>

      <Eyebrow>Layouts</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {board.layouts.map((l) => (
          <Chip key={l.id} label={l.name} active={l.id === layout.id} onPress={() => update((d) => selectLayout(d, l.id))} />
        ))}
        <Chip label="+ New layout" onPress={() => setNaming({ mode: 'new', name: '' })} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Rename"
            icon="create-outline"
            variant="ghost"
            onPress={() => setNaming({ mode: 'rename', name: layout.name })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Delete"
            icon="trash-outline"
            variant="ghost"
            disabled={board.layouts.length < 2}
            onPress={confirmDelete}
          />
        </View>
      </View>

      <Eyebrow>Preview</Eyebrow>
      <View
        style={{
          height: 420,
          padding: 8,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: previewColors.bg,
        }}
      >
        <DashGrid tiles={layout.tiles} ctx={preview} colors={previewColors} night={board.nightMode} gap={6} />
      </View>

      <Eyebrow>{`Tiles in ${layout.name}`}</Eyebrow>
      <Card>
        {layout.tiles.length === 0 ? (
          <Text style={{ color: palette.textMid }}>No tiles yet. Add one below.</Text>
        ) : (
          layout.tiles.map((tile, i) => {
            const meta = TILE_META[tile.kind];
            return (
              <View key={tile.kind}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={meta.icon} size={20} color={palette.textMid} />
                  <Text numberOfLines={1} style={{ color: palette.text, fontWeight: '600', flex: 1 }}>
                    {meta.label}
                  </Text>
                  <Chip
                    label={tile.size === 'large' ? 'Large' : 'Small'}
                    active={tile.size === 'large'}
                    onPress={() => update((d) => toggleTileSize(d, tile.kind))}
                  />
                  <IconButton
                    icon="chevron-up"
                    label={`Move ${meta.label} up`}
                    disabled={i === 0}
                    onPress={() => update((d) => moveTile(d, tile.kind, -1))}
                  />
                  <IconButton
                    icon="chevron-down"
                    label={`Move ${meta.label} down`}
                    disabled={i === layout.tiles.length - 1}
                    onPress={() => update((d) => moveTile(d, tile.kind, 1))}
                  />
                  <IconButton
                    icon="close"
                    label={`Remove ${meta.label}`}
                    onPress={() => update((d) => removeTile(d, tile.kind))}
                  />
                </View>
              </View>
            );
          })
        )}
      </Card>
      <Button label="Speed focus preset" icon="speedometer-outline" variant="secondary" onPress={() => update(applySpeedFocus)} />
      <Text style={{ color: palette.textLo, marginTop: -6, lineHeight: 18 }}>
        Puts Speed first and large, and makes the other tiles small.
      </Text>

      {missing.length ? (
        <>
          <Eyebrow>Add a tile</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {missing.map((kind) => (
              <Chip key={kind} label={`+ ${TILE_META[kind].label}`} onPress={() => update((d) => addTile(d, kind))} />
            ))}
          </View>
        </>
      ) : null}

      <Eyebrow>Display</Eyebrow>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Night mode</Text>
            <Text style={{ color: palette.textMid, marginTop: 4, lineHeight: 20 }}>
              Pure black with brighter, bolder numbers. Also on the dashboard’s moon button.
            </Text>
          </View>
          <Switch
            value={board.nightMode}
            onValueChange={(on) => void update((d) => ({ ...d, nightMode: on }))}
            trackColor={{ true: palette.accent, false: palette.surfaceHigh }}
          />
        </View>
      </Card>

      <Eyebrow>Fuel range</Eyebrow>
      <TankCard
        key={`${activeVehicle.id}:${tankLitres}`}
        vehicleTitle={activeVehicle.title}
        litres={tankLitres}
        kmpl={avgKmplLast5}
        onSave={(litres) => update((d) => setTankLitres(d, activeVehicle.id, litres))}
      />

      <Modal visible={naming != null} transparent animationType="fade" onRequestClose={() => setNaming(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: palette.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>
              {naming?.mode === 'rename' ? 'Rename layout' : 'New layout'}
            </Text>
            {naming?.mode === 'new' ? (
              <Text style={{ color: palette.textMid, marginTop: 6 }}>Starts as a copy of {layout.name}.</Text>
            ) : null}
            <Field
              label="Name"
              value={naming?.name ?? ''}
              onChangeText={(name) => setNaming((n) => (n ? { ...n, name } : n))}
              placeholder="Weekend"
              maxLength={24}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void saveName()}
            />
            <View style={{ height: 12 }} />
            <Button label="Save" disabled={!naming?.name.trim()} onPress={() => void saveName()} />
            <Button label="Cancel" variant="ghost" onPress={() => setNaming(null)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { palette } = useOpenDash();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.surfaceHigh,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons name={icon} size={18} color={palette.text} />
    </Pressable>
  );
}

function TankCard({
  vehicleTitle,
  litres,
  kmpl,
  onSave,
}: {
  vehicleTitle: string;
  litres: number;
  kmpl: number | null;
  onSave: (litres: number) => Promise<void>;
}) {
  const { palette } = useOpenDash();
  const [text, setText] = useState(String(litres));
  const parsed = Number(text.replace(',', '.'));
  const valid = isValidTank(parsed);
  return (
    <Card>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Tank size for {vehicleTitle}</Text>
      <Field
        label={`Tank capacity (litres) · default ${DEFAULT_TANK_LITRES} L for the Himalayan 450`}
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        error={valid ? undefined : `Enter litres between 1 and ${MAX_TANK_LITRES}.`}
      />
      <Text style={{ color: palette.textMid, marginTop: 10, lineHeight: 20 }}>
        {kmpl != null
          ? `Full tank ≈ ${litres} L × ${kmpl.toFixed(1)} km/l ≈ ${Math.round(litres * kmpl).toLocaleString('en-IN')} km. The range tile subtracts the distance since your last fill-up and what you ride with the dashboard open, assuming you filled to full. It is an estimate, not a fuel gauge.`
          : 'Add fuel data: log at least two fill-ups with odometer readings in Expenses. Range is then estimated from your average km/l over the last five fill-ups.'}
      </Text>
      <View style={{ height: 12 }} />
      <Button
        label="Save tank size"
        variant="secondary"
        disabled={!valid || parsed === litres}
        onPress={() => void onSave(parsed)}
      />
    </Card>
  );
}
