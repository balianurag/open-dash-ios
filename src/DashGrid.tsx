import React, { useEffect, useMemo, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import {
  estimateRange,
  nextService,
  packRows,
  TILE_META,
  tankLitresFor,
  tileView,
  type DashContext,
  type DashTile,
  type TileView,
} from './dashboard';
import { useOpenDash } from './store';
import type { Palette } from './theme';

export type DashColors = {
  bg: string;
  tile: string;
  border: string;
  value: string;
  speed: string;
  label: string;
  caption: string;
  ok: string;
  warn: string;
  alert: string;
};

export function dashColors(p: Palette, night: boolean): DashColors {
  if (!night) {
    return {
      bg: p.bg,
      tile: p.surface,
      border: p.line,
      value: p.text,
      speed: p.accentBright,
      label: p.textMid,
      caption: p.textLo,
      ok: p.ok,
      warn: p.warn,
      alert: p.alert,
    };
  }
  return {
    bg: '#000000',
    tile: '#000000',
    border: p.isLight ? '#4A4A4A' : p.line,
    value: '#FFFFFF',
    speed: p.isLight ? '#FFFFFF' : p.accentBright,
    label: '#E4E4E4',
    caption: '#BDBDBD',
    ok: '#5EE0A0',
    warn: '#FFC857',
    alert: '#FF6B6B',
  };
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useGarageContext(riddenKm: number): Pick<DashContext, 'odometerKm' | 'range' | 'service' | 'vehicle'> {
  const { odometerKm, avgKmplLast5, fuel, maint, activeVehicle, settings } = useOpenDash();
  const tankLitres = tankLitresFor(settings.dashboard, activeVehicle.id);
  const lastFillOdoKm = fuel[0]?.odometerKm ?? null;
  return useMemo(
    () => ({
      odometerKm,
      range: estimateRange({ tankLitres, kmpl: avgKmplLast5, odometerKm, lastFillOdoKm, riddenKm }),
      service: nextService(maint),
      vehicle: activeVehicle,
    }),
    [odometerKm, tankLitres, avgKmplLast5, lastFillOdoKm, riddenKm, maint, activeVehicle],
  );
}

const PAD = 12;
const UNIT_RATIO = 0.3;
const CHAR_EM = 0.62;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function Tile({ tile, view, colors, night }: { tile: DashTile; view: TileView; colors: DashColors; night: boolean }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
  };

  const boost = night ? 1.15 : 1;
  const showCaption = !!view.caption && (!night || view.tone === 'warn' || view.tone === 'alert');
  const labelSize = clamp(box.h * 0.1, 11, 17) * boost;
  const captionSize = clamp(box.h * 0.08, 10, 15) * boost;
  const reserved = PAD * 2 + labelSize * 1.4 + (showCaption ? captionSize * 2.7 : 0);
  const unitChars = view.unit ? view.unit.length + 1 : 0;
  const byHeight = (box.h - reserved) / 1.2;
  const byWidth = (box.w - PAD * 2) / ((view.value.length + unitChars * UNIT_RATIO) * CHAR_EM);
  const valueSize = clamp(Math.min(byHeight, byWidth), 14, 240);
  const unitSize = Math.max(labelSize, valueSize * UNIT_RATIO);

  const toneColor = view.tone ? colors[view.tone] : null;
  const valueColor = view.dim ? colors.caption : toneColor ?? (tile.kind === 'speed' ? colors.speed : colors.value);
  const borderColor = view.tone === 'warn' || view.tone === 'alert' ? colors[view.tone] : colors.border;
  const meta = TILE_META[tile.kind];

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel={`${meta.label}: ${view.value}${view.unit ? ` ${view.unit}` : ''}${view.caption ? `. ${view.caption}` : ''}`}
      style={{
        flex: 1,
        backgroundColor: colors.tile,
        borderColor,
        borderWidth: night ? 2 : 1,
        borderRadius: 20,
        padding: PAD,
        overflow: 'hidden',
      }}
    >
      <Text
        numberOfLines={1}
        style={{ color: colors.label, fontSize: labelSize, fontWeight: night ? '800' : '700', letterSpacing: 1 }}
      >
        {meta.label.toUpperCase()}
      </Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={{
            color: valueColor,
            fontSize: valueSize,
            fontWeight: night ? '800' : '700',
            fontVariant: ['tabular-nums'],
            letterSpacing: valueSize > 60 ? -2 : -0.5,
          }}
        >
          {view.value}
          {view.unit ? (
            <Text style={{ fontSize: unitSize, fontWeight: '700', color: colors.label, letterSpacing: 0 }}>
              {` ${view.unit}`}
            </Text>
          ) : null}
        </Text>
      </View>
      {showCaption ? (
        <Text numberOfLines={2} style={{ color: toneColor ?? colors.caption, fontSize: captionSize, fontWeight: '600' }}>
          {view.caption}
        </Text>
      ) : null}
    </View>
  );
}

export function DashGrid({
  tiles,
  ctx,
  colors,
  night,
  gap = 8,
}: {
  tiles: DashTile[];
  ctx: DashContext;
  colors: DashColors;
  night: boolean;
  gap?: number;
}) {
  const rows = packRows(tiles);
  if (!rows.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.label, fontSize: 16, textAlign: 'center', lineHeight: 22 }}>
          This layout has no tiles. Add some in the Dashboard tab.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, gap }}>
      {rows.map((row) => (
        <View key={row.tiles.map((t) => t.kind).join('+')} style={{ flex: row.weight, flexDirection: 'row', gap }}>
          {row.tiles.map((tile) => (
            <Tile key={tile.kind} tile={tile} view={tileView(tile.kind, ctx)} colors={colors} night={night} />
          ))}
        </View>
      ))}
    </View>
  );
}
