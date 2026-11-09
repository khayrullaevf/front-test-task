import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@/shared/lib/dataset';
import { readStore, writeStore } from '@/shared/lib/storage';

/** Ustun sozlamalari (tartib, ko'rinish, kenglik) — localStorage'da, har sahifa uchun alohida. */
interface ColumnPrefs {
  order: string[];
  visibility: Record<string, boolean>;
  widths: Record<string, number>;
}
const EMPTY: ColumnPrefs = { order: [], visibility: {}, widths: {} };

export const DEFAULT_WIDTH: Record<ColumnDef['type'], number> = {
  text: 160,
  number: 110,
  date: 130,
  enum: 130,
  array: 200,
  boolean: 100,
};

export const MIN_WIDTH = 56;
export const MAX_WIDTH = 640;

export function useColumnPrefs(pageId: string, columns: ColumnDef[]) {
  const key = `crm-grid:${pageId}:v1`;
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => ({ ...EMPTY, ...readStore(key, EMPTY) }));
  useEffect(() => writeStore(key, prefs), [key, prefs]);

  const ordered = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    const result = prefs.order.filter((id) => byId.has(id));
    // Saqlangan tartibdan keyin paydo bo'lgan ustun (masalan, ma'lumotdagi yangi maydon) —
    // konfiguratsiyadagi qo'shnisidan keyin joylashadi, foydalanuvchi tartibi buzilmaydi.
    columns.forEach((c, idx) => {
      if (result.includes(c.id)) return;
      const prev = columns
        .slice(0, idx)
        .reverse()
        .find((p) => result.includes(p.id));
      result.splice(prev ? result.indexOf(prev.id) + 1 : 0, 0, c.id);
    });
    return result.map((id) => byId.get(id)!);
  }, [columns, prefs.order]);

  const isVisible = useCallback((c: ColumnDef) => prefs.visibility[c.id] ?? !c.hidden, [prefs.visibility]);
  const visible = useMemo(() => ordered.filter(isVisible), [ordered, isVisible]);
  const widthOf = useCallback(
    (c: ColumnDef) => prefs.widths[c.id] ?? c.width ?? DEFAULT_WIDTH[c.type],
    [prefs.widths],
  );

  const setVisible = useCallback(
    (id: string, v: boolean) => setPrefs((p) => ({ ...p, visibility: { ...p.visibility, [id]: v } })),
    [],
  );
  const setAllVisible = useCallback(
    (v: boolean) =>
      // Hech bo'lmasa bitta ustun ko'rinib turishi kerak
      setPrefs((p) => ({ ...p, visibility: Object.fromEntries(ordered.map((c, i) => [c.id, v || i === 0])) })),
    [ordered],
  );
  const setWidth = useCallback(
    (id: string, w: number) =>
      setPrefs((p) => ({ ...p, widths: { ...p.widths, [id]: Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))) } })),
    [],
  );
  const move = useCallback(
    (fromId: string, toId: string) =>
      setPrefs((p) => {
        const ids = ordered.map((c) => c.id);
        const from = ids.indexOf(fromId);
        const to = ids.indexOf(toId);
        if (from < 0 || to < 0 || from === to) return p;
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        return { ...p, order: ids };
      }),
    [ordered],
  );
  const reset = useCallback(() => setPrefs(EMPTY), []);

  return {
    ordered,
    visible,
    isVisible,
    widthOf,
    setVisible,
    setAllVisible,
    setWidth,
    move,
    reset,
    customized: prefs.order.length > 0 || Object.keys(prefs.visibility).length > 0 || Object.keys(prefs.widths).length > 0,
  };
}

export type ColumnPrefsApi = ReturnType<typeof useColumnPrefs>;
