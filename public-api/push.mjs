import * as webpush from 'web-push';
export const makePushKeys=()=>webpush.generateVAPIDKeys();
export function validPushSubscription(s){try{const u=new URL(s.endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))&&typeof s.keys?.p256dh==='string'&&/^[A-Za-z0-9_-]{80,100}$/.test(s.keys.p256dh)&&/^[A-Za-z0-9_-]{20,30}$/.test(s.keys.auth)}catch{return false}}
export function guidePushNotice(before,after){
 const messages=(after.state.centerMessages??[]).filter(m=>m.sender!=='admin'&&!(before.state.centerMessages??[]).some(old=>old.id===m.id));
 if(messages.length)return {title:'ON:WAY · 센터 톡톡',body:after.state.organization.name+'에서 새 메시지를 보냈어요.'};
 if(after.state.reports.some(r=>r.status!=='cancelled'&&!before.state.reports.some(old=>old.id===r.id)))return {title:'ON:WAY · 이동 알림',body:after.state.organization.name+'의 이동 확인 기록이 도착했어요.'};
 if(JSON.stringify(before.state.counts)!==JSON.stringify(after.state.counts)||before.state.countsConfirmedAt!==after.state.countsConfirmedAt)return {title:'ON:WAY · 인원 확인',body:after.state.organization.name+'의 인원 확인 정보가 도착했어요.'};
 return null;
}
export async function sendAdminPush(push,notice,links,now=Date.now()){
 if(!push?.keys||!notice)return;
 const targets=(push.subscriptions??[]).filter(s=>s.expires>now&&(!s.authKey||links[s.authKey]?.expires>now));
 await Promise.allSettled(targets.map(s=>webpush.sendNotification(s.subscription,JSON.stringify({...notice,url:'/?center-admin=1'}),{vapidDetails:{subject:'https://onway-demo.onrender.com',publicKey:push.keys.publicKey,privateKey:push.keys.privateKey},TTL:300,timeout:5000})));
}
