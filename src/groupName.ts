import type {ParticipantCount} from './types';
export type GroupNameKind='auto'|'elementary'|'middle'|'high'|'organization';
const institutionEnding=/(?:센터|문화의집|수련관|수련원|복지관|도서관|어린이집|유치원|기관|동아리|협회|교회|캠프)$/u;
// Complete only an overlapping selected institution name, preserving the user's region prefix.
export function completeInstitutionName(value:string,selectedName?:string):string {
 const name=value.trim(),selected=selectedName?.replace(/\s+/gu,'')??'';
 if(!selected||!institutionEnding.test(selected)||institutionEnding.test(name))return name;
 const compact=name.replace(/\s+/gu,'');
 for(let n=Math.min(compact.length,selected.length);n>=2;n--){if(compact.endsWith(selected.slice(0,n)))return name+selected.slice(n);}
 return name;
}
export function formatSchoolGroupName(value:string|undefined,_counts:ParticipantCount,selectedSchoolName?:string,originMode?:'school'|'other',nameKind:GroupNameKind='auto'):string {
 const selected=originMode==='other'?undefined:selectedSchoolName;
 const raw=value?.trim()??'';
 if(['elementary','middle','high'].includes(nameKind)){const suffix={elementary:'초',middle:'중',high:'고'}[nameKind as 'elementary'|'middle'|'high'];return formatGroupName(raw.replace(/(?:초등학교|중학교|고등학교|학교|초|중|고)$/u,'')+suffix);}
 const completed=completeInstitutionName(raw,selected);
 if(nameKind==='organization')return completed;
 if(institutionEnding.test(completed))return completed;
 const name=formatGroupName(completed).replace(/초등학교(?=\s|$)/g,'초').replace(/중학교(?=\s|$)/g,'중').replace(/고등학교(?=\s|$)/g,'고').replace(/대학교|대학(?=\s|$)/g,'대');
 if(!name||/(?:초|중|고|대|학교)(?:\s|$)/u.test(name))return name;
 const suffix=selected?.match(/(초등학교|중학교|고등학교|대학교|대학)(?:\s|$)/)?.[1];
 return suffix?name+({초등학교:'초',중학교:'중',고등학교:'고',대학교:'대',대학:'대'}[suffix]??''):name;
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
