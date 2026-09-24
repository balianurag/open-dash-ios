import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card, Chip, Divider, Eyebrow, Field, Screen } from '@/src/components';
import { buildExpensesCsv, buildExpensesHtml, parseCsv } from '@/src/csv';
import { formatDate, formatMoney } from '@/src/format';
import { EXPENSE_CATEGORIES, type Expense } from '@/src/models';
import { useOpenDash } from '@/src/store';

type Period = { label: string; startMs: number | null; endMs: number | null };

function periods(): Period[] {
  const now = new Date();
  const year = now.getFullYear();
  const months: Period[] = [{ label: 'All time', startMs: null, endMs: null }];
  for (let month = 0; month < 12; month++) {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    months.push({
      label: new Date(year, month, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      startMs: start,
      endMs: end,
    });
  }
  return months;
}

export default function ExpensesScreen() {
  const dash = useOpenDash();
  const { palette, expenses, settings, activeVehicle } = dash;
  const allPeriods = useMemo(periods, []);
  const [category, setCategory] = useState('All Expenses');
  const [period, setPeriod] = useState(allPeriods[0]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Expense | null>(null);

  const shown = expenses.filter((e) => {
    const inPeriod =
      (period.startMs == null || e.dateMs >= period.startMs) &&
      (period.endMs == null || e.dateMs < period.endMs);
    const inCat = category === 'All Expenses' || e.category === category;
    return inPeriod && inCat;
  });
  const total = shown.reduce((sum, e) => sum + e.amount, 0);

  async function exportCsv() {
    const csv = buildExpensesCsv(shown, settings.currency);
    const file = new File(Paths.cache, `opendash-expenses-${period.label.replace(/\s+/g, '-').toLowerCase()}.csv`);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
  }

  async function exportDoc() {
    const html = buildExpensesHtml(shown, period.label, formatMoney(total, settings.currency, 2));
    const file = new File(Paths.cache, `opendash-expenses-${period.label.replace(/\s+/g, '-').toLowerCase()}.doc`);
    if (file.exists) file.delete();
    file.create();
    file.write(html);
    await Sharing.shareAsync(file.uri);
  }

  async function importCsv() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/plain', 'text/*'] });
    if (result.canceled || !result.assets[0]) return;
    const picked = new File(result.assets[0].uri);
    const text = await picked.text();
    const rows = parseCsv(text);
    if (!rows.length) return Alert.alert('No expenses found', 'The CSV did not contain valid amount rows.');
    const count = await dash.importExpenses(rows);
    Alert.alert('Imported', `Added ${count} expense${count === 1 ? '' : 's'}.`);
  }

  return (
    <Screen
      title="My Expenses"
      action={
        <Pressable onPress={() => setAdding(true)}>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>Add</Text>
        </Pressable>
      }
    >
      <Card>
        <Eyebrow>Total</Eyebrow>
        <Text style={{ color: palette.accent, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {formatMoney(total, settings.currency)}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
          {allPeriods.map((p) => (
            <Chip key={p.label} label={p.label} active={p.label === period.label} onPress={() => setPeriod(p)} />
          ))}
        </ScrollView>
      </Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {['All Expenses', ...EXPENSE_CATEGORIES].map((c) => (
          <Chip key={c} label={c} active={c === category} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="Import CSV" variant="secondary" icon="download-outline" onPress={importCsv} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Export" variant="secondary" icon="share-outline" disabled={!shown.length} onPress={() => {
            Alert.alert('Export ' + period.label, undefined, [
              { text: 'CSV', onPress: exportCsv },
              { text: 'Document', onPress: exportDoc },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }} />
        </View>
      </View>
      <Card>
        {shown.length === 0 ? (
          <Text style={{ color: palette.textMid }}>No expenses in this period. Log fuel or a shop bill to start.</Text>
        ) : (
          shown.map((e, i) => (
            <Pressable key={e.sid} onPress={() => setSelected(e)}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontWeight: '700' }}>{e.category}</Text>
                  <Text style={{ color: palette.textLo, marginTop: 3 }}>{formatDate(e.dateMs)}</Text>
                  {e.note ? (
                    <Text style={{ color: palette.textMid, marginTop: 4 }} numberOfLines={2}>
                      {e.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: palette.accent, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {formatMoney(e.amount, settings.currency)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Card>
      <ExpenseEditor
        visible={adding}
        vehicleName={activeVehicle.title}
        currency={settings.currency}
        onClose={() => setAdding(false)}
        onSave={async (payload) => {
          await dash.addExpense(payload);
          setAdding(false);
        }}
      />
      {selected ? (
        <Modal visible transparent animationType="fade">
          <Pressable style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }} onPress={() => setSelected(null)}>
            <View style={{ backgroundColor: palette.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 }}>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{selected.category}</Text>
              <Text style={{ color: palette.textMid }}>
                {formatMoney(selected.amount, settings.currency)} · {formatDate(selected.dateMs)}
              </Text>
              <Button label="Duplicate entry" variant="secondary" icon="copy-outline" onPress={async () => {
                await dash.duplicateExpense(selected);
                setSelected(null);
              }} />
              <Button label="Delete entry" variant="ghost" icon="trash-outline" onPress={() => {
                Alert.alert('Delete expense?', selected.category, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => {
                    await dash.deleteExpense(selected.sid);
                    setSelected(null);
                  }},
                ]);
              }} />
              <Button label="Close" variant="secondary" onPress={() => setSelected(null)} />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </Screen>
  );
}

function ExpenseEditor({
  visible,
  vehicleName,
  currency,
  onClose,
  onSave,
}: {
  visible: boolean;
  vehicleName: string;
  currency: string;
  onClose: () => void;
  onSave: (payload: {
    category: string;
    amount: number;
    note: string;
    litres?: number;
    odometerKm?: number;
    location?: string;
  }) => Promise<void>;
}) {
  const { palette } = useOpenDash();
  const [category, setCategory] = useState('Fuel');
  const [amount, setAmount] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelQty, setFuelQty] = useState('');
  const [distance, setDistance] = useState('');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [description, setDescription] = useState('');
  const [fullTank, setFullTank] = useState(true);

  function reset() {
    setAmount('');
    setOdometer('');
    setFuelQty('');
    setDistance('');
    setPrice('');
    setStore('');
    setDescription('');
    setFullTank(true);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <Screen title="Add expense" action={<Pressable onPress={onClose}><Text style={{ color: palette.textMid }}>Close</Text></Pressable>}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={c === category} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
        {category === 'Fuel' ? (
          <Card>
            <Eyebrow>Motorcycle</Eyebrow>
            <Text style={{ color: palette.text, fontWeight: '700' }}>{vehicleName}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Chip label="Full tank" active={fullTank} onPress={() => setFullTank(true)} />
              <Chip label="Partial tank" active={!fullTank} onPress={() => setFullTank(false)} />
            </View>
            <Field label="Odometer (km)" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" />
            <Field label="Fuel quantity (L)" value={fuelQty} onChangeText={setFuelQty} keyboardType="decimal-pad" />
            <Field label="Distance covered (km)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
            <Field label={`Fuel price/L (${currency})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <Field label="Fuel station (optional)" value={store} onChangeText={setStore} />
          </Card>
        ) : (
          <Field label="Store / shop (optional)" value={store} onChangeText={setStore} />
        )}
        <Field label={`Amount (${currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Field label="Description (optional)" value={description} onChangeText={setDescription} />
        <Button
          label="Save expense"
          onPress={async () => {
            const value = Number(amount);
            if (!Number.isFinite(value) || value <= 0) return Alert.alert('Amount required', 'Enter a valid amount.');
            const now = new Date();
            const stamp = now.toLocaleString('en-IN');
            const noteParts = [stamp];
            if (category === 'Fuel') {
              noteParts.push(`Vehicle: ${vehicleName}`);
              if (odometer) noteParts.push(`Odometer: ${odometer} km`);
              if (distance) noteParts.push(`Distance covered: ${distance} km`);
              if (fuelQty) noteParts.push(`Fuel: ${fuelQty} L`);
              if (price) noteParts.push(`Fuel price/L: ${price}`);
              noteParts.push(fullTank ? 'Full tank' : 'Partial tank');
            }
            if (store) noteParts.push(`Store: ${store}`);
            if (description) noteParts.push(description);
            await onSave({
              category,
              amount: value,
              note: noteParts.join(' · '),
              litres: category === 'Fuel' ? Number(fuelQty) || undefined : undefined,
              odometerKm: category === 'Fuel' ? Number(odometer) || undefined : undefined,
              location: store,
            });
            reset();
          }}
        />
      </Screen>
    </Modal>
  );
}
