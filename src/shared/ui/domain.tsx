import { COUNTRIES } from '@/shared/config';
import { formatPhone } from '@/shared/lib/dataset';

export function Phone({ value }: { value: string }) {
  return (
    <a className="phone" href={`tel:${value.replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()}>
      {formatPhone(value)}
    </a>
  );
}

export function Plate({ value }: { value: string }) {
  return <span className="plate">{value}</span>;
}

export function Place({ city, country }: { city: string; country?: unknown }) {
  return (
    <span className="place">
      {city}
      {typeof country === 'string' && country && (
        <span className="country" title={COUNTRIES[country]?.label ?? country}>
          {country}
        </span>
      )}
    </span>
  );
}
