import {WORKSPACE_KEY,loadWorkspace} from './workspace.ts';
import type {StorageLike,Workspace} from './workspace';
export interface DemoSamples {version:string;referenceDate:string;workspace:Workspace;storage?:Record<string,string>}
export function seedDemoSamples(storage:StorageLike,sample:DemoSamples){
 const marker='onway-samples:'+sample.version;
 if(storage.getItem(marker))return;
 const incoming=loadWorkspace({getItem:key=>key===WORKSPACE_KEY?JSON.stringify(sample.workspace):null,setItem:()=>{}});
 const raw=storage.getItem(WORKSPACE_KEY),existing=raw?loadWorkspace(storage):null;
 const ids=new Set(existing?.groups.map(g=>g.id));
 const groups=[...(existing?.groups??[]),...incoming.groups.filter(g=>!ids.has(g.id))];
 const next:Workspace={version:2,view:'admin',activeGroupId:incoming.activeGroupId,groups};
 storage.setItem(WORKSPACE_KEY,JSON.stringify(next));
 for(const [key,value] of Object.entries(sample.storage??{})){if((key==='onway-program-plans-v1'||/^onway-weekly-menu-v1:\d{4}-\d{2}-\d{2}$/.test(key)||(/^onway-meal-preview-v1:/.test(key)&&!key.endsWith(':backup')))&&storage.getItem(key)===null)storage.setItem(key,value);}
 storage.setItem(marker,'done');
}
