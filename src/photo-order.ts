export function orderPhotos<T extends {id:string}>(items:readonly T[],ratios:ReadonlyMap<string,number>):T[]{
 const value=(id:string)=>{const ratio=ratios.get(id);return ratio!==undefined&&Number.isFinite(ratio)&&ratio>0?ratio:-1};
 // height / width: tallest first; adjacent values have the closest card heights.
 // Stable sort keeps equal/unknown images in their previous order.
 return [...items].sort((a,b)=>value(b.id)-value(a.id));
}
