export const programTypes=['시범사업','취약계층','특성화','당일체험','가족캠프','공교육','교원연수','대관','기타사업'] as const;
export type ProgramType=typeof programTypes[number];
