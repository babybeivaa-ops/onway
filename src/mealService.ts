import type {Workspace} from './workspace';
export function mealServiceSummary(duration:string|undefined,arrivalLunch=false){
 if(['당일','2시간','4시간'].includes(duration??''))return arrivalLunch?'입소일 점심 포함 · 그 외 식사는 센터 안내를 확인해주세요.':'당일 식사 이용은 센터 안내를 확인해주세요.';
 return arrivalLunch?'입소일 점심부터 퇴소일 점심까지':'입소일 저녁부터 퇴소일 점심까지';
}
export function setArrivalLunch(workspace:Workspace,id:string,included:boolean):Workspace{
 if(typeof included!=='boolean')throw Error('입소일 점심 포함 여부를 확인해주세요.');
 if(!workspace.groups.some(group=>group.id===id))throw Error('단체를 찾지 못했어요.');
 return {...workspace,groups:workspace.groups.map(group=>group.id===id?{...group,state:{...group.state,organization:{...group.state.organization,arrivalLunch:included}}}:group)};
}
