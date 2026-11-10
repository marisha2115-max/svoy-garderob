import type {MaskMetrics} from './mask-quality';
export type BackgroundMethod='clothes'|'universal'|'solid';
export interface PhotoAttempt{method:BackgroundMethod;metrics:MaskMetrics;elapsedMs:number;error?:string}
export interface PhotoReport{version:1;source:'original'|'crop';attempts:PhotoAttempt[];selected?:BackgroundMethod;elapsedMs:number}
export function validPhotoReport(value:unknown):value is PhotoReport{
 const r=value as PhotoReport;if(!r||r.version!==1||!['original','crop'].includes(r.source)||!Number.isFinite(r.elapsedMs)||r.elapsedMs<0||!Array.isArray(r.attempts)||r.attempts.length>2)return false;
 if(!r.attempts.every(a=>a&&['clothes','universal','solid'].includes(a.method)&&Number.isFinite(a.elapsedMs)&&a.elapsedMs>=0&&(a.error===undefined||typeof a.error==='string'&&a.error.length<=500)&&a.metrics&&['largestShare','frameShare','fill','score'].every(k=>Number.isFinite((a.metrics as any)[k])&&(a.metrics as any)[k]>=0&&(a.metrics as any)[k]<=1)&&['area','largestArea','components','largeComponents'].every(k=>Number.isSafeInteger((a.metrics as any)[k])&&(a.metrics as any)[k]>=0)&&typeof a.metrics.pass==='boolean'&&Array.isArray(a.metrics.reasons)&&a.metrics.reasons.length<=8&&a.metrics.reasons.every(s=>typeof s==='string'&&s.length<100)&&a.metrics.bounds&&['x','y','width','height'].every(k=>Number.isFinite((a.metrics.bounds as any)[k])&&(a.metrics.bounds as any)[k]>=0)))return false;
 if(r.attempts.some(a=>a.metrics.holeShare!==undefined&&(!Number.isFinite(a.metrics.holeShare)||a.metrics.holeShare<0||a.metrics.holeShare>1)))return false;
 return r.selected===undefined||r.attempts.some(a=>a.method===r.selected&&a.metrics.pass);
}
