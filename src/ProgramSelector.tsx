import {programTypes,normalizeProgramType} from './programTypes';
import type {ProgramType} from './programTypes';
export function ProgramField({value,onChange}:{value:ProgramType|'';onChange:(value:ProgramType|'')=>void}){return <label>사업 구분<select value={normalizeProgramType(value)} onChange={e=>onChange(e.target.value as ProgramType|'')}><option value="">사업 선택</option>{programTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></label>}
