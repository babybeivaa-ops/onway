import {normalizedProgramName} from './program-names.mjs';
const names=g=>new Set([g.name,...g.aliases.split(/[,\n]/)].map(normalizedProgramName).filter(Boolean));
export function mergeProgramPlan(previous,incoming){
 if(!previous)return incoming;
 const groups=[...previous.groups];
 for(const next of incoming.groups){
  const nextNames=names(next);
  const matches=groups.map((g,i)=>({g,i})).filter(({g})=>g.start===next.start&&[...names(g)].some(n=>nextNames.has(n)));
  if(matches.length>1)throw Error('같은 단체 일정이 중복되어 있어요. 기존 일정을 확인해주세요.');
  if(matches.length)groups[matches[0].i]=next;else groups.push(next);
 }
 return {...previous,...incoming,groups};
}
