import {GroupMealMenu} from './WeeklyMenus';
import {ProgramSchedule} from './ProgramSchedule';
import './arrival-documents.css';
export function ArrivalDocuments({groupId,date,groupName,registeredNames,token,editable=false,arrivalLunch=false,visitDuration,onArrivalLunchChange}:{registeredNames?:string[];arrivalLunch?:boolean;visitDuration?:string;onArrivalLunchChange?:(included:boolean)=>void;groupId:string;date:string;groupName:string;token?:string;editable?:boolean}){
 return <section className="section arrival-documents" aria-label="입소 안내자료">{editable&&<h2>입소 안내자료</h2>}<ProgramSchedule visitDuration={visitDuration} registeredNames={registeredNames} date={date} groupName={groupName} token={token} editable={editable}/><GroupMealMenu groupId={groupId} date={date} duration={visitDuration} arrivalLunch={arrivalLunch} token={token} editable={editable} onArrivalLunchChange={onArrivalLunchChange}/></section>;
}
