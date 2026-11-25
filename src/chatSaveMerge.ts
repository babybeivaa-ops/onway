import type {Workspace} from './workspace';
export function mergeChatSave(base:Workspace,draft:Workspace,latest:Workspace):Workspace|null{
 const strip=(w:Workspace)=>JSON.stringify(w.groups.map(g=>({...g,state:{...g.state,centerMessages:undefined}})));
 if(strip(base)!==strip(draft))return null;
 const result=structuredClone(latest);
 for(const group of draft.groups){const old=base.groups.find(g=>g.id===group.id);if(!old)return null;
 const before=old.state.centerMessages??[],after=group.state.centerMessages??[];
 if(JSON.stringify(before)===JSON.stringify(after))continue;
 const target=result.groups.find(g=>g.id===group.id);if(!target)return null;
 const messages=target.state.centerMessages??=[];
 for(const original of before){const changed=after.find(m=>m.id===original.id);if(!changed)return null;
 if(JSON.stringify(changed)===JSON.stringify(original))continue;
 const current=messages.find(m=>m.id===original.id);if(!current)return null;
 const core=(m:typeof original)=>JSON.stringify({...m,acknowledgedAt:undefined,replies:undefined});
 if(current.cancelledAt&&!original.cancelledAt&&core(changed)===core(original)&&JSON.stringify(changed.replies??[])===JSON.stringify(original.replies??[]))continue;
 if(core(changed)!==core(original)||core(current)!==core(original))return null;
 if(original.acknowledgedAt&&changed.acknowledgedAt!==original.acknowledgedAt)return null;
 current.acknowledgedAt=current.acknowledgedAt??changed.acknowledgedAt;
 for(const reply of original.replies??[])if(!changed.replies?.some(r=>JSON.stringify(r)===JSON.stringify(reply)))return null;
 for(const reply of changed.replies??[]){const present=current.replies?.find(r=>r.id===reply.id);if(present&&JSON.stringify(present)!==JSON.stringify(reply))return null;if(!present)(current.replies??=[]).push(reply);}
 }
 for(const message of after.filter(m=>!before.some(o=>o.id===m.id))){const present=messages.find(m=>m.id===message.id);if(present){if(present.text!==message.text||present.at!==message.at||present.sender!==message.sender)return null;}else messages.push(structuredClone(message));}
 }
 return result;
}
