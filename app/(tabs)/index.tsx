import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { Button, Card, Chip, Divider, Eyebrow, Field, Screen } from '@/src/components';
import { formatDate, isProblemValue, parseIsoDate } from '@/src/format';
import type { Vehicle } from '@/src/models';
import { useOpenDash } from '@/src/store';

export default function VehiclesScreen() {
  const dash = useOpenDash();
  const { palette, vehicles, activeVehicleId } = dash;
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <Screen title="Vehicles">
      <Eyebrow>My Vehicles</Eyebrow>
      <Card>
        {vehicles.map((vehicle, index) => (
          <View key={vehicle.id}>
            {index > 0 ? <Divider /> : null}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Ionicons name="bicycle-outline" size={26} color={palette.textMid} style={{ marginTop: 4 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.accent, fontSize: 17, fontWeight: '700' }}>{vehicle.title}</Text>
                {vehicle.nickname ? (
                  <Text style={{ color: palette.textMid, marginTop: 2 }}>{vehicle.nickname}</Text>
                ) : null}
                <Meta label="PUC" value={vehicle.puc} alert={isProblemValue(vehicle.puc)} />
                <Meta label="Insurance" value={vehicle.insurance} alert={isProblemValue(vehicle.insurance)} />
                <Meta label="Service" value={vehicle.service} />
                <View style={{ marginTop: 10 }}>
                  {vehicle.id === activeVehicleId ? (
                    <Chip label="Current vehicle" active />
                  ) : (
                    <Button
                      label="Set current"
                      variant="secondary"
                      icon="checkmark"
                      onPress={() => dash.selectVehicle(vehicle.id)}
                    />
                  )}
                </View>
              </View>
              <Pressable onPress={() => setEditing(vehicle)} hitSlop={8}>
                <Ionicons name="create-outline" size={20} color={palette.textMid} />
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
      <Button label="Add vehicle" icon="add" onPress={() => setAdding(true)} />
      <VehicleEditor
        visible={adding}
        title="Add vehicle"
        initial={{ title: '', nickname: '', puc: 'Not set', insurance: 'Not set', service: 'Not set' }}
        onClose={() => setAdding(false)}
        onSave={async (v) => {
          if (!v.title.trim()) return Alert.alert('Name the bike', 'Add a title such as Himalayan 450.');
          await dash.addVehicle(v);
          setAdding(false);
        }}
      />
      {editing ? (
        <VehicleEditor
          visible
          title="Edit vehicle"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await dash.updateVehicle({ ...editing, ...v });
            setEditing(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

function Meta({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  const { palette } = useOpenDash();
  return (
    <View style={{ flexDirection: 'row', marginTop: 8 }}>
      <Text style={{ width: 88, color: palette.textLo, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: palette.textLo, fontSize: 13 }}>:  </Text>
      <Text style={{ color: alert ? palette.alert : palette.textMid, fontSize: 13, flex: 1 }}>{value}</Text>
    </View>
  );
}

function expiryError(value: string): string | undefined {
  if (value === 'Not set' || parseIsoDate(value)) return undefined;
  return 'Use YYYY-MM-DD, for example 2026-03-31. Leave empty if not set.';
}

function VehicleEditor({
  visible,
  title,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  initial: Omit<Vehicle, 'id'>;
  onClose: () => void;
  onSave: (v: Omit<Vehicle, 'id'>) => Promise<void>;
}) {
  const { palette } = useOpenDash();
  const [form, setForm] = useState(initial);
  const [today] = useState(() => formatDate(Date.now()));
  const pucError = expiryError(form.puc);
  const insuranceError = expiryError(form.insurance);
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' }}>
        <View
          style={{
            backgroundColor: palette.bg,
            padding: 20,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            gap: 4,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
          <Field label="Title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="Himalayan 450" />
          <Field
            label="Nickname"
            value={form.nickname}
            onChangeText={(nickname) => setForm({ ...form, nickname })}
            placeholder="The mule"
          />
          <Field
            label="PUC expiry"
            value={form.puc === 'Not set' ? '' : form.puc}
            onChangeText={(puc) => setForm({ ...form, puc: puc.trim() || 'Not set' })}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            error={pucError}
          />
          <Field
            label="Insurance expiry"
            value={form.insurance === 'Not set' ? '' : form.insurance}
            onChangeText={(insurance) => setForm({ ...form, insurance: insurance.trim() || 'Not set' })}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            error={insuranceError}
          />
          <Field
            label="Last service"
            value={form.service === 'Not set' ? '' : form.service}
            onChangeText={(service) => setForm({ ...form, service: service || 'Not set' })}
            placeholder={today}
          />
          <View style={{ height: 12 }} />
          <Button label="Save" disabled={!!pucError || !!insuranceError} onPress={() => onSave(form)} />
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
