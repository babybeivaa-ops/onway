import {gunzipSync} from 'node:zlib';
import {validWorkspace} from './workspace-schema.mjs';
export function readDemoWorkspace(encoded){
 if(!encoded)return null;
 const backup=JSON.parse(gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:10000000}).toString('utf8'));
 if(backup.format!=='onway-backup'||!validWorkspace(backup.workspace))throw Error('Invalid demo snapshot');
 const workspace={version:2,view:'admin',activeGroupId:backup.workspace.activeGroupId,groups:backup.workspace.groups};
 return {version:'staff-samples-20261026',referenceDate:'2026-10-26',workspace};
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
