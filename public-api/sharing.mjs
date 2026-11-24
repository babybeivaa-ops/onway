import {guideVisitExpires,guideVisitActive} from './visit-access.mjs';
import {makePushKeys,validPushSubscription,guidePushNotice,sendAdminPush} from './push.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {serveWeeklyMenus} from './weekly-menus.mjs';
import {encodeCenterCode,checkCenterCode} from './center-code.mjs';
import {serveProgramPlans} from './program-plans.mjs';
import {serveDocuments,createFileDocumentStore} from './documents.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash,timingSafeEqual,createCipheriv,createDecipheriv} from 'node:crypto';
import {validWorkspace,validGroup} from './workspace-schema.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const eq=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createSharingHandler({directory,adminToken,now=Date.now,store,documentStore}){
 if(!store)fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const pdfStore=documentStore??(!store?createFileDocumentStore(path.join(directory,'documents')):null);
 const linkKey=createHash('sha256').update('onway-guide-link:'+adminToken).digest();
 const sealLink=token=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',linkKey,iv);const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(v=>v.toString('base64url')).join('.')};
 const openLink=value=>{try{const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64url'));const decipher=createDecipheriv('aes-256-gcm',linkKey,iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8')}catch{return null}};
 const file=path.join(directory||'.','workspace.json');
 let db={revision:0,workspace:{version:2,view:'admin',activeGroupId:'',groups:[]},links:{}};
 if(!store&&fs.existsSync(file)){db=JSON.parse(fs.readFileSync(file,'utf8'));if(!validWorkspace(db.workspace)||!Number.isSafeInteger(db.revision)||!db.links)throw Error('공유 저장 데이터가 손상되어 서버 시작을 중단합니다.');}
 const backupDir=path.join(directory||'.','backups');if(!store)fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
 const persist=async next=>{
  if(store){await store.save(next,db.revision);db=next;return;}
  const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next),{mode:0o600});
  if(fs.existsSync(file)){const day=new Date(now()+9*3600000).toISOString().slice(0,10);const target=path.join(backupDir,day+'.json');if(!fs.existsSync(target))fs.copyFileSync(file,target);}
  for(let attempt=0;;attempt++){try{fs.renameSync(tmp,file);break}catch(error){if(!['EBUSY','EPERM','EACCES'].includes(error.code)||attempt>=5)throw error;await delay(25*(attempt+1));}}db=next;
 };
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 const auth=req=>{const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)return null;if(eq(hash(token),hash(adminToken)))return {role:'admin',owner:true};const key=hash(token);const entry=db.links[key];if(entry?.role==='admin-setup'&&entry.expires>now())return {role:'admin-setup',owner:true};if(entry?.role==='admin'&&entry.expires>now()){if(entry.centerVersion&&entry.centerVersion!==db.centerCode?.version)return null;return {role:'admin',owner:!!entry.centerVersion};}return entry&&entry.role!=='viewer'&&entry.expires>now()&&db.workspace.groups.some(g=>g.id===entry.groupId&&guideVisitActive(g,now()))?{role:'guide',groupId:entry.groupId}:null;};
 const loginAttempts=new Map();
 const snapshot=actor=>({role:actor.role,revision:db.revision,workspace:actor.role==='admin'?db.workspace:{version:2,view:'guide',activeGroupId:actor.groupId,groups:db.workspace.groups.filter(g=>g.id===actor.groupId)}});
 async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>10000000)throw Object.assign(Error('요청이 너무 커요.'),{status:413});}try{return JSON.parse(raw)}catch{throw Object.assign(Error('잘못된 요청이에요.'),{status:400})}}
 const denied=()=>Object.assign(Error('이 작업의 권한이 없어요.'),{status:403});
 const handle=async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/shared/'))return false;
  try{
   const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)throw denied();
   if(store){db=await store.load();if(!validWorkspace(db.workspace)||!Number.isSafeInteger(db.revision)||!db.links)throw Error('invalid stored state');}
   if(url.pathname==='/api/shared/admin-login'&&req.method==='POST'){
    const ip=req.socket?.remoteAddress||'unknown';for(const [key,v] of loginAttempts)if(v.until<=now())loginAttempts.delete(key);
    const attempt=loginAttempts.get(ip)||{count:0,until:now()+15*60_000};
    if(attempt.count>=5||loginAttempts.size>1000){json(res,429,{error:'접속 시도가 많아요. 15분 후 다시 시도해주세요.'});return true;}
    const {code}=await body(req);attempt.count++;loginAttempts.set(ip,attempt);
    if(!checkCenterCode(code,db.centerCode)){json(res,401,{error:'센터 코드를 확인해주세요. 처음 사용하는 경우 관리자 코드 설정을 먼저 완료해주세요.'});return true;}
    loginAttempts.delete(ip);const token=randomBytes(32).toString('base64url'),expires=now()+12*3600000;
    const links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>v.expires>now()));links[hash(token)]={role:'admin',centerVersion:db.centerCode.version,expires};
    await persist({...db,revision:db.revision+1,links});json(res,200,{token,expires,role:'admin'});return true;
   }
   const actor=auth(req);if(!actor){json(res,401,{error:'접속 코드가 잘못되었거나 만료된 링크예요.'});return true;}
   if(url.pathname==='/api/shared/admin-code'&&req.method==='POST'){
    if(!actor.owner)throw denied();const {code}=await body(req);const centerCode=encodeCenterCode(code);
    const links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>v.role!=='admin-setup'&&!v.centerVersion));
    await persist({...db,revision:db.revision+1,centerCode,links});json(res,200,{saved:true});return true;
   }
   if(actor.role==='admin-setup')throw denied();
   // Recover only the caller's already-valid guide token; no rotation or access changes.
   if(url.pathname==='/api/shared/link-recover'&&req.method==='POST'){
    if(actor.role!=='guide')throw denied();
    const token=(req.headers.authorization||'').replace(/^Bearer /,''),key=hash(token),entry=db.links[key];
    if(!entry.sealedToken||openLink(entry.sealedToken)!==token){await persist({...db,revision:db.revision+1,links:{...db.links,[key]:{...entry,sealedToken:sealLink(token)}}});}
    json(res,200,{restored:true,groupId:actor.groupId,expires:entry.expires});return true;
   }
   if(url.pathname==='/api/shared/admin-setup-link'&&req.method==='POST'){
    if(!actor.owner)throw denied();const token=randomBytes(32).toString('base64url'),expires=now()+10*60_000;
    const links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>v.role!=='admin-setup'));links[hash(token)]={role:'admin-setup',expires};
    await persist({...db,revision:db.revision+1,links});json(res,200,{token,expires});return true;
   }
   if(url.pathname==='/api/shared/push-key'&&req.method==='GET'){
    if(actor.role!=='admin')throw denied();
    if(!db.push?.keys)await persist({...db,revision:db.revision+1,push:{keys:makePushKeys(),subscriptions:[]}});
    json(res,200,{publicKey:db.push.keys.publicKey});return true;
   }
   if(url.pathname==='/api/shared/push-subscription'&&['POST','DELETE'].includes(req.method)){
    if(actor.role!=='admin')throw denied();const input=await body(req);const subscription=input.subscription;
    if(!validPushSubscription(subscription))throw Object.assign(Error('알림 구독 정보가 올바르지 않아요.'),{status:400});
    const token=(req.headers.authorization||'').replace(/^Bearer /,''),authKey=eq(hash(token),hash(adminToken))?undefined:hash(token);
    let subscriptions=(db.push?.subscriptions??[]).filter(s=>s.expires>now()&&s.subscription.endpoint!==subscription.endpoint);
    if(req.method==='POST'){if(subscriptions.length>=100)throw Object.assign(Error('알림 기기 등록 한도에 도달했어요.'),{status:400});subscriptions.push({subscription,authKey,expires:authKey?db.links[authKey].expires:now()+30*86400000});}
    await persist({...db,revision:db.revision+1,push:{keys:db.push?.keys??makePushKeys(),subscriptions}});json(res,200,{saved:true});return true;
   }
   if(url.pathname==='/api/shared/program-plans'){await serveProgramPlans(req,res,{store:pdfStore,registeredNames:db.workspace.groups.map(g=>g.state.organization.name),canEdit:actor.role==='admin',group:db.workspace.groups.find(g=>g.id===actor.groupId)});return true;}
   if(url.pathname==='/api/shared/weekly-menus'){await serveWeeklyMenus(req,res,url,{store:pdfStore,canEdit:actor.role==='admin',group:db.workspace.groups.find(g=>g.id===actor.groupId)});return true;}
   if(url.pathname==='/api/shared/documents'){
    if(!pdfStore)throw Object.assign(Error('PDF 저장소가 설정되지 않았어요.'),{status:503});
    await serveDocuments(req,res,url,{store:pdfStore,canEdit:actor.role==='admin',authorize:(id,date)=>db.workspace.groups.some(g=>g.id===id&&g.travelDate===date&&(actor.role==='admin'||actor.groupId===id))});return true;
   }
   if(url.pathname==='/api/shared/workspace'&&req.method==='GET'){json(res,200,snapshot(actor));return true;}
   if(url.pathname==='/api/shared/workspace'&&req.method==='PUT'){
    const input=await body(req);if(input.revision!==db.revision){json(res,409,{error:'다른 기기에서 변경했어요. 최신 기록을 불러온 뒤 다시 수정해주세요.'});return true;}
    if(!validWorkspace(input.workspace))throw Object.assign(Error('저장할 기록 형식이 올바르지 않아요.'),{status:400});
    let workspace=input.workspace;
    if(actor.role==='guide'){
     const g=workspace.groups[0],old=db.workspace.groups.find(g=>g.id===actor.groupId);
     if(workspace.groups.length!==1||g.id!==actor.groupId||!guideVisitActive(g,now()))throw denied();
     // Guides can edit their own journey; identity, dates and destination stay protected.
     const protectedGroup=x=>{const y=structuredClone(x);for(const k of ['plannedArrival','arrivalChanges','centerMessages','sharedPosition','counts','changes','reports','confirmed','countsConfirmedAt','waypoints','distanceNeedsReview','totalRoadDistanceKm'])delete y.state[k];delete y.configuredRoute;delete y.checkpoints;delete y.state.trip.status;delete y.state.trip.mealStartedAt;delete y.state.trip.meal;delete y.state.trip.origin;return JSON.stringify(y)};
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
     if((old.state.centerMessages??[]).some(m=>!(g.state.centerMessages??[]).some(n=>n.id===m.id&&n.sender===m.sender&&n.text===m.text&&n.at===m.at&&(n.acknowledgedAt===m.acknowledgedAt||(m.sender==='admin'&&!m.acknowledgedAt&&typeof n.acknowledgedAt==='string'))&&JSON.stringify(n.replies??[])===JSON.stringify(m.replies??[]))))throw denied();
     if((g.state.centerMessages??[]).some(m=>(m.sender==='admin'||m.acknowledgedAt!==undefined||(m.replies?.length??0)>0)&&!(old.state.centerMessages??[]).some(n=>n.id===m.id)))throw denied();
     for(const c of g.state.changes)if(!old.state.changes.some(n=>n.id===c.id))c.actor='guide';
     workspace={...db.workspace,groups:db.workspace.groups.map(x=>x.id===g.id?g:x)};
    }
    const next={...db,revision:db.revision+1,workspace};
    next.links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>v.role==='admin'||workspace.groups.some(g=>g.id===v.groupId)));
    const notice=actor.role==='guide'?guidePushNotice(db.workspace.groups.find(g=>g.id===actor.groupId),workspace.groups.find(g=>g.id===actor.groupId)):null;
    await persist(next);json(res,200,snapshot(actor));if(notice)void sendAdminPush(next.push,notice,next.links).catch(()=>{});return true;
   }
   if(actor.role!=='admin')throw denied();
   if(url.pathname==='/api/shared/admin-invite'){
    if(!actor.owner)throw denied();
    if(req.method==='GET'){const entry=Object.values(db.links).find(v=>v.role==='admin'&&v.expires>now());json(res,200,{expires:entry?.expires||null});return true;}
    if(req.method==='POST'){const {revoke=false}=await body(req);const links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>v.role!=='admin'));const token=randomBytes(32).toString('base64url'),expires=now()+86400000;if(!revoke)links[hash(token)]={role:'admin',expires};await persist({...db,revision:db.revision+1,links});json(res,200,revoke?{revoked:true}:{token,expires});return true;}
    json(res,405,{error:'허용되지 않은 요청이에요.'});return true;
   }
   if(url.pathname==='/api/shared/publish'&&req.method==='POST'){
    const {group}=await body(req);if(!validGroup(group))throw Object.assign(Error('단체 정보가 올바르지 않아요.'),{status:400});
    if(db.workspace.groups.some(g=>g.id===group.id)){json(res,409,{error:'이미 공유한 단체예요. 공유 관리 화면에서 수정해주세요.'});return true;}
    if(db.workspace.groups.length>=1000)throw Object.assign(Error('공유 단체 수 한도에 도달했어요.'),{status:400});
    await persist({...db,revision:db.revision+1,workspace:{...db.workspace,activeGroupId:group.id,groups:[...db.workspace.groups,group]}});json(res,200,snapshot(actor));return true;
   }
   if(url.pathname==='/api/shared/link'&&req.method==='GET'){
    const groupId=url.searchParams.get('groupId'),group=db.workspace.groups.find(g=>g.id===groupId);
    if(!group)throw Object.assign(Error('단체를 찾지 못했어요.'),{status:404});
    const entry=Object.values(db.links).find(v=>v.groupId===groupId&&(v.role||'guide')==='guide'&&v.expires>now());
    if(!entry||!guideVisitActive(group,now())){json(res,200,{exists:false});return true;}
    const token=entry.sealedToken?openLink(entry.sealedToken):null;
    json(res,200,{exists:true,token,expires:entry.expires});return true;
   }
   if(url.pathname==='/api/shared/link'&&req.method==='POST'){
    const {groupId,revoke=false,role='guide'}=await body(req);if(role!=='guide')throw Object.assign(Error('지원하지 않는 링크 유형이에요.'),{status:400});if(!db.workspace.groups.some(g=>g.id===groupId))throw Object.assign(Error('단체를 찾지 못했어요.'),{status:404});
    const links=Object.fromEntries(Object.entries(db.links).filter(([,v])=>v.groupId!==groupId||(v.role||'guide')!==role));
    const token=randomBytes(32).toString('base64url'),expires=guideVisitExpires(db.workspace.groups.find(g=>g.id===groupId));
    if(!revoke)links[hash(token)]={groupId,expires,role,sealedToken:sealLink(token)};await persist({...db,revision:db.revision+1,links});json(res,200,revoke?{revoked:true}:{token,expires});return true;
   }
   json(res,404,{error:'지원하지 않는 공유 요청이에요.'});
  }catch(e){json(res,e.status||500,{error:e.status?e.message:'공유 기록을 처리하지 못했어요. 원래 기록은 유지됩니다.'});}
  return true;
 };
 // Serialize requests within one process; storage revision checks also guard multiple instances.
 let queue=Promise.resolve();
 return (req,res,url)=>{if(!url.pathname.startsWith('/api/shared/'))return Promise.resolve(false);const result=queue.then(()=>handle(req,res,url));queue=result.catch(()=>{});return result;};
}
