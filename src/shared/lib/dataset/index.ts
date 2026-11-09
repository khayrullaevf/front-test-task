/**
 * Ma'lumotni jadvalga tayyorlash yadrosi: UI'ga bog'liq emas, sof funksiyalar, to'liq testlangan.
 * JSON → yozuvlar massivi → flatten → ustunlar (ma'lum + avtomatik) → Cell'lar → filtr/saralash.
 */
export * from './types';
export * from './parse';
export * from './format';
export { extractRecords, flatten, collectPaths, getPath, isPlainObject } from './extract';
export { buildDataset, makeCell, inferType, DatasetError } from './normalize';
export * from './query';
