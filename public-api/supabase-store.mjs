export function createSupabaseStore({url,key,fetchImpl=fetch}){
 const base=new URL(url);if(base.protocol!=='https:')throw Error('SUPABASE_URL must use HTTPS');
 const endpoint=new URL('/rest/v1/onway_state',base);const headers={apikey:key,'Content-Type':'application/json'};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 const failure=()=>Object.assign(Error('공유 저장소에 연결하지 못했어요. 잠시 후 다시 시도해주세요.'),{status:503});
 async function call(params,options={}){const target=new URL(endpoint);target.search=new URLSearchParams(params);try{const r=await fetchImpl(target,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(10000),redirect:'error'});if(!r.ok)throw failure();return await r.json();}catch{throw failure();}}
 return {
  async load(){const rows=await call({id:'eq.main',select:'revision,payload'});if(!Array.isArray(rows)||rows.length!==1||rows[0].payload?.revision!==rows[0].revision)throw failure();return rows[0].payload;},
  async save(next,expected){if(next.revision!==expected+1)throw Error('invalid revision');const rows=await call({id:'eq.main',revision:'eq.'+expected,select:'revision'},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({revision:next.revision,payload:next,updated_at:new Date().toISOString()})});if(!Array.isArray(rows))throw failure();if(rows.length!==1)throw Object.assign(Error('다른 기기에서 변경했어요. 최신 기록을 불러온 뒤 다시 수정해주세요.'),{status:409});}
 };
}
