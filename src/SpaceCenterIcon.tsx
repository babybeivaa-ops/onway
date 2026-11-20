import type {SVGProps} from 'react';
/** A small observatory dome, drawn on the same 24px stroke grid as the travel icon. */
export function SpaceCenterIcon({size=24,strokeWidth=1.7,...props}:SVGProps<SVGSVGElement>&{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
  <path d="M3 15a8 8 0 0 1 16 0M2 15h18M4 15v6h14v-6M2 21h18M11 7c-2 2-3 4.7-3 8M11 7c2 2 3 4.7 3 8M9 21v-3h4v3"/>
  <path d="m19 2 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8Z"/>
 </svg>;
}
