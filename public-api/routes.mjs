// Only the server receives the Kakao REST key. No GPS or user identity is sent.
export function createRouteHandler({key,fetchImpl=fetch,now=Date.now,dailyLimit=9000}){
 const cache=new Map(),pending=new Map();let day='',daily=0,minute=0,burst=0;
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 async function calculate(points){
  let distanceMeters=0,durationSeconds=0;const paths=[];
  // Each request accepts five intermediate points; adjacent chunks share one endpoint.
  for(let start=0;start<points.length-1;start+=6){
   const chunk=points.slice(start,start+7),clock=now(),today=new Date(clock+9*3600000).toISOString().slice(0,10);
   if(day!==today){day=today;daily=0;}if(clock-minute>=60000){minute=clock;burst=0;}
   if(daily>=dailyLimit||burst>=30)throw Object.assign(Error('도로 경로 요청 한도에 도달했어요. 잠시 후 다시 확인해주세요.'),{status:429});
   daily++;burst++;
   const url=new URL('https://apis-navi.kakaomobility.com/v1/directions');
   url.search=new URLSearchParams({origin:chunk[0].join(','),destination:chunk.at(-1).join(','),waypoints:chunk.slice(1,-1).map(p=>p.join(',')).join('|'),priority:'RECOMMEND',summary:'false',alternatives:'false',road_details:'false',avoid:'ferries'});
   const response=await fetchImpl(url,{headers:{Authorization:'KakaoAK '+key},signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!response.ok)throw Error('upstream');
   const route=(await response.json()).routes?.[0];
   if(route?.result_code!==0||!Number.isFinite(route?.summary?.distance)||route.summary.distance<0||!Number.isFinite(route.summary.duration)||route.summary.duration<0)throw Error('route');
   distanceMeters+=route.summary.distance;durationSeconds+=route.summary.duration;
   let count=0;
   for(const section of route.sections??[])for(const road of section.roads??[]){
    const v=road.vertexes;if(!Array.isArray(v)||v.length%2)throw Error('geometry');
    const line=[];for(let i=0;i<v.length;i+=2){if(!Number.isFinite(v[i])||!Number.isFinite(v[i+1])||Math.abs(v[i])>180||Math.abs(v[i+1])>90)throw Error('geometry');line.push([v[i+1],v[i]]);}
    if(line.length>1){paths.push(line);count++;}
   }
   if(!count)throw Error('geometry');
  }
  return {distanceMeters,durationSeconds,paths,calculatedAt:new Date(now()).toISOString(),provider:'kakao'};
 }
 return async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/routes/'))return false;
  if(req.method!=='GET'){json(res,405,{error:'허용되지 않은 요청입니다.'});return true;}
  if(url.pathname!=='/api/routes/directions'){json(res,404,{error:'경로 요청을 찾지 못했어요.'});return true;}
  if(!key){json(res,503,{error:'카카오 길찾기 서버 연결을 준비 중이에요.'});return true;}
  let points;
  try{const raw=url.searchParams.get('points')||'';if(raw.length>4000)throw Error();points=JSON.parse(raw);if(!Array.isArray(points)||points.length<2||points.length>32||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<124||p[0]>132||p[1]<33||p[1]>39.5))throw Error();}
  catch{json(res,400,{error:'국내 지점 위치를 2~32개 지정해주세요.'});return true;}
  const id=JSON.stringify(points);
  try{
   let entry=cache.get(id),data;
   if(entry&&now()-entry.at<300000)data=entry.data;
   else {let job=pending.get(id);if(!job){job=calculate(points).then(result=>{if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(id,{at:now(),data:result});return result}).finally(()=>pending.delete(id));pending.set(id,job);}data=await job;}
   json(res,200,data);
  }catch(e){json(res,e.status===429?429:502,{error:e.status===429?e.message:'도로 경로를 계산하지 못했어요. 지점의 위치를 확인하거나 잠시 후 다시 시도해주세요.'});}
  return true;
 };
}
