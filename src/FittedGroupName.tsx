import {useLayoutEffect,useRef} from 'react';

export function FittedGroupName({name}:{name:string}){
 const ref=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{
  const element=ref.current;if(!element)return;
  let disposed=false;
  const fit=()=>{
   if(disposed||!element.clientWidth)return;
   element.style.fontSize='';
   const normal=parseFloat(getComputedStyle(element).fontSize);
   const available=element.clientWidth;
   if(element.scrollWidth>available){
    let size=Math.max(12,Math.floor(normal*available/element.scrollWidth));
    element.style.fontSize=size+'px';
    while(size>12&&element.scrollWidth>available)element.style.fontSize=--size+'px';
   }
  };
  fit();
  const observer=new ResizeObserver(fit);observer.observe(element);
  document.fonts.ready.then(fit);
  return()=>{disposed=true;observer.disconnect()};
 },[name]);
 return <strong ref={ref} className="fitted-group-name" title={name}>{name}</strong>;
}
