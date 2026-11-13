// Browser timeouts may exclude the permission prompt. Bound the entire attempt too.
export function requestCurrentLocation(geo: Pick<Geolocation,'getCurrentPosition'>, onSuccess: PositionCallback, onError: (code:number)=>void, onRetry:()=>void){
 let stopped=false;
 let generation=0;
 let timer:ReturnType<typeof setTimeout>;
 const cancel=()=>{stopped=true;generation++;clearTimeout(timer)};
 const attempt=(highAccuracy:boolean)=>{
  const current=++generation;
  const fail=(code:number)=>{
   if(stopped||current!==generation)return;
   clearTimeout(timer);
   if(code!==1&&!highAccuracy){onRetry();attempt(true);return;}
   cancel();onError(code);
  };
  timer=setTimeout(()=>fail(3),highAccuracy?15000:10000);
  try{geo.getCurrentPosition(position=>{
   if(stopped||current!==generation)return;
   cancel();onSuccess(position);
  },error=>fail(error.code),{enableHighAccuracy:highAccuracy,timeout:highAccuracy?15000:10000,maximumAge:60000});}
  catch{fail(2);}
 };
 attempt(false);
 return cancel;
}
