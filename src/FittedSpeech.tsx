import {useLayoutEffect,useRef} from 'react';
/** Fit the intended two lines after fonts load, including mobile font metrics. */
export function FittedSpeech({children}:{children:string}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;let disposed=false;
 const fit=()=>{if(disposed||!el.clientWidth)return;el.style.fontSize='';
 const lines=Array.from(el.querySelectorAll<HTMLElement>('.speech-line'));
 lines.forEach(line=>{line.style.whiteSpace='nowrap'});
 const normal=parseFloat(getComputedStyle(el).fontSize);let size=normal;
 while(size>13&&lines.some(line=>line.scrollWidth>line.clientWidth)){size-=.5;el.style.fontSize=size+'px'}
 lines.forEach(line=>{line.style.whiteSpace=line.scrollWidth>line.clientWidth?'normal':'nowrap'});
 };
 const observer=new ResizeObserver(fit);observer.observe(el);fit();document.fonts.ready.then(fit);
 return()=>{disposed=true;observer.disconnect()};},[children]);
 return <div className="speech" ref={ref}>{children.split('\n').map((line,i)=><div className="speech-line" key={i}>{line}</div>)}<span>함께 가요, ON:WAY</span></div>;
}
