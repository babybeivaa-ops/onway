// KMA village forecast. Only the fixed center location is sent upstream.
export function forecastBase(clock){
 const kst=new Date(clock+9*3600000-40*60000);
 const hour=kst.getUTCHours();
 let base=[2,5,8,11,14,17,20,23].filter(h=>h<=hour).at(-1);
 if(base===undefined){kst.setUTCDate(kst.getUTCDate()-1);base=23;}
 return {base_date:kst.toISOString().slice(0,10).replaceAll('-',''),base_time:String(base).padStart(2,'0')+'00'};
}
export function gridPoint(lat,lng){
 const rad=Math.PI/180,re=6371.00877/5,a=30*rad,b=60*rad;
 const sn=Math.log(Math.cos(a)/Math.cos(b))/Math.log(Math.tan(Math.PI/4+b/2)/Math.tan(Math.PI/4+a/2));
 const sf=Math.pow(Math.tan(Math.PI/4+a/2),sn)*Math.cos(a)/sn;
 const ro=re*sf/Math.pow(Math.tan(Math.PI/4+38*rad/2),sn);
 const ra=re*sf/Math.pow(Math.tan(Math.PI/4+lat*rad/2),sn),theta=(lng-126)*rad*sn;
 return {nx:Math.floor(ra*Math.sin(theta)+43+.5),ny:Math.floor(ro-ra*Math.cos(theta)+136+.5)};
}
const iso=(date,time)=>`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${time.slice(0,2)}:${time.slice(2,4)}:00+09:00`;
export function parseForecast(data,clock){
 if(data?.response?.header?.resultCode!=='00')throw Error('upstream');
 const items=data.response.body?.items?.item;if(!Array.isArray(items))throw Error('shape');
 const slots=new Map();
 for(const item of items){
  if(!/^\d{8}$/.test(item.fcstDate)||!/^\d{4}$/.test(item.fcstTime))continue;
  const at=iso(item.fcstDate,item.fcstTime);const millis=Date.parse(at);
  if(!Number.isFinite(millis)||millis<Math.floor(clock/3600000)*3600000)continue;
  const row=slots.get(at)||{at};
  if(['TMP','POP','SKY','PTY','WSD'].includes(item.category)&&String(item.fcstValue).trim()!=='')row[item.category]=Number(item.fcstValue);
  slots.set(at,row);
 }
 const hours=[...slots.values()].sort((a,b)=>a.at.localeCompare(b.at)).filter(r=>Number.isFinite(r.TMP)&&r.TMP>=-60&&r.TMP<=60&&Number.isFinite(r.POP)&&r.POP>=0&&r.POP<=100&&[1,3,4].includes(r.SKY)&&[0,1,2,3,4].includes(r.PTY)).slice(0,6).map(r=>({at:r.at,temperature:r.TMP,rainProbability:r.POP,windSpeed:Number.isFinite(r.WSD)&&r.WSD>=0&&r.WSD<200?r.WSD:null,condition:r.PTY?({1:'비',2:'비/눈',3:'눈',4:'소나기'}[r.PTY]):({1:'맑음',3:'구름 많음',4:'흐림'}[r.SKY])}));
 if(!hours.length||Date.parse(hours[0].at)>clock+2*3600000)throw Error('missing');
 return hours;
}
export function createWeatherHandler({key,fetchImpl=fetch,now=Date.now}){
 let cached,pending,failedUntil=0;
 const grid=gridPoint(34.532971970616224,127.46826930052721);
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function load(){
  const clock=now(),base=forecastBase(clock),url=new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst');
  let serviceKey=key;try{serviceKey=decodeURIComponent(key)}catch{}
  url.search=new URLSearchParams({serviceKey,pageNo:'1',numOfRows:'1000',dataType:'JSON',...base,nx:String(grid.nx),ny:String(grid.ny)});
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!response.ok)throw Error('http');
  const hours=parseForecast(await response.json(),clock);
  const value={provider:'kma',place:'국립청소년우주센터',issuedAt:iso(base.base_date,base.base_time),fetchedAt:new Date(clock).toISOString(),hours};
  cached={at:clock,value};return value;
 }
 return async(req,res,url)=>{
  if(url.pathname!=='/api/weather/center')return false;
  if(req.method!=='GET'){json(res,405,{error:'지원하지 않는 요청이에요.'});return true;}
  if(!key){json(res,503,{error:'센터 날씨 연결을 준비 중이에요.'});return true;}
  try{
   if(cached&&now()-cached.at<600000&&Date.parse(cached.value.hours[0].at)>=Math.floor(now()/3600000)*3600000){json(res,200,cached.value);return true;}
   if(now()<failedUntil)throw Error('cooldown');
   if(!pending)pending=load().catch(()=>{failedUntil=now()+30000;throw Error('failed')}).finally(()=>{pending=null});
   json(res,200,await pending);
  }catch{json(res,502,{error:'기상청 예보를 불러오지 못했어요. 잠시 후 다시 확인해주세요.'});}
  return true;
 };
}
