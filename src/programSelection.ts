import {registeredProgramName,normalizedProgramName} from '../public-api/program-names.mjs';
import type {ProgramGroup} from './programPlan';
function university(value:string){
 const compact=value.replace(/\s/g,'');
 const match=compact.match(/^([가-힣]{2,}?)(?:대학교|대)(.*)$/);
 return match?{name:match[1],department:match[2].includes('학과')?match[2]:''}:undefined;
}
function sameUniversity(group:ProgramGroup,name:string){
 const target=university(name);if(!target)return false;
 const sources=[group.name,...group.aliases.split(/[,\n]/)].map(university).filter(s=>s?.name===target.name);
 if(!sources.length)return false;
 const departments=sources.filter(s=>s?.department);
 return !target.department||!departments.length||departments.some(s=>s?.department===target.department);
}
export function selectedProgramRegistration(groups:ProgramGroup[],name:string,date:string,registeredNames:string[]=[name],allowDateMismatch=false){
 const target=normalizedProgramName(name);
 const exact=groups.filter(g=>[g.name,...g.aliases.split(/[,\n]/)].filter(Boolean).some(alias=>normalizedProgramName(registeredProgramName(alias,registeredNames))===target||normalizedProgramName(registeredProgramName(alias,[name]))===target));
 const byName=exact.some(g=>g.start===date)?exact:groups.filter(g=>exact.includes(g)||sameUniversity(g,name));
 const matches=byName.filter(g=>g.start===date);
 if(matches.length>1)throw Error('같은 단체와 입소일의 영역이 여러 개입니다. 해당 단체 일정만 구분된 파일을 사용해주세요.');
 if(matches.length===1)return matches[0];
 if(allowDateMismatch&&byName.length===1)return byName[0];
 if(byName.length)throw Error(`편성표의 ${name} 입소일은 ${[...new Set(byName.map(g=>g.start))].join(', ')}입니다. 선택한 단체 입소일(${date})을 확인해주세요.`);
 throw Error(`편성표에서 ${name} 일정을 찾지 못했어요. 해당 단체가 포함된 파일을 선택해주세요.`);
}
