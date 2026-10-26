import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validWorkspace} from './workspace-schema.mjs';

export async function importBackup(store,encoded){
 if(!encoded)return null;
 if(!store)throw Error('Backup import requires persistent cloud storage.');
 const raw=gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:10000000});
 const backup=JSON.parse(raw.toString('utf8'));
 if(backup.format!=='onway-backup'||backup.version!==1||!validWorkspace(backup.workspace)||!Number.isFinite(Date.parse(backup.exportedAt)))throw Error('Invalid deployment backup.');
 const id=createHash('sha256').update(raw).digest('hex');
 const db=await store.load();
 if(db.backupImports?.[id])return {alreadyImported:true,imported:backup.workspace.groups.length,total:db.workspace.groups.length};
 const incoming=new Map(backup.workspace.groups.map(g=>[g.id,g]));
 // Keep changes newer than the uploaded snapshot from being overwritten.
 const newer=value=>value&&typeof value==='object'&&Object.entries(value).some(([key,v])=>
  typeof v==='string'&&(key==='at'||key.endsWith('At'))&&Number.isFinite(Date.parse(v))&&Date.parse(v)>Date.parse(backup.exportedAt)||newer(v));
 for(const g of db.workspace.groups)if(incoming.has(g.id)&&!isDeepStrictEqual(g,incoming.get(g.id))&&newer(g))throw Error('Server records changed after backup export. Import requires reconciliation.');
 const groups=db.workspace.groups.map(g=>incoming.get(g.id)??g);
 const existing=new Set(db.workspace.groups.map(g=>g.id));
 groups.push(...backup.workspace.groups.filter(g=>!existing.has(g.id)));
 const workspace={...db.workspace,view:'admin',activeGroupId:backup.workspace.activeGroupId,groups};
 if(!validWorkspace(workspace))throw Error('Merged backup is invalid.');
 // Preserve the prior workspace inside protected storage for recovery, and preserve all share links.
 const next={...db,revision:db.revision+1,workspace,backupImports:{...db.backupImports,[id]:{exportedAt:backup.exportedAt,importedAt:new Date().toISOString(),groupCount:backup.workspace.groups.length,previousWorkspace:db.workspace}}};
 await store.save(next,db.revision);
 const saved=await store.load();
 if(!saved.backupImports?.[id]||!backup.workspace.groups.every(g=>saved.workspace.groups.some(x=>x.id===g.id&&isDeepStrictEqual(x,g))))throw Error('Backup import verification failed.');
 return {alreadyImported:false,imported:backup.workspace.groups.length,total:saved.workspace.groups.length};
}
