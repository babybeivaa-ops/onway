// Format display names without modifying stored registration data.
import type {ParticipantCount} from './types';
import {participantRows} from './participantRows.ts';
export function formatSchoolGroupName(value:string|undefined, counts:ParticipantCount):string {
 let name=formatGroupName(value).replace(/초등학교(?=\s|$)/g,'초').replace(/중학교(?=\s|$)/g,'중').replace(/고등학교(?=\s|$)/g,'고');
 if(!name || /(?:초|중|고|학교|대학교|대학|유치원|어린이집|센터|복지관|기관|동아리|협회|교회)(?:\s|$)/u.test(name))return name;
 const levels=new Set(participantRows(counts).map(row=>row.level));
 if(levels.size!==1 || (counts.youthDetails?.unclassified??0)>0)return name;
 const level=[...levels][0];
 const suffix=level==='elementary'?'초':level==='middle'?'중':level==='high'?'고':'';
 return name+suffix;
}
const regions = ['창원','영암','고흥','순천','광주','서울','부산','대구','인천','대전','울산','세종','수원','용인','성남','고양','김해','진주','목포','여수','나주','전주','군산','익산','청주','충주','천안','아산','춘천','원주','강릉','포항','경주','구미','제주','서귀포'];
export function formatGroupName(value: string | undefined): string {
 const name = value?.trim() ?? '';
 if (/\s/u.test(name)) return name;
 const region = regions.find(prefix => name.startsWith(prefix));
 if (!region) return name;
 const school = name.slice(region.length);
 return /^[가-힣A-Za-z0-9]+(?:초등학교|중학교|고등학교|초|중|고)$/u.test(school) ? region + ' ' + school : name;
}
