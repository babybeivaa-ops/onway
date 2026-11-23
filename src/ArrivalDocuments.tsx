import {useId,useState} from 'react';
import {JourneyToSpaceIcon} from './CloudMascot';
import {GroupMealMenu} from './WeeklyMenus';
import {ProgramSchedule} from './ProgramSchedule';
import './arrival-documents.css';
export function ArrivalDocuments({groupId,date,groupName,registeredNames,token,editable=false,arrivalLunch=false,visitDuration,onArrivalLunchChange,onProgramDatesChange}:{onProgramDatesChange?:(start:string,end:string)=>void|Promise<void>;registeredNames?:string[];arrivalLunch?:boolean;visitDuration?:string;onArrivalLunchChange?:(included:boolean)=>void;groupId:string;date:string;groupName:string;token?:string;editable?:boolean}){
 const [open,setOpen]=useState(false);const contentId=useId();
 return <section className="section arrival-documents" aria-label="입소 안내자료">{editable&&<h2 className="arrival-documents-heading"><button type="button" className="arrival-documents-toggle" aria-expanded={open} aria-controls={contentId} onClick={()=>setOpen(value=>!value)}><span className="arrival-registration-icon" aria-hidden="true"><JourneyToSpaceIcon/></span><span>입소 안내자료</span><small className="arrival-documents-hint">일정표와 식단표를 등록해주세요.</small><span className="arrival-documents-marker" aria-hidden="true">{open?"−":"+"}</span></button></h2>}<div id={contentId} hidden={editable&&!open}><ProgramSchedule onProgramDatesChange={onProgramDatesChange} visitDuration={visitDuration} registeredNames={registeredNames} date={date} groupName={groupName} token={token} editable={editable}/><GroupMealMenu groupId={groupId} date={date} duration={visitDuration} arrivalLunch={arrivalLunch} token={token} editable={editable} onArrivalLunchChange={onArrivalLunchChange}/></div></section>;
}
