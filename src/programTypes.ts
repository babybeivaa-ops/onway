export const programTypes=['취약계층','특성화','공교육','교원연수','가족캠프','당일체험','대관','시범사업'] as const;
export type ProgramType=typeof programTypes[number];
