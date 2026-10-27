export type VisitDuration='당일'|'1박 2일'|'2박 3일'|'2시간'|'4시간';
export function VisitScheduleFields({duration,notes,onDuration,onNotes,programType,compact=false}:{programType?:string;duration:VisitDuration|'';notes:string;onDuration:(v:VisitDuration|'')=>void;onNotes:(v:string)=>void;compact?:boolean}){
 const options:VisitDuration[]=['당일','1박 2일','2박 3일','2시간','4시간'];
 const notesField=<label>특이사항<textarea rows={compact?2:3} maxLength={2000} value={notes} onChange={e=>onNotes(e.target.value)} placeholder="단체별로 확인할 내용을 입력해주세요."/></label>;
 return <><label>일정<select value={duration} onChange={e=>onDuration(e.target.value as VisitDuration|'')}><option value="">일정 선택</option>{options.map(v=><option key={v}>{v}</option>)}</select></label>{compact?<details className="registration-optional"><summary>특이사항{notes.trim()?' · 작성됨':' (선택)'}</summary>{notesField}</details>:notesField}</>;
}
