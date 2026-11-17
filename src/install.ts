// "Put the app on the phone's home screen": which phone and browser this is, whether the app is already
// installed, and Android's own install prompt when the browser offers it.
interface InstallPrompt extends Event{prompt():Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
export type Device='iphone'|'iphone-other-browser'|'android'|'computer';
let deferred:InstallPrompt|undefined;const listeners=new Set<()=>void>();
const notify=()=>{for(const l of listeners)l()};
export function startInstallSupport(){
 if(typeof window==='undefined')return;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event as InstallPrompt;notify()});
 window.addEventListener('appinstalled',()=>{deferred=undefined;notify()});
 // Keeps a copy of the app on the phone so it also opens without internet.
 if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))
  window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).catch(()=>{/* The app works without it, just not offline. */})});
}
export function onInstallChange(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export const canPromptInstall=()=>!!deferred;
export async function promptInstall():Promise<boolean>{const p=deferred;if(!p)return false;deferred=undefined;notify();await p.prompt();return (await p.userChoice).outcome==='accepted'}
export function isInstalled():boolean{try{return matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true}catch{return false}}
export function detectDevice(ua=navigator.userAgent,touchMac=navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent)):Device{
 if(/iPhone|iPad|iPod/.test(ua)||touchMac)return /CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS|GSA\//.test(ua)?'iphone-other-browser':'iphone';
 if(/Android/.test(ua))return 'android';
 return 'computer';
}
export const isPhone=(device:Device)=>device!=='computer';
