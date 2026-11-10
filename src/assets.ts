// Both browser bundles live in assets/, including when served from /repository/.
export function resolveAsset(path:string,scriptUrl=import.meta.url):string{
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)||path.split('/').some(p=>p==='..'||p==='.')||path.includes('//'))throw Error('Некорректный путь ресурса.');
 return new URL('../'+path,scriptUrl).href;
}
