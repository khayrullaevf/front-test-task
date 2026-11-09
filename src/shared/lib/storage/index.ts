import { useEffect, useState } from 'react';

/** Xavfsiz localStorage: private rejimda yoki bloklanganda ham ilova ishlashda davom etadi. */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* saqlab bo'lmadi — kritik emas */
  }
}

export function usePersistentState<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => readStore(key, init));
  useEffect(() => writeStore(key, v), [key, v]);
  return [v, setV] as const;
}

/* Sahifalar orasida o'tganda har sahifaning qidiruv/filtr holati saqlanib qoladi (sessiya davomida). */
const lastQueryKey = (pageId: string) => `last-query:${pageId}`;

export function rememberQuery(pageId: string, search: string) {
  try {
    sessionStorage.setItem(lastQueryKey(pageId), search);
  } catch {
    /* ignore */
  }
}

export function lastQueryFor(pageId: string): string {
  try {
    const s = sessionStorage.getItem(lastQueryKey(pageId));
    return s ? `?${s}` : '';
  } catch {
    return '';
  }
}
