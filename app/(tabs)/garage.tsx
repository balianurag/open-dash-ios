import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { Button, Card, Divider, Eyebrow, Field, Screen, ToneDot } from '@/src/components';
import { formatDate, formatKm } from '@/src/format';
import { iconForKey } from '@/src/maintenance';
import type { MaintRow } from '@/src/models';
import { useOpenDash } from '@/src/store';

export default function GarageScreen() {
  const dash = useOpenDash();
  const { palette, activeVehicle, odometerKm, avgKmplLast5, maint } = dash;
  const [showOdo, setShowOdo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<MaintRow | null>(null);
  const [odo, setOdo] = useState(String(odometerKm));
  const [name, setName] = useState('');
  const [interval, setInterval] = useState('');

  return (
    <Screen title="Garage">
      <Card>
        <Eyebrow>Active vehicle</Eyebrow>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{activeVehicle.title}</Text>
        <Text style={{ color: palette.textMid, marginTop: 2 }}>{formatKm(odometerKm)} on odometer</Text>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: palette.surfaceHigh,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="speedometer-outline" size={24} color={palette.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.textLo }}>Latest odometer reading</Text>
            <Text style={{ color: palette.accent, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {formatKm(odometerKm)}
            </Text>
          </View>
          <Pressable onPress={() => { setOdo(String(odometerKm)); setShowOdo(true); }}>
            <Ionicons name="create-outline" size={20} color={palette.textMid} />
          </Pressable>
        </View>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: palette.surfaceHigh,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="water-outline" size={24} color={palette.accent} />
          </View>
          <View>
            <Text style={{ color: palette.textLo }}>Avg. mileage of last 5 fuel-ups</Text>
            <Text style={{ color: palette.accent, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {avgKmplLast5 != null ? `${avgKmplLast5.toFixed(2)} km/l` : 'Not enough fuel data'}
            </Text>
          </View>
        </View>
      </Card>
      <View>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>Spare parts</Text>
        <Text style={{ color: palette.textMid, marginTop: 2, marginBottom: 8 }}>
          Condition and service distance for {activeVehicle.title}
        </Text>
      </View>
      <Card>
        <Eyebrow>Service intervals</Eyebrow>
        {maint.length === 0 ? (
          <Text style={{ color: palette.textMid }}>No intervals yet — add one below.</Text>
        ) : (
          maint.map((row, i) => (
            <Pressable key={row.item.sid} onPress={() => setSelected(row)}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
                <Ionicons name={iconForKey(row.item.iconKey) as never} size={20} color={palette.textMid} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: '600' }}>{row.item.name}</Text>
                  <Text style={{ color: palette.textLo, marginTop: 2 }}>
                    {row.tone === 'alert'
                      ? 'Overdue'
                      : `${row.official?.action ?? 'Service'} in ${Math.max(0, row.remainingKm).toLocaleString('en-IN')} km`}
                  </Text>
                </View>
                <ToneDot tone={row.tone} palette={palette} />
              </View>
            </Pressable>
          ))
        )}
      </Card>
      <Button label="Add interval" variant="secondary" icon="add" onPress={() => setShowAdd(true)} />

      <Modal visible={showOdo} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>Set odometer</Text>
            <Field label="Kilometres" value={odo} onChangeText={setOdo} keyboardType="number-pad" />
            <View style={{ height: 12 }} />
            <Button label="Save" onPress={async () => {
              const km = Number(odo);
              if (!Number.isFinite(km) || km < 0) return Alert.alert('Enter kilometres');
              await dash.setOdometer(Math.round(km));
              setShowOdo(false);
            }} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowOdo(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showAdd} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>Add interval</Text>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Spark plugs" />
            <Field label="Interval (km)" value={interval} onChangeText={setInterval} keyboardType="number-pad" />
            <View style={{ height: 12 }} />
            <Button label="Add" onPress={async () => {
              const km = Number(interval);
              if (!name.trim() || !Number.isFinite(km) || km <= 0) return Alert.alert('Name and interval required');
              await dash.addMaintenance(name.trim(), 'wrench', Math.round(km));
              setName('');
              setInterval('');
              setShowAdd(false);
            }} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowAdd(false)} />
          </View>
        </View>
      </Modal>

      {selected ? (
        <Modal visible transparent animationType="fade">
          <Pressable style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }} onPress={() => setSelected(null)}>
            <View style={{ backgroundColor: palette.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 }}>
              <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>{selected.item.name}</Text>
              <Text style={{ color: palette.textMid }}>Every {selected.item.intervalKm.toLocaleString('en-IN')} km</Text>
              <Text style={{ color: palette.textLo }}>Last done at {formatKm(selected.item.lastDoneOdoKm)} · {formatDate(selected.item.lastDoneDateMs)}</Text>
              {selected.official ? (
                <Card>
                  <Eyebrow>Himalayan 450 manual</Eyebrow>
                  <Text style={{ color: palette.text }}>{selected.official.guidance}</Text>
                  <Text style={{ color: palette.textLo, marginTop: 8 }}>{selected.official.manualPages}</Text>
                </Card>
              ) : null}
              <Button label="Log service now" onPress={async () => {
                await dash.logService(selected.item, odometerKm, selected.item.intervalKm);
                setSelected(null);
              }} />
              <Button label="Delete interval" variant="ghost" onPress={() => {
                Alert.alert('Delete this interval?', selected.item.name, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => {
                    await dash.deleteMaintenance(selected.item.sid);
                    setSelected(null);
                  }},
                ]);
              }} />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </Screen>
  );
}
