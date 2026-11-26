import type {DemoGroup} from './workspace';

// Chat reception is independent of the journey/arrival/archive filters.
export function unreadAdminChats(groups:DemoGroup[]){
 return groups.map(group=>({group,count:(group.state.centerMessages??[]).filter(m=>m.sender!=='admin'&&!m.acknowledgedAt&&!m.cancelledAt).length})).filter(row=>row.count>0);
}
export function incomingAdminChats(groups:DemoGroup[]){
 return groups.flatMap(g=>(g.state.centerMessages??[]).filter(m=>m.sender!=='admin'&&!m.acknowledgedAt&&!m.cancelledAt).map(m=>({key:g.id+':'+m.id,groupId:g.id})));
}
export function queueAdminChats(groups:DemoGroup[],seen:Set<string>,queued:string[],openGroupId:string|null){
 const incoming=incomingAdminChats(groups);
 const queue=queued.filter(id=>incoming.some(m=>m.groupId===id)&&id!==openGroupId);
 for(const m of incoming)if(!seen.has(m.key)){seen.add(m.key);if(m.groupId!==openGroupId&&!queue.includes(m.groupId))queue.push(m.groupId)}
 return queue;
}
