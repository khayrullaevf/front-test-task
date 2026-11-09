import { useState } from 'react';
import type { Dataset, PageConfig } from '@/shared/lib/dataset';
import { Icon } from '@/shared/ui';

interface Notice {
  id: string;
  tone: 'info' | 'warn';
  text: string;
}

/**
 * Fayl tuzilishi o'zgarganini foydalanuvchiga ochiq aytamiz — jim "yutib yuborish" o'rniga.
 * Dispetcher "nega bu ustun bo'sh?" deb hayron bo'lmaydi, dasturchi esa nimani yangilash kerakligini darhol ko'radi.
 */
export function Notices({ ds, config }: { ds: Dataset; config: PageConfig }) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const titles = (ids: string[]) => ids.map((id) => ds.columns.find((c) => c.id === id)?.title ?? id).join(', ');

  const list: Notice[] = [];
  if (ds.meta.pathFallback) {
    list.push({
      id: 'path',
      tone: 'warn',
      text: `Yozuvlar kutilgan joyda ("${config.recordsPath || 'root'}") topilmadi va "${ds.meta.recordsPath || 'root'}" dan o'qildi. Fayl tuzilishi o'zgargan bo'lishi mumkin.`,
    });
  }
  if (ds.meta.declaredTotal !== undefined && ds.meta.declaredTotal !== ds.rows.length) {
    list.push({
      id: 'total',
      tone: 'warn',
      text: `Faylda jami ${ds.meta.declaredTotal} ta yozuv deb ko'rsatilgan, lekin ${ds.rows.length} ta keldi.`,
    });
  }
  if (ds.meta.missingColumns.length) {
    list.push({
      id: 'missing',
      tone: 'warn',
      text: `Ma'lumotda topilmagan ustunlar: ${titles(ds.meta.missingColumns)}. Fayl tuzilishi o'zgargan bo'lishi mumkin — yangi maydonlar jadvalga avtomatik qo'shiladi.`,
    });
  }
  if (ds.meta.autoColumns.length) {
    list.push({
      id: 'auto',
      tone: 'info',
      text: `Faylda tavsiflanmagan ${ds.meta.autoColumns.length} ta maydon topildi va jadvalga "yangi" belgisi bilan qo'shildi: ${titles(ds.meta.autoColumns)}.`,
    });
  }

  const visible = list.filter((n) => !closed.has(n.id));
  if (!visible.length) return null;
  return (
    <div className="notices">
      {visible.map((n) => (
        <div key={n.id} className={`notice notice-${n.tone}`} role="status">
          <Icon name={n.tone === 'warn' ? 'warning' : 'info'} />
          <span>{n.text}</span>
          <button className="icon-btn icon-btn-sm" onClick={() => setClosed((s) => new Set(s).add(n.id))} aria-label="Yopish">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
