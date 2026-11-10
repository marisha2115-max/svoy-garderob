import type { CSSProperties } from 'react';
export function Icon({ name, size = 22, style }: { name: string; size?: number; style?: CSSProperties }) {
  const paths: Record<string, React.ReactNode> = {
    hanger: <><path d="M9 7a3 3 0 1 1 4.5 2.6L12 11v2L3 18q-1.5 2 1 2h16q2.5 0 1-2l-9-5"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    spark: <><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z"/><path d="M21 2v4m-2-2h4"/></>,
    bookmark: <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4V4Z"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    camera: <><path d="m8 5 1-2h6l1 2h4a1 1 0 0 1 1 1v13H3V6a1 1 0 0 1 1-1h4Z"/><circle cx="12" cy="12" r="4"/></>,
    photo: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-5 4 4 3-3 5 5"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></>,
    rain: <><path d="M6 16a5 5 0 0 1 0-10 6 6 0 0 1 11 1 4 4 0 0 1 1 8H6"/><path d="m8 18-1 3m6-3-1 3m6-3-1 3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    refresh: <><path d="M20 8a9 9 0 0 0-15-2L3 9m0-5v5h5M4 16a9 9 0 0 0 15 2l2-3m0 5v-5h-5"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
    shield: <><path d="m12 2 8 4v6q0 6-8 10-8-4-8-10V6l8-4Z"/><path d="m8 12 3 3 5-6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}
