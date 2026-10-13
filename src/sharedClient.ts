export interface SharedSession {token:string;role:'admin'|'guide'|'viewer'}
export function sharedSession():SharedSession|null{
 const invite=new URLSearchParams(location.hash.slice(1)).get('admin-invite');
 if(invite){sessionStorage.setItem('onway-admin-access',invite);history.replaceState(null,'',location.pathname+location.search+'#shared-admin');return {token:invite,role:'admin'};}
 const viewerParams=new URLSearchParams(location.hash.slice(1));const viewerToken=viewerParams.get('viewer');
 if(viewerToken){sessionStorage.setItem('onway-viewer-access',viewerToken);history.replaceState(null,'',location.pathname+location.search+'#viewer');return {token:viewerToken,role:'viewer'};}
 if(location.hash==='#viewer')return {token:sessionStorage.getItem('onway-viewer-access')||'',role:'viewer'};
 const params=new URLSearchParams(location.hash.slice(1));const token=params.get('guide');
 if(token){sessionStorage.setItem('onway-guide-access',token);history.replaceState(null,'',location.pathname+location.search+'#guide');return {token,role:'guide'};}
 if(location.hash==='#guide'){const saved=sessionStorage.getItem('onway-guide-access');return saved?{token:saved,role:'guide'}:{token:'',role:'guide'};}
 if(location.hash==='#shared-admin')return {token:sessionStorage.getItem('onway-admin-access')||'',role:'admin'};
 return null;
}
export async function sharedRequest(token:string,path:string,method='GET',body?:unknown){
 const r=await fetch('/api/shared/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 let d;try{d=await r.json()}catch{throw Error('공유 서버에 연결하지 못했어요.')}
 if(!r.ok)throw Object.assign(Error(d.error||'공유 서버 요청에 실패했어요.'),{status:r.status});return d;
}
