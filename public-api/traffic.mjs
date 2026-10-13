export function parseEvents(d){
 if(String(d?.header?.resultCode)!=='0'||!Array.isArray(d?.body?.items))throw Error('response');
 return d.body.items.filter(e=>String(e.coordX).trim()&&String(e.coordY).trim()&&Number.isFinite(Number(e.coordX))&&Number.isFinite(Number(e.coordY))).map(e=>({lat:Number(e.coordY),lng:Number(e.coordX),kind:String(e.eventType||'돌발'),road:String(e.roadName||'도로'),message:String(e.message||'상세 정보 없음').slice(0,2000),direction:String(e.roadDrcType||''),blocked:String(e.lanesBlocked||''),start:String(e.startDate||''),end:String(e.endDate||'')}));
}
export function createTrafficHandler({key,fetchImpl=fetch,now=Date.now}){
 const cache=new Map();const pending=new Map();
 return async(req,res,url)=>{
 if(url.pathname!=='/api/traffic/events')return false;
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true};
 if(req.method!=='GET')return send(405,{error:'지원하지 않는 요청이에요.'});
 if(!key)return send(503,{error:'도로 정보 연결을 준비 중이에요.'});
 const b=['minX','maxX','minY','maxY'].map(n=>url.searchParams.has(n)?Number(url.searchParams.get(n)):NaN);
 if(!b.every(Number.isFinite)||b[0]<124||b[1]>132||b[2]<33||b[3]>39.5||b[0]>=b[1]||b[2]>=b[3])return send(400,{error:'조회 지역을 확인해주세요.'});
 const id=b.join(',');try{
 let data=cache.get(id);if(!data||now()-data.clock>=120000){
 let job=pending.get(id);if(!job){job=(async()=>{const u=new URL('https://openapi.its.go.kr:9443/eventInfo');u.search=new URLSearchParams({apiKey:key,type:'all',eventType:'all',getType:'json',minX:String(b[0]),maxX:String(b[1]),minY:String(b[2]),maxY:String(b[3])});const r=await fetchImpl(u,{signal:AbortSignal.timeout(15000),redirect:'error'});if(!r.ok)throw Error('http');const events=parseEvents(await r.json());const result={clock:now(),events,fetchedAt:new Date(now()).toISOString()};if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(id,result);return result})().finally(()=>pending.delete(id));pending.set(id,job)}data=await job;
 }return send(200,{provider:'its',events:data.events,fetchedAt:data.fetchedAt});
 }catch{return send(502,{error:'도로 정보를 조회하지 못했어요. 사고가 없다는 뜻은 아니에요. 잠시 후 다시 시도해주세요.'})}
 };
}
