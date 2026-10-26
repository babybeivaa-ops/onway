// Dark colors remain readable on white and pale notification backgrounds.
const palette=['#1858b8','#9b2470','#13705a','#884513','#6941a5','#a13032','#12667b','#566b16'];
export function notificationGroupColor(id:string):string{let hash=2166136261;for(const c of id){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}return palette[(hash>>>0)%palette.length];}
