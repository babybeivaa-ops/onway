export function isNightForecast(at:string){const hour=new Date(Date.parse(at)+9*3600000).getUTCHours();return hour>=18||hour<6;}
export function selectArrivalForecast<T extends {at:string}>(hours:T[],arrival?:{date:string;time:string},now=Date.now()){
 const target=arrival?Date.parse(arrival.date+'T'+arrival.time+':00+09:00'):NaN;
 const valid=hours.filter(h=>Number.isFinite(Date.parse(h.at))).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 if(!valid.length)return {forecast:undefined,arrival:false};
 if(!Number.isFinite(target)||target<now||target<Date.parse(valid[0].at)-3600000||target>Date.parse(valid[valid.length-1].at))return {forecast:valid[0],arrival:false};
 return {forecast:valid.reduce((best,h)=>Math.abs(Date.parse(h.at)-target)<Math.abs(Date.parse(best.at)-target)?h:best),arrival:true};
}
