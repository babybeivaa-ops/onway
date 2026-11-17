import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validWorkspace} from './workspace-schema.mjs';
export function readDemoWorkspace(encoded,documentsEncoded){
 if(!encoded)return null;
 const backup=JSON.parse(gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:10000000}).toString('utf8'));
 if(backup.format!=='onway-backup'||!validWorkspace(backup.workspace))throw Error('Invalid demo snapshot');
 const workspace={version:2,view:'admin',activeGroupId:backup.workspace.activeGroupId,groups:backup.workspace.groups};
  const storage={};
 if(documentsEncoded){
  const bundle=JSON.parse(gunzipSync(Buffer.from(documentsEncoded,'base64'),{maxOutputLength:50000000}).toString('utf8'));
  for(const [key,value] of Object.entries(bundle.storage??{})){
   if(key==='onway-program-plans-v1'||/^onway-weekly-menu-v1:\d{4}-\d{2}-\d{2}$/.test(key)||(/^onway-meal-preview-v1:/.test(key)&&!key.endsWith(':backup'))){
    if(typeof value!=='string')throw Error('Invalid demo document');JSON.parse(value);storage[key]=value;
   }
  }
 }
 const referenceDate=/^\d{4}-\d{2}-\d{2}$/.test(backup.referenceDate??'')?backup.referenceDate:'2026-10-26';
 return {version:'staff-samples-'+createHash('sha256').update(encoded+(documentsEncoded||'')).digest('hex').slice(0,16),referenceDate,workspace,storage};
}
export async function removeServerOnlyGroups(store,sample){
 if(!store||!sample)throw Error('Group cleanup requires cloud storage and the approved snapshot');
 const db=await store.load(),retained=new Set(sample.workspace.groups.map(g=>g.id));
 if(retained.size!==11||![...retained].every(id=>db.workspace.groups.some(g=>g.id===id)))throw Error('Expected all 11 restored groups before cleanup');
 const removed=db.workspace.groups.filter(g=>!retained.has(g.id));
 if(!removed.length)return {removed:0,total:db.workspace.groups.length};
 if(removed.length!==2)throw Error('Server-only groups changed; cleanup requires review');
 const workspace={...db.workspace,groups:db.workspace.groups.filter(g=>retained.has(g.id))};
 if(!retained.has(workspace.activeGroupId))workspace.activeGroupId=sample.workspace.activeGroupId;
 const links=Object.fromEntries(Object.entries(db.links??{}).filter(([,link])=>!removed.some(g=>g.id===link.groupId)));
 const next={...db,revision:db.revision+1,workspace,links,removedServerGroups:{at:new Date().toISOString(),groups:removed}};
 await store.save(next,db.revision);
 const saved=await store.load();
 if(saved.workspace.groups.length!==11||saved.workspace.groups.some(g=>!retained.has(g.id)))throw Error('Group cleanup verification failed');
 return {removed:removed.length,total:saved.workspace.groups.length};
}
