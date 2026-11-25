import {JourneyCloudScene} from './JourneyCloudScene';
import {FittedStatusLabel} from './FittedStatusLabel';
import {journeyTimeLabel} from './journeyTime';
import {JourneyToSpaceIcon,BusCloudIcon,CloudMascot} from './CloudMascot';
import {Clock3,BusFront,Route,UtensilsCrossed,Navigation,Flag,MapPinCheck,Coffee} from 'lucide-react';
import type {DemoState} from './types';
import {adminCardJourney} from './adminJourney';

function BridgeIcon({size=24}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 16h20M6 5v15M18 5v15M2 12c2 0 4-4 4-7 3 8 9 8 12 0 0 3 2 7 4 7M10 11v5M14 11v5"/></svg>}
const icons={waiting:Clock3,departed:BusFront,interchange:Route,eating:UtensilsCrossed,mealDeparted:Navigation,bridge:BridgeIcon,rest:Coffee,passed:MapPinCheck,arrived:Flag};
export function JourneyStatus({state,compact=false,sceneIcons=false}:{state:DemoState;compact?:boolean;sceneIcons?:boolean}){
 const {current,phase,recordedAt}=adminCardJourney(state),Icon=icons[phase];
 const validTime=recordedAt&&!Number.isNaN(new Date(recordedAt).getTime())?recordedAt:undefined;
 const timeLabel=validTime?journeyTimeLabel(validTime):'';
 return <span className={'journey-badge'+(compact?' journey-badge-compact':'')} data-phase={phase} data-admission-complete={!!state.admissionCompletedAt} aria-label={'현재 상황: '+current+(timeLabel?' / '+timeLabel:'')}><span className="journey-badge-icon" aria-hidden="true">{state.admissionCompletedAt?<JourneyToSpaceIcon/>:sceneIcons&&phase!=='arrived'&&phase!=='waiting'?<JourneyCloudScene scene={/나로우주센터/.test(current)?'space':phase==='interchange'?'ic':phase==='bridge'||/대교/.test(current)?'bridge':'road'}/>:['departed','interchange','mealDeparted','bridge','passed'].includes(phase)?<BusCloudIcon/>:<CloudMascot size={sceneIcons?64:compact?25:43}/>}</span><span className="journey-badge-copy">{!compact&&<small>현재 상황</small>}<FittedStatusLabel text={current} compact={compact} singleLine={sceneIcons}/>{state.admissionCompletedAt?null:validTime?<time className="journey-status-time" dateTime={validTime}>{timeLabel}</time>:<span className="journey-status-time journey-status-time-placeholder" aria-hidden="true">&nbsp;</span>}</span></span>;
}
