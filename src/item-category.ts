import type {Item,Category} from './domain';
export function categoryFromType(text:string,fallback:Category='unknown'):Category{
 const value=text.toLocaleLowerCase('ru');
 if(/пальто|куртк|пиджак|тренч|жакет|блейзер|пуховик|плащ|парка|бомбер/.test(value))return 'outer';
 if(/ботинк|кроссовк|туфл|лофер|сапог|кед[ыа\s.]|сандал|босонож/.test(value))return 'shoes';
 return fallback;
}
export function effectiveCategory(item:Item):Category{const named=categoryFromType(item.name);return named!=='unknown'?named:categoryFromType(item.subcategory??'',item.category)}
export function normalizedCategory(item:Item):Item{const category=effectiveCategory(item);return category===item.category?item:{...item,category}}
