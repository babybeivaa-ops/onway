export interface MapScreenPoint {x:number;y:number}
/** Separate clickable markers in screen pixels without changing stored coordinates. */
export function spreadMapMarkers(points:MapScreenPoint[],gap=42):MapScreenPoint[]{
 const placed:MapScreenPoint[]=[];
 for(const point of points){
  let candidate={...point};
  const overlaps=(p:MapScreenPoint)=>placed.some(other=>Math.hypot(p.x-other.x,p.y-other.y)<gap);
  if(overlaps(candidate)){
   outer:for(let ring=1;ring<=points.length;ring++){
    const steps=8*ring;
    for(let step=0;step<steps;step++){
     const angle=-Math.PI/2+step*2*Math.PI/steps;
     const trial={x:point.x+Math.cos(angle)*gap*ring,y:point.y+Math.sin(angle)*gap*ring};
     if(!overlaps(trial)){candidate=trial;break outer;}
    }
   }
  }
  placed.push(candidate);
 }
 return placed;
}
