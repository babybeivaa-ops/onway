import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {validWorkspace,validGroup} from './workspace-schema.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const eq=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createSharingHandler({directory,adminToken,now=Date.now,store}){
 if(!store)fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const file=path.join(directory||'.','workspace.json');
 let db={revision:0,workspace:{version:2,view:'admin',activeGroupId:'',groups:[]},links:{}};
 if(!store&&fs.existsSync(file)){db=JSON.parse(fs.readFileSync(file,'utf8'));if(!validWorkspace(db.workspace)||!Number.isSafeInteger(db.revision)||!db.links)throw Error('공유 저장 데이터가 손상되어 서버 시작을 중단합니다.');}
 const backupDir=path.join(directory||'.','backups');if(!store)fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
 const persist=async next=>{
  if(store){await store.save(next,db.revision);db=next;return;}
  const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next),{mode:0o600});
  if(fs.existsSync(file)){const day=new Date(now()+9*3600000).toISOString().slice(0,10);const target=path.join(backupDir,day+'.json');if(!fs.existsSync(target))fs.copyFileSync(file,target);}
  fs.renameSync(tmp,file);db=next;
 };
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 const auth=req=>{const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)return null;if(eq(hash(token),hash(adminToken)))return {role:'admin'};const key=hash(token);const entry=db.links[key];return entry&&entry.expires>now()&&db.workspace.groups.some(g=>g.id===entry.groupId)?{role:'guide',groupId:entry.groupId}:null;};
 const snapshot=actor=>({role:actor.role,revision:db.revision,workspace:actor.role==='admin'?db.workspace:{version:2,view:'guide',activeGroupId:actor.groupId,groups:db.workspace.groups.filter(g=>g.id===actor.groupId)}});
 async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>10000000)throw Object.assign(Error('요청이 너무 커요.'),{status:413});}try{return JSON.parse(raw)}catch{throw Object.assign(Error('잘못된 요청이에요.'),{status:400})}}
 const denied=()=>Object.assign(Error('이 작업의 권한이 없어요.'),{status:403});
 const handle=async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/shared/'))return false;
  try{
   const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)throw denied();
   if(store){db=await store.load();if(!validWorkspace(db.workspace)||!Number.isSafeInteger(db.revision)||!db.links)throw Error('invalid stored state');}
   const actor=auth(req);if(!actor){json(res,401,{error:'접속 코드가 잘못되었거나 만료된 링크예요.'});return true;}
   if(url.pathname==='/api/shared/workspace'&&req.method==='GET'){json(res,200,snapshot(actor));return true;}
   if(url.pathname==='/api/shared/workspace'&&req.method==='PUT'){
    const input=await body(req);if(input.revision!==db.revision){json(res,409,{error:'다른 기기에서 변경했어요. 최신 기록을 불러온 뒤 다시 수정해주세요.'});return true;}
    if(!validWorkspace(input.workspace))throw Object.assign(Error('저장할 기록 형식이 올바르지 않아요.'),{status:400});
    let workspace=input.workspace;
    if(actor.role==='guide'){
     const g=workspace.groups[0],old=db.workspace.groups.find(g=>g.id===actor.groupId);
     if(workspace.groups.length!==1||g.id!==actor.groupId||g.travelDate<new Date(now()+9*3600000).toISOString().slice(0,10))throw denied();
     // Guides can edit their own journey; identity, dates and destination stay protected.
     const protectedGroup=x=>{const y=structuredClone(x);for(const k of ['counts','changes','reports','confirmed','waypoints','distanceNeedsReview','totalRoadDistanceKm'])delete y.state[k];delete y.configuredRoute;delete y.checkpoints;delete y.state.trip.status;delete y.state.trip.mealStartedAt;delete y.state.trip.meal;delete y.state.trip.origin;return JSON.stringify(y)};
     if(protectedGroup(g)!==protectedGroup(old))throw denied();
     const fixedDestination=x=>x.state.waypoints.filter(p=>p.kind==='destination').map(({order,...p})=>p);
     if(JSON.stringify(fixedDestination(g))!==JSON.stringify(fixedDestination(old)))throw denied();
     if(g.state.totalRoadDistanceKm!==undefined&&g.state.totalRoadDistanceKm!==old.state.totalRoadDistanceKm)throw denied();
     if(!g.state.waypoints.some(p=>p.id==='start'&&p.kind==='start'&&p.included))throw denied();
     if(old.state.waypoints.some(p=>p.id==='bridge'&&p.included)&&!g.state.waypoints.some(p=>p.id==='bridge'&&p.included))throw denied();
     if(old.state.reports.some(r=>r.status!=='cancelled'&&!g.state.waypoints.some(p=>p.id===r.waypointId&&p.included)))throw denied();
     if(old.state.reports.some(r=>!g.state.reports.some(n=>n.id===r.id)))throw denied();
     if(g.state.reports.some(r=>!g.state.waypoints.some(p=>p.id===r.waypointId&&p.kind!=='destination')))throw denied();
     if(old.state.changes.some(c=>!g.state.changes.some(n=>JSON.stringify(c)===JSON.stringify(n))))throw denied();
     for(const c of g.state.changes)if(!old.state.changes.some(n=>n.id===c.id))c.actor='guide';
     workspace={...db.workspace,groups:db.workspace.groups.map(x=>x.id===g.id?g:x)};
    }
    const next={...db,revision:db.revision+1,workspace};
    next.links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>workspace.groups.some(g=>g.id===v.groupId)));
    await persist(next);json(res,200,snapshot(actor));return true;
   }
   if(actor.role!=='admin')throw denied();
   if(url.pathname==='/api/shared/publish'&&req.method==='POST'){
    const {group}=await body(req);if(!validGroup(group))throw Object.assign(Error('단체 정보가 올바르지 않아요.'),{status:400});
    if(db.workspace.groups.some(g=>g.id===group.id)){json(res,409,{error:'이미 공유한 단체예요. 공유 관리 화면에서 수정해주세요.'});return true;}
    if(db.workspace.groups.length>=1000)throw Object.assign(Error('공유 단체 수 한도에 도달했어요.'),{status:400});
    await persist({...db,revision:db.revision+1,workspace:{...db.workspace,activeGroupId:group.id,groups:[...db.workspace.groups,group]}});json(res,200,snapshot(actor));return true;
   }
   if(url.pathname==='/api/shared/link'&&req.method==='POST'){
    const {groupId,revoke=false}=await body(req);if(!db.workspace.groups.some(g=>g.id===groupId))throw Object.assign(Error('단체를 찾지 못했어요.'),{status:404});
    const links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>v.groupId!==groupId));
    const token=randomBytes(32).toString('base64url'),expires=now()+30*86400000;
    if(!revoke)links[hash(token)]={groupId,expires};await persist({...db,revision:db.revision+1,links});json(res,200,revoke?{revoked:true}:{token,expires});return true;
   }
   json(res,404,{error:'지원하지 않는 공유 요청이에요.'});
  }catch(e){json(res,e.status||500,{error:e.status?e.message:'공유 기록을 처리하지 못했어요. 원래 기록은 유지됩니다.'});}
  return true;
 };
 // Serialize requests within one process; storage revision checks also guard multiple instances.
 let queue=Promise.resolve();
 return (req,res,url)=>{if(!url.pathname.startsWith('/api/shared/'))return Promise.resolve(false);const result=queue.then(()=>handle(req,res,url));queue=result.catch(()=>{});return result;};
}
