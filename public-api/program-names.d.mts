import type {ProgramPlan} from '../src/programPlan';
export function normalizedProgramName(value:string):string;
export function registeredProgramName(source:string,names:string[]):string;
export function preferRegisteredProgramNames(plan:ProgramPlan,names:string[]):ProgramPlan;
