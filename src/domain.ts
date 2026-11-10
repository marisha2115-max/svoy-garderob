import {validPhotoReport,type PhotoReport} from './photo-report';import {validCropRect,type CropRect} from './crop';
import {categoryFromType} from './item-category';
export const categories = { top: 'Верх', bottom: 'Низ', dress: 'Платье', outer: 'Верхняя одежда', shoes: 'Обувь', accessory: 'Аксессуар', unknown: 'Без категории' } as const;
export type Category = keyof typeof categories;
export const seasons = { all: 'Все сезоны', spring: 'Весна', summer: 'Лето', autumn: 'Осень', winter: 'Зима' } as const;
export type Protection = 'yes' | 'no' | 'unknown';
export const clothingStyles = { casual: 'Повседневная', business: 'Деловая', smart: 'Нарядная', sport: 'Спортивная' } as const;
export type ClothingStyle = keyof typeof clothingStyles;
export interface Item {
  id: string; name: string; category: Category; color: string; season: (keyof typeof seasons)[];
  warmth: 'light' | 'medium' | 'warm'; rain: Protection; wind: Protection; heel: Protection;
  demo: boolean; createdAt: string;
  styles?: ClothingStyle[];
  analysisStatus?: 'waiting' | 'done' | 'error';
  metadataRevision?: number;
  photoRevision?: number;
  originalPhotoRevision?: number;
  backgroundStatus?: 'waiting' | 'done' | 'original';
  subcategory?: string;
  categoryManual?:boolean;
  cutoutApproved?:boolean;
  backgroundFailed?:boolean;
  backgroundReport?:PhotoReport;
  cropRect?:CropRect;
  cutoutRevision?:number;
  photoPreference?:'crop'|'original';
}
export interface Conditions {
  temperature: number; rain: boolean; wind: 'calm' | 'moderate' | 'strong';
  location: 'outside' | 'inside'; occasion: string; wishes: string; style: string;
  pinnedId: string; noHeels: boolean; walking: boolean;
  useWeather?: boolean; styleTag?: ClothingStyle | '';
}
export interface Outfit {
  id: string; itemIds: string[]; title: string; explanation: string; mode: 'rules' | 'ai' | 'manual';
  conditions: Conditions; createdAt: string;
  itemSnapshots?: Item[];
  viewMode?:'photos'|'silhouettes';
  layout?: Record<string,{x:number;y:number;width:number;height:number}>;
  season?: keyof typeof seasons;
}
export interface SelectionResult { outfits: Outfit[]; warnings: string[]; missing: string[]; ignoredItemIds?:string[] }
export const defaultConditions: Conditions = { temperature: 8, rain: false, wind: 'moderate', location: 'outside', occasion: '', wishes: '', style: '', pinnedId: '', noHeels: false, walking: false, useWeather: true, styleTag: '' };
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export function sanitizePhotoMetadata(value: unknown): Pick<Item, 'name' | 'category' | 'color' | 'season' | 'warmth' | 'heel' | 'rain' | 'wind' | 'styles'> {
  if (!record(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100 || typeof value.category !== 'string' || !Object.hasOwn(categories, value.category) || typeof value.color !== 'string' || !value.color.trim() || value.color.length > 50) throw new Error('AI не смог определить описание вещи. Исходное фото сохранено.');
  const name = value.name.trim();
  const category = categoryFromType(name,value.category as Category);
  const color = value.color.trim().replace(/\s+/g, ' ');
  const canonical = new Map([['черный', 'Чёрный'], ['чёрный', 'Чёрный'], ['белый', 'Белый'], ['синий', 'Синий'], ['темно-синий', 'Тёмно-синий'], ['тёмно-синий', 'Тёмно-синий'], ['коричневый', 'Коричневый'], ['бежевый', 'Бежевый'], ['серый', 'Серый'], ['оранжевый', 'Оранжевый']]);
  return { name, category, color: canonical.get(color.toLowerCase()) ?? color, season: ['all'], warmth: typeof value.warmth === 'string' && ['light', 'medium', 'warm'].includes(value.warmth) ? value.warmth as Item['warmth'] : 'medium', heel: category === 'shoes' && typeof value.heel === 'string' && ['yes', 'no', 'unknown'].includes(value.heel) ? value.heel as Protection : 'unknown', rain: 'unknown', wind: 'unknown', styles: Array.isArray(value.styles) ? value.styles.filter((s): s is ClothingStyle => typeof s === 'string' && Object.hasOwn(clothingStyles, s)) : [] };
}
export function validateItem(value: unknown): string[] {
  if (!record(value)) return ['Некорректная вещь'];
  const errors: string[] = [];
  for (const key of ['id', 'name', 'color', 'createdAt']) if (typeof value[key] !== 'string' || !(value[key] as string).trim() || (value[key] as string).length > 150) errors.push(`Проверьте поле ${key}`);
  if (typeof value.category !== 'string' || !Object.hasOwn(categories, value.category)) errors.push('Выберите категорию');
  if (!Array.isArray(value.season) || !value.season.length || !value.season.every(s => typeof s === 'string' && Object.hasOwn(seasons, s))) errors.push('Выберите сезон');
  if (typeof value.warmth !== 'string' || !['light', 'medium', 'warm'].includes(value.warmth)) errors.push('Укажите теплоту');
  for (const key of ['rain', 'wind', 'heel']) if (typeof value[key] !== 'string' || !['yes', 'no', 'unknown'].includes(value[key] as string)) errors.push(`Укажите свойство ${key}`);
  if (typeof value.demo !== 'boolean') errors.push('Некорректный тип вещи');
  if(value.cutoutRevision!==undefined&&(!Number.isSafeInteger(value.cutoutRevision)||typeof value.cutoutRevision!=='number'||value.cutoutRevision<0))errors.push('Некорректная версия вырезки');
  if(value.photoPreference!==undefined&&!['crop','original'].includes(value.photoPreference as string))errors.push('Некорректный выбор фото');
  if(value.backgroundFailed!==undefined&&typeof value.backgroundFailed!=='boolean')errors.push('Некорректный статус фона');
  if(value.backgroundReport!==undefined&&!validPhotoReport(value.backgroundReport))errors.push('Некорректная оценка фона');
  if(value.cropRect!==undefined&&!validCropRect(value.cropRect))errors.push('Некорректная рамка');
  if(value.cutoutApproved!==undefined&&typeof value.cutoutApproved!=='boolean')errors.push('Некорректное подтверждение фото');
  if(value.categoryManual!==undefined&&typeof value.categoryManual!=='boolean')errors.push('Некорректный выбор категории');
  if (value.metadataRevision !== undefined && (typeof value.metadataRevision !== 'number' || !Number.isSafeInteger(value.metadataRevision) || value.metadataRevision < 0)) errors.push('Некорректная версия описания');
  if (value.photoRevision !== undefined && (typeof value.photoRevision !== 'number' || !Number.isSafeInteger(value.photoRevision) || value.photoRevision < 0)) errors.push('Некорректная версия фотографии');
  if (value.originalPhotoRevision !== undefined && (typeof value.originalPhotoRevision !== 'number' || !Number.isSafeInteger(value.originalPhotoRevision) || value.originalPhotoRevision < 0 || value.originalPhotoRevision > (typeof value.photoRevision==='number'?value.photoRevision:0))) errors.push('Некорректная версия оригинала');
  if (value.styles !== undefined && (!Array.isArray(value.styles) || !value.styles.every(s => typeof s === 'string' && Object.hasOwn(clothingStyles, s)))) errors.push('Проверьте назначение вещи');
  if(value.subcategory!==undefined&&(typeof value.subcategory!=='string'||!value.subcategory.trim()||value.subcategory.length>100))errors.push('Проверьте тип вещи');
  if(value.backgroundStatus!==undefined&&(typeof value.backgroundStatus!=='string'||!['waiting','done','original'].includes(value.backgroundStatus)))errors.push('Некорректный статус фото');
  if(value.analysisStatus!==undefined&&(typeof value.analysisStatus!=='string'||!['waiting','done','error'].includes(value.analysisStatus)))errors.push('Некорректный статус описания');
  return errors;
}
export function validateConditions(value: unknown): string[] {
  if (!record(value)) return ['Укажите условия'];
  const errors: string[] = [];
  if (value.useWeather !== undefined && typeof value.useWeather !== 'boolean') errors.push('Проверьте учёт погоды');
  if (value.useWeather !== false && (typeof value.temperature !== 'number' || !Number.isFinite(value.temperature) || value.temperature < -40 || value.temperature > 45)) errors.push('Температура должна быть от −40 до +45 °C');
  if (value.useWeather !== false && (typeof value.wind !== 'string' || !['calm', 'moderate', 'strong'].includes(value.wind))) errors.push('Укажите ветер');
  if (typeof value.location !== 'string' || !['inside', 'outside'].includes(value.location)) errors.push('Укажите место');
  for (const k of ['rain', 'noHeels', 'walking']) if (typeof value[k] !== 'boolean') errors.push('Проверьте условия');
  for (const k of ['occasion', 'wishes', 'style', 'pinnedId']) if (typeof value[k] !== 'string' || (value[k] as string).length > 500) errors.push('Текст должен быть не длиннее 500 символов');
  if (value.styleTag !== undefined && value.styleTag !== '' && (typeof value.styleTag !== 'string' || !Object.hasOwn(clothingStyles, value.styleTag))) errors.push('Уточните назначение образа');
  if (value.useWeather === false && typeof value.occasion === 'string' && !value.occasion.trim() && !value.styleTag) errors.push('Укажите повод или включите учёт погоды.');
  return errors;
}
