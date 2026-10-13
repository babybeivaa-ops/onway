export function nearRoute(lat:number,lng:number,paths:number[][][],limit=1000){
 const sx=111320*Math.cos(lat*Math.PI/180),sy=111320;
 return paths.some(line=>line.some((b,i)=>{if(!i)return false;const a=line[i-1];const ax=(a[1]-lng)*sx,ay=(a[0]-lat)*sy,bx=(b[1]-lng)*sx,by=(b[0]-lat)*sy,dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));return Math.hypot(ax+t*dx,ay+t*dy)<=limit}));
}
