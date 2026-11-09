import { useCallback, useEffect, useState } from 'react';
import { buildDataset, type Dataset, type PageConfig } from '@/shared/lib/dataset';

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; detail?: string }
  | { status: 'ready'; ds: Dataset; loadedAt: number };

const cache = new Map<string, Promise<{ ds: Dataset; loadedAt: number }>>();

async function load(config: PageConfig) {
  const url = `${import.meta.env.BASE_URL}data/${config.file}`;
  let res: Response;
  try {
    // no-store: JSON faylni almashtirib, "Yangilash"ni bossa — darhol yangi ma'lumot
    res = await fetch(url, { cache: 'no-store' });
  } catch (e) {
    throw new LoadError("Faylni yuklab bo'lmadi", (e as Error).message);
  }
  if (!res.ok) throw new LoadError(`Fayl topilmadi yoki o'qib bo'lmadi (HTTP ${res.status})`, url);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new LoadError('Fayl JSON formatida emas', `${(e as Error).message}\n\n${text.slice(0, 400)}`);
  }
  try {
    return { ds: buildDataset(json, config), loadedAt: Date.now() };
  } catch (e) {
    throw new LoadError((e as Error).message, text.slice(0, 400));
  }
}

class LoadError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
  }
}

function getDataset(config: PageConfig, force = false) {
  if (force || !cache.has(config.id)) {
    const p = load(config);
    cache.set(config.id, p);
    p.catch(() => cache.delete(config.id));
  }
  return cache.get(config.id)!;
}

export function useDataset(config: PageConfig) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => (s.status === 'ready' && version > 0 ? s : { status: 'loading' }));
    getDataset(config, version > 0).then(
      (r) => alive && setState({ status: 'ready', ...r }),
      (e: LoadError) => alive && setState({ status: 'error', message: e.message, detail: e.detail }),
    );
    return () => {
      alive = false;
    };
  }, [config, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { state, reload };
}
