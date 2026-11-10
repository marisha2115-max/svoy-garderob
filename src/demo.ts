import type { Item } from './domain';
const row = (id: string, name: string, category: Item['category'], color: string, warmth: Item['warmth'], extras: Partial<Item> = {}): Item => ({ id: `demo-${id}`, name, category, color, warmth, rain: 'no', wind: 'no', heel: 'no', season: ['all'], styles: ['casual'], demo: true, createdAt: '2026-11-07T12:00:00Z', ...extras });
export const demoItems: Item[] = [
  row('shirt', 'Белая рубашка', 'top', 'Белый', 'light', { styles: ['casual', 'business', 'smart'] }),
  row('jumper', 'Синий джемпер', 'top', 'Тёмно-синий', 'medium', { styles: ['casual', 'business', 'smart'] }),
  row('sweater', 'Тёплый серый свитер', 'top', 'Серый', 'warm'),
  row('tee', 'Бежевая футболка', 'top', 'Бежевый', 'light'),
  row('jeans', 'Прямые джинсы', 'bottom', 'Синий', 'medium'),
  row('trousers', 'Тёплые чёрные брюки', 'bottom', 'Чёрный', 'warm', { styles: ['casual', 'business', 'smart'] }),
  row('skirt', 'Юбка миди', 'bottom', 'Бежевый', 'light', { styles: ['casual', 'business', 'smart'] }),
  row('dress', 'Платье на каждый день', 'dress', 'Тёмно-синий', 'medium', { styles: ['casual', 'business', 'smart'] }),
  row('boots', 'Водостойкие ботинки', 'shoes', 'Коричневый', 'warm', { rain: 'yes', wind: 'yes' }),
  row('sneakers', 'Белые кеды', 'shoes', 'Белый', 'medium'),
  row('sandals', 'Летние сандалии', 'shoes', 'Бежевый', 'light'),
  row('heels', 'Туфли на каблуке', 'shoes', 'Чёрный', 'medium', { heel: 'yes', styles: ['business', 'smart'] }),
  row('coat', 'Тёплая куртка', 'outer', 'Бежевый', 'warm', { rain: 'yes', wind: 'yes' }),
  row('raincoat', 'Плащ от дождя', 'outer', 'Зелёный', 'medium', { rain: 'yes', wind: 'yes' }),
  row('scarf', 'Мягкий шарф', 'accessory', 'Бежевый', 'warm'),
];
const palette: Record<string, string> = { 'Белый': '#ece9e2', 'Тёмно-синий': '#384859', 'Серый': '#a6a5a2', 'Бежевый': '#c9b59a', 'Синий': '#617b95', 'Чёрный': '#3f4042', 'Коричневый': '#795540', 'Зелёный': '#7b8670' };
export function demoPhoto(item: Item): Blob {
  const fill = palette[item.color] ?? '#c9b59a';
  const common = `fill="${fill}" stroke="#3f392e" stroke-opacity=".35" stroke-width="1.5" stroke-linejoin="round"`;
  const shapes: Record<Item['category'], string> = {
    unknown: '',
    top: `<path d="m71 45 29-12q20 15 40 0l29 12 28 45-26 17-19-26v108H88V81l-19 26-26-17Z" ${common}/><path d="M100 34q20 30 40 0M119 56v129M96 160h45" fill="none" stroke="#3f392e" stroke-opacity=".2"/><path d="M92 48 83 70m65-22 10 22" stroke="#fff" stroke-opacity=".3"/>`,
    bottom: item.id.includes('skirt') ? `<path d="M90 41h60l34 145q-64 24-128 0Z" ${common}/><path d="m105 51-17 132m46-132 18 132M90 52h60" stroke="#574630" stroke-opacity=".25" fill="none"/>` : `<path d="M80 35h80l7 165h-37l-10-107-10 107H73Z" ${common}/><path d="M80 52h80M120 37v43M84 56q0 20 16 20m56-20q0 20-16 20" fill="none" stroke="#f1e9da" stroke-opacity=".35"/>`,
    dress: `<path d="m92 32 16 2q12 13 24 0l16-2 22 49-22 11-8-20-5 26 34 96q-49 22-98 0l34-96-5-26-8 20-22-11Z" ${common}/><path d="M105 98h30m-15 8-1 83" fill="none" stroke="#fff" stroke-opacity=".2"/>`,
    outer: `<path d="m86 36 19-9h30l19 9 33 51-23 21-17-24 8 116H85l8-116-17 24-23-21Z" ${common}/><path d="m105 28 15 31 15-31m-15 31v135M96 132h16m16 0h16" fill="none" stroke="#3f392e" stroke-opacity=".4"/><circle cx="124" cy="83" r="2" fill="#695f50"/><circle cx="124" cy="110" r="2" fill="#695f50"/><circle cx="124" cy="137" r="2" fill="#695f50"/>`,
    shoes: item.heel === 'yes' ? `<path d="m49 123 19-35 41 45 58-8q35-5 36 25H71l-10-10-3 38H48Z" ${common}/><path d="M72 113q17 34 45 19M71 151h132" fill="none" stroke="#2e2a27" stroke-opacity=".4"/>` : `<path d="M66 82h53l7 38 51 10q29 4 27 34H56l-5-14Z" ${common}/><path d="M56 164h148v9H56Z" fill="#e0d8c9" stroke="#655b4c" stroke-opacity=".4"/><path d="m100 116 24 6m-20 4 26 7m-21 3 28 6M67 93h40" fill="none" stroke="#eee8de" stroke-width="3"/>`,
    accessory: `<path d="m70 35 50-7 18 58 35 95-40 17-32-93-10 90-39-4 12-112Z" ${common}/><path d="m71 42 45-7m-57 147 37 4m37 4 37-15" stroke="#e7d7c1" stroke-width="6" fill="none"/>`,
  };
  return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 240 240"><rect width="240" height="240" fill="#F2F0EB"/><ellipse cx="120" cy="213" rx="65" ry="5" fill="#2b2117" opacity=".05"/>${shapes[item.category]}</svg>`], { type: 'image/svg+xml' });
}
