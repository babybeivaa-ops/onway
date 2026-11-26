import type {DemoGroup} from './workspace';

// Chat reception is independent of the journey/arrival/archive filters.
export function unreadAdminChats(groups:DemoGroup[]){
 return groups.map(group=>({group,count:(group.state.centerMessages??[]).filter(m=>m.sender!=='admin'&&!m.acknowledgedAt&&!m.cancelledAt).length})).filter(row=>row.count>0);
}
export function incomingAdminChats(groups:DemoGroup[]){
 return groups.flatMap(g=>(g.state.centerMessages??[]).filter(m=>m.sender!=='admin'&&!m.acknowledgedAt&&!m.cancelledAt).map(m=>({key:g.id+':'+m.id,groupId:g.id})));
}
