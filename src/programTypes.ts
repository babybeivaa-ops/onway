export const programTypes=['취약','시범','특성화','공교육','연수','기타'] as const;
export type ProgramType=typeof programTypes[number];
/** Display legacy backups without changing their stored identity or visit schedule. */
export function normalizeProgramType(value:unknown):ProgramType|'' {
 if(typeof value!=='string'||!value)return '';
 if((programTypes as readonly string[]).includes(value))return value as ProgramType;
 const legacy:Record<string,ProgramType>={'취약계층':'취약','시범사업':'시범','교원연수':'연수','당일체험':'기타','가족캠프':'기타','대관':'기타','기타사업':'기타'};
 return legacy[value]??'기타';
}
