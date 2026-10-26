import {ProgramField} from './ProgramSelector';
import type {ProgramType} from './programTypes';
import {VisitScheduleFields} from './VisitScheduleFields';
import type {VisitDuration} from './VisitScheduleFields';

export function GroupBasicFields({name,onName,date,onDate,programType,onProgram,duration,onDuration,notes,onNotes}:{name:string;onName:(value:string)=>void;date:string;onDate?:(value:string)=>void;programType:ProgramType|'';onProgram:(value:ProgramType|'')=>void;duration:VisitDuration|'';onDuration:(value:VisitDuration|'')=>void;notes:string;onNotes:(value:string)=>void}){
 return <div className="registration-basic-grid">
  <label>단체명<input required maxLength={80} value={name} onChange={e=>onName(e.target.value)} placeholder="예: 울산 동평초등학교"/></label>
  <label>이동일<input required type="date" value={date} readOnly={!onDate} onChange={e=>onDate?.(e.target.value)} title={onDate?undefined:'이동일 변경에서 수정할 수 있어요.'}/></label>
  <ProgramField value={programType} onChange={onProgram}/>
  <VisitScheduleFields compact programType={programType} duration={duration} notes={notes} onDuration={onDuration} onNotes={onNotes}/>
 </div>;
}
