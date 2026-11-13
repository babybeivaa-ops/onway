import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {importBackup} from './import-backup.mjs';
import {documentKey} from './documents.mjs';
import {validateProgramPlan} from './program-plans.mjs';
import {mergeProgramPlan} from './program-merge.mjs';
import {validateWeeklyMenu} from './weekly-menus.mjs';

export async function importFullData(store,documents,encoded){
 if(!encoded)return null;
 if(!store||!documents)throw Error('Full data import requires protected storage');
 const raw=gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:50000000}),bundle=JSON.parse(raw),id=createHash('sha256').update(raw).digest('hex');
 const initial=await store.load();if(initial.fullDataImports?.[id])return {alreadyImported:true,...initial.fullDataImports[id]};
 const workspace=JSON.parse(bundle.storage['onway-workspace-v2']);
 await importBackup(store,gzipSync(JSON.stringify({format:'onway-backup',version:1,exportedAt:bundle.exportedAt,workspace})).toString('base64'));
 // Keep the complete source snapshot privately, including older local backups.
 await documents.write(documentKey('deployment-archive',id,'full'),bundle);
 let count=0;
 async function write(key,value){
  const marker=documentKey('deployment-import',id,key);
  if(await documents.read(marker))return;
  const previous=await documents.read(key);
  if(previous?.updatedAt&&Date.parse(previous.updatedAt)>Date.parse(bundle.exportedAt))throw Error('Newer server document requires reconciliation');
  await documents.write(documentKey('deployment-before',id,key),previous);
  await documents.write(key,value);
  if(!isDeepStrictEqual(await documents.read(key),value))throw Error('Document import verification failed');
  await documents.write(marker,{done:true});count++;
 }
 const plans=JSON.parse(bundle.storage['onway-program-plans-v1']??'[]');
 if(plans.length){const key=documentKey('center-program-plans','2000-01-01','schedule');let merged=(await documents.read(key))?.plans??[];for(const input of plans){const p=validateProgramPlan(input);merged=[...merged.filter(x=>x.week!==p.week),mergeProgramPlan(merged.find(x=>x.week===p.week),p)]}await write(key,{plans:merged})}
 for(const [key,value]of Object.entries(bundle.storage)){
  if(/^onway-weekly-menu-v1:\d{4}-\d{2}-\d{2}$/.test(key)){const menu=validateWeeklyMenu(JSON.parse(value));await write(documentKey('center-weekly-menu',menu.weekStart,'menu'),menu)}
  if(key.startsWith('onway-meal-preview-v1:')&&!key.endsWith(':backup')){const groupId=key.slice('onway-meal-preview-v1:'.length);await write(documentKey(groupId,'2000-01-01','meal-preview'),JSON.parse(value))}
 }
 for(const record of bundle.documents??[]){const [groupId,date]=JSON.parse(record.key);for(const [kind,file]of Object.entries(record.bundle)){const data=file.blob.split(',')[1];await write(documentKey(groupId,date,kind),{name:file.name,size:file.size,updatedAt:file.updatedAt,data})}}
 const db=await store.load();const result={groups:workspace.groups.length,plans:plans.length,documents:count,importedAt:new Date().toISOString()};await store.save({...db,revision:db.revision+1,fullDataImports:{...db.fullDataImports,[id]:result}},db.revision);return result;
}
