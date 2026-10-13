// The JavaScript key is public and domain-restricted; the REST key never leaves the server.
export function createMapHandler({kakaoKey, javascriptKey='',fetchImpl=fetch,now=Date.now}) {
 const cache=new Map(),pending=new Map();
 return async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/maps/'))return false;
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true;};
  if(req.method!=='GET')return send(405,{error:'허용되지 않은 요청입니다.'});
  if(url.pathname==='/api/maps/status')return send(200,{available:!!javascriptKey,searchAvailable:!!kakaoKey,provider:'kakao'});
  if(url.pathname==='/api/maps/config')return send(200,{javascriptKey,provider:'kakao'});
  if(url.pathname!=='/api/maps/search')return send(404,{error:'지도 요청을 찾지 못했어요.'});
  if(!kakaoKey)return send(503,{error:'장소 검색 서버 설정을 확인해주세요.'});
  const query=(url.searchParams.get('q')||'').trim().replace(/\s+/g,' ');
  if(query.length<2||query.length>100)return send(400,{error:'장소명을 2~100자로 입력해주세요.'});
  async function lookup(q){
   const cached=cache.get(q);if(cached&&now()-cached.at<600000)return cached.items;
   let job=pending.get(q);if(!job){job=(async()=>{
    const target=new URL('https://dapi.kakao.com/v2/local/search/keyword.json');target.search=new URLSearchParams({query:q,size:'15'});
    const r=await fetchImpl(target,{headers:{Authorization:'KakaoAK '+kakaoKey},signal:AbortSignal.timeout(8000),redirect:'error'});
    if(!r.ok)throw Error('upstream');const data=await r.json();if(!Array.isArray(data.documents))throw Error('response');
    const items=data.documents.filter(p=>p.id&&p.place_name&&String(p.x).trim()&&String(p.y).trim()).map(p=>({id:String(p.id),name:String(p.place_name),address:String(p.road_address_name||p.address_name||''),category:String(p.category_name||''),lat:Number(p.y),lng:Number(p.x),provider:'kakao'})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180);
    if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(q,{at:now(),items});return items;
   })().finally(()=>pending.delete(q));pending.set(q,job);}return job;
  }
  try{let items=await lookup(query),usedQuery=query,notice='';
   const parts=query.split(' '),last=parts.at(-1);
   if(!items.length&&parts.length>1&&last.length>=2){items=await lookup(last);usedQuery=last;const region=parts.slice(0,-1);const score=p=>region.filter(w=>(p.name+' '+p.address).includes(w)).length;items=[...items].sort((a,b)=>score(b)-score(a));notice='주소를 확인해 원하는 장소를 선택해주세요.';}
   return send(200,{items,usedQuery,notice,provider:'kakao'});
  }catch{return send(502,{error:'카카오 장소 검색에 연결하지 못했어요. 잠시 후 다시 시도해주세요.'});}
 };
}
