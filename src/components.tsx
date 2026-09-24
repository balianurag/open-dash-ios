import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOpenDash } from './store';
import type { Palette } from './theme';

export function Screen({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { palette } = useOpenDash();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: palette.text }]}>{title}</Text>
        {action}
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { palette } = useOpenDash();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  const { palette } = useOpenDash();
  return <Text style={[styles.eyebrow, { color: palette.textLo }]}>{children.toUpperCase()}</Text>;
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  const { palette } = useOpenDash();
  const bg =
    variant === 'primary' ? palette.accent : variant === 'secondary' ? palette.surfaceHigh : 'transparent';
  const color = variant === 'primary' ? palette.onAccent : palette.text;
  const border = variant === 'ghost' ? palette.line : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
      <Text style={[styles.btnLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { palette } = useOpenDash();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? palette.accent : palette.surfaceHigh,
          borderColor: active ? palette.accent : palette.line,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: active ? palette.onAccent : palette.textMid }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: { label: string; error?: string } & TextInputProps) {
  const { palette } = useOpenDash();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: palette.textLo }]}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textLo}
        style={[
          styles.input,
          {
            color: palette.text,
            backgroundColor: palette.surfaceHigh,
            borderColor: error ? palette.alert : palette.line,
          },
        ]}
        {...props}
      />
      {error ? <Text style={[styles.fieldError, { color: palette.alert }]}>{error}</Text> : null}
    </View>
  );
}

export function Divider() {
  const { palette } = useOpenDash();
  return <View style={[styles.divider, { backgroundColor: palette.line }]} />;
}

export function ToneDot({ tone, palette }: { tone: 'ok' | 'warn' | 'alert'; palette: Palette }) {
  const color = tone === 'alert' ? palette.alert : tone === 'warn' ? palette.warn : palette.ok;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function LoadingScreen() {
  const { palette } = useOpenDash();
  return (
    <View style={[styles.flex, styles.center, { backgroundColor: palette.bg }]}>
      <ActivityIndicator color={palette.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 24, gap: 14 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '600',
    marginBottom: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  btnLabel: { fontSize: 14, fontWeight: '600' },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  field: { gap: 6, marginTop: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  fieldError: { fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
