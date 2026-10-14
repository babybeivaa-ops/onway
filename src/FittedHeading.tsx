import {useLayoutEffect,useRef} from 'react';
/** Keep the normal heading size unless the rendered text exceeds its column. */
export function FittedHeading({as:Tag='h2',children}:{as?:'h1'|'h2';children:string}){
 const ref=useRef<HTMLHeadingElement>(null);
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;let disposed=false;
  const fit=()=>{if(disposed||!el.clientWidth)return;
   el.style.fontSize='';el.style.whiteSpace='nowrap';
   const normal=parseFloat(getComputedStyle(el).fontSize),available=el.clientWidth;
   if(el.scrollWidth>available){const minimum=Math.min(16,normal);let size=Math.max(minimum,Math.floor(normal*available/el.scrollWidth));el.style.fontSize=size+'px';
    while(size>minimum&&el.scrollWidth>available){size--;el.style.fontSize=size+'px'}
    if(el.scrollWidth>available)el.style.whiteSpace='normal';
   }
  };
  fit();const observer=new ResizeObserver(fit);observer.observe(el);document.fonts.ready.then(fit);
  return()=>{disposed=true;observer.disconnect()};
 },[children]);
 return <Tag ref={ref} className="fitted-heading" aria-live={Tag==='h2'?'polite':undefined}>{children}</Tag>;
}
