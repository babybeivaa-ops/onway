export type ProgramRowBox={x:number;y:number;right:number;bottom:number};
// A row's leftmost activity supplies the shared printed date/time for every column.
export function programRowAnchor<T extends ProgramRowBox>(row:T,rows:T[],unit:number){
 return rows.filter(other=>Math.abs(other.y-row.y)<unit*.7).sort((a,b)=>a.x-b.x||a.y-b.y)[0]??row;
}
export function programTime(text:string){
 const m=text.replace(/\s/g,'').match(/(\d{1,2}):(\d{2})[~–-](\d{1,2}):?(\d{2})/);
 if(!m||+m[1]>23||+m[3]>23||+m[2]>59||+m[4]>59)return '';
 return `${m[1].padStart(2,'0')}:${m[2]}~${m[3].padStart(2,'0')}:${m[4]}`;
}
