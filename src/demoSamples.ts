import {WORKSPACE_KEY,loadWorkspace} from './workspace.ts';
import type {StorageLike,Workspace} from './workspace';
export interface DemoSamples {version:string;referenceDate:string;workspace:Workspace}
export function seedDemoSamples(storage:StorageLike,sample:DemoSamples){
 const marker='onway-samples:'+sample.version;
 if(storage.getItem(marker))return;
 const incoming=loadWorkspace({getItem:key=>key===WORKSPACE_KEY?JSON.stringify(sample.workspace):null,setItem:()=>{}});
 const raw=storage.getItem(WORKSPACE_KEY),existing=raw?loadWorkspace(storage):null;
 const ids=new Set(existing?.groups.map(g=>g.id));
 const groups=[...(existing?.groups??[]),...incoming.groups.filter(g=>!ids.has(g.id))];
 const next:Workspace={version:2,view:'admin',activeGroupId:incoming.activeGroupId,groups};
 storage.setItem(WORKSPACE_KEY,JSON.stringify(next));
 storage.setItem(marker,'done');
}
