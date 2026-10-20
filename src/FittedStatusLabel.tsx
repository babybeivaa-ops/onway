import {useLayoutEffect,useRef} from 'react';

/** Measure rendered text so Korean, Latin letters and digits all fit correctly. */
export function FittedStatusLabel({text,compact}:{text:string;compact:boolean}){
 const label=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{
  const element=label.current;
  if(!element||compact)return;
  let disposed=false;
  const fit=()=>{
   if(disposed||element.clientWidth===0)return;
   element.style.removeProperty('font-size');
   const largest=parseFloat(getComputedStyle(element).fontSize);
   if(element.scrollWidth<=element.clientWidth)return;
   let low=1,high=largest;
   for(let step=0;step<9;step++){
    const size=(low+high)/2;
    element.style.fontSize=`${size}px`;
    if(element.scrollWidth<=element.clientWidth)low=size;else high=size;
   }
   element.style.fontSize=`${Math.floor(low*10)/10}px`;
  };
  fit();
  const observer=new ResizeObserver(fit);
  if(element.parentElement)observer.observe(element.parentElement);
  document.fonts.ready.then(fit);
  window.addEventListener('resize',fit);
  return ()=>{disposed=true;observer.disconnect();window.removeEventListener('resize',fit)};
 },[text,compact]);
 return <strong ref={label} className="journey-status-label">{text}</strong>;
}
