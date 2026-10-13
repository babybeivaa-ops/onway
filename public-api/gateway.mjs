// Only this server contacts VWorld. Never return upstream URLs or raw errors.
export function createMapHandler({key, domain, fetchImpl=fetch}) {
 const upstreamError=(stage,status,code)=>Object.assign(Error('map upstream failed'),{mapDiagnostic:{stage,httpStatus:status,...(typeof code==='string'&&/^[A-Z_][A-Z0-9_]{0,39}$/.test(code)&&!code.includes(key)?{code}:{})}});
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 return async (req,res,url)=>{
  if(!url.pathname.startsWith('/api/maps/'))return false;
  if(req.method!=='GET'){json(res,405,{error:'허용되지 않은 요청입니다.'});return true;}
  if(url.pathname==='/api/maps/status'){json(res,200,{available:!!key,provider:'vworld'});return true;}
  if(!key){json(res,503,{error:'지도 서비스 연결을 준비 중이에요.'});return true;}
  try {
   if(url.pathname==='/api/maps/search'){
    const query=(url.searchParams.get('q')||'').trim().replace(/\s+/g,' ');
    if(query.length<2||query.length>100){json(res,400,{error:'장소명을 2~100자로 입력해주세요.'});return true;}
    const lookup=async(searchQuery)=>{
    const upstream=new URL('https://api.vworld.kr/req/search');
    upstream.search=new URLSearchParams({key,domain,service:'search',request:'search',version:'2.0',format:'json',type:'place',size:'10',crs:'EPSG:4326',query:searchQuery});
    const result=await fetchImpl(upstream,{signal:AbortSignal.timeout(12000),redirect:'error'});
    if(!result.ok)throw upstreamError('search-http',result.status);
    const data=(await result.json()).response;
    if(data?.status==='NOT_FOUND')return [];
    if(data?.status!=='OK')throw upstreamError('search-api',result.status,data?.error?.code);
    const seen=new Set();
    const items=(data.result?.items||[]).map(item=>({id:String(item.id),name:String(item.title),category:typeof item.category==='string'?item.category.trim():'',address:String(item.address?.road||item.address?.parcel||''),lat:Number(item.point?.y),lng:Number(item.point?.x),provider:'vworld'})).filter(item=>{
     if(!Number.isFinite(item.lat)||!Number.isFinite(item.lng)||Math.abs(item.lat)>90||Math.abs(item.lng)>180)return false;
     const identity=[item.name,item.lat,item.lng].join('|');if(seen.has(identity))return false;seen.add(identity);return true;
    });
    return items;};
    let items=await lookup(query);let notice='';let usedQuery=query;
    const parts=query.split(' ');const fallback=parts.at(-1);
    if(parts.length>1&&fallback.length>=2){const originalEmpty=!items.length;let extra=[];try{extra=await lookup(fallback);}catch(e){if(originalEmpty)throw e;}if(originalEmpty)usedQuery=fallback;const unique=new Map();for(const item of [...items,...extra]){const identity=[item.name,item.lat,item.lng].join('|');if(!unique.has(identity))unique.set(identity,item);}items=[...unique.values()];const region=parts.slice(0,-1);const score=item=>region.filter(word=>(item.address+' '+item.name).includes(word)).length;items.sort((a,b)=>score(b)-score(a));notice='장소명 “'+fallback+'” 검색 결과도 함께 보여드려요. 다른 지역의 장소도 포함될 수 있으니 주소를 확인해주세요.';}

    json(res,200,{items,notice,usedQuery});return true;
   }
   const tile=url.pathname.match(/^\/api\/maps\/tiles\/(\d+)\/(\d+)\/(\d+)\.png$/);
   if(tile){
    const [z,x,y]=tile.slice(1).map(Number);
    if(z<6||z>19||x<0||y<0||x>=2**z||y>=2**z){json(res,400,{error:'지도 범위를 확인해주세요.'});return true;}
    const upstream=`https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(key)}/Base/${z}/${y}/${x}.png`;
    const result=await fetchImpl(upstream,{headers:{Referer:domain+'/'},signal:AbortSignal.timeout(12000),redirect:'error'});
    if(!result.ok||!result.headers.get('content-type')?.startsWith('image/png'))throw upstreamError('tile-http',result.status);
    const buffer=Buffer.from(await result.arrayBuffer());
    if(buffer.length>2_000_000)throw Error('oversized');
    res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'});res.end(buffer);return true;
   }
   json(res,404,{error:'지도 요청을 찾지 못했어요.'});return true;
  }catch(e){const diagnostic=e.mapDiagnostic||{stage:e.name==='TimeoutError'?'timeout':'network-or-response'};json(res,502,{error:'지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',diagnostic});return true;}
 };
}
