export function parseEvents(d){
 if(String(d?.header?.resultCode)!=='0'||!Array.isArray(d?.body?.items))throw Error('response');
 return d.body.items.filter(e=>String(e.coordX).trim()&&String(e.coordY).trim()&&Number.isFinite(Number(e.coordX))&&Number.isFinite(Number(e.coordY))).map(e=>({lat:Number(e.coordY),lng:Number(e.coordX),kind:String(e.eventType||'돌발'),road:String(e.roadName||'도로'),message:String(e.message||'상세 정보 없음').slice(0,2000),direction:String(e.roadDrcType||''),blocked:String(e.lanesBlocked||''),start:String(e.startDate||''),end:String(e.endDate||'')}));
}
export function createTrafficHandler({key,fetchImpl=fetch,now=Date.now}){
 const cache=new Map();const pending=new Map();let quotaUntil=0;
 const quotaResponse=()=>({error:'도로 상황은 현재 조회할 수 없어요. 지도와 길찾기는 계속 이용할 수 있어요.',code:'ITS_MONTHLY_QUOTA',retryAt:new Date(quotaUntil).toISOString()});
 return async(req,res,url)=>{
 if(url.pathname!=='/api/traffic/events')return false;
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true};
 if(req.method!=='GET')return send(405,{error:'지원하지 않는 요청이에요.'});
 if(!key)return send(503,{error:'Render 서버의 ITS 키 설정을 확인해주세요.',code:'ITS_KEY_MISSING'});
 const b=['minX','maxX','minY','maxY'].map(n=>url.searchParams.has(n)?Number(url.searchParams.get(n)):NaN);
 if(!b.every(Number.isFinite)||b[0]<124||b[1]>132||b[2]<33||b[3]>39.5||b[0]>=b[1]||b[2]>=b[3])return send(400,{error:'조회 지역을 확인해주세요.'});
 if(now()<quotaUntil)return send(503,quotaResponse());
 // Expand to a shared 0.1 degree bounding box; the client filters events to its route.
 b[0]=Math.floor(b[0]*10)/10;b[1]=Math.ceil(b[1]*10)/10;b[2]=Math.floor(b[2]*10)/10;b[3]=Math.ceil(b[3]*10)/10;
 const id=b.join(',');try{
 let data=cache.get(id);if(!data||now()-data.clock>=600000){
 let job=pending.get(id);if(!job){job=(async()=>{const u=new URL('https://openapi.its.go.kr:9443/eventInfo');u.search=new URLSearchParams({apiKey:key,type:'all',eventType:'all',getType:'json',minX:String(b[0]),maxX:String(b[1]),minY:String(b[2]),maxY:String(b[3])});const r=await fetchImpl(u,{signal:AbortSignal.timeout(15000),redirect:'error'});let payload;try{payload=await r.json()}catch{throw Object.assign(Error('format'),{diagnostic:'ITS_RESPONSE_FORMAT'})};if(String(payload?.header?.resultMsg||'').includes('월')&&String(payload?.header?.resultMsg||'').includes('한도')){quotaUntil=now()+3600000;throw Object.assign(Error('quota'),{monthlyQuota:true});}if(!r.ok)throw Object.assign(Error('http'),{diagnostic:r.status===401||r.status===403?'ITS_AUTH_REJECTED':'ITS_HTTP_ERROR'});if(String(payload?.header?.resultCode)!=='0')throw Object.assign(Error('provider'),{diagnostic:'ITS_PROVIDER_ERROR'});const events=parseEvents(payload);const result={clock:now(),events,fetchedAt:new Date(now()).toISOString()};if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(id,result);return result})().finally(()=>pending.delete(id));pending.set(id,job)}data=await job;
 }return send(200,{provider:'its',events:data.events,fetchedAt:data.fetchedAt});
 }catch(e){if(e.monthlyQuota)return send(503,quotaResponse());const code=e.diagnostic||(e.name==='TimeoutError'||e.cause?.code==='UND_ERR_CONNECT_TIMEOUT'?'ITS_TIMEOUT':e.name==='TypeError'?'ITS_NETWORK':'ITS_RESPONSE_ERROR');console.warn('[ITS]',code);return send(502,{error:code==='ITS_TIMEOUT'?'ITS 서버 연결 시간이 초과됐어요.':code==='ITS_NETWORK'?'배포 서버에서 ITS 서버에 연결하지 못했어요.':code==='ITS_AUTH_REJECTED'?'ITS 인증 또는 접근 권한을 확인해주세요.':'ITS 도로 정보를 조회하지 못했어요.',code})}
 };
}
