import {useEffect} from 'react';
export function useViewportSafety(){useEffect(()=>{
  const viewport=window.visualViewport;let timer:ReturnType<typeof setTimeout>|undefined;
  function update(){const height=viewport?.height??innerHeight,top=viewport?.offsetTop??0;const keyboard=height<innerHeight*.75;document.documentElement.style.setProperty('--visible-height',`${height}px`);document.documentElement.style.setProperty('--visible-top',`${top}px`);document.documentElement.dataset.keyboard=String(keyboard);clearTimeout(timer);if(keyboard)timer=setTimeout(()=>{const element=document.activeElement;if(element instanceof HTMLElement&&element.matches('input,textarea,select'))element.scrollIntoView({block:'nearest',behavior:'smooth'})},80)}
  update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);return()=>{clearTimeout(timer);viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);delete document.documentElement.dataset.keyboard};
},[])}
