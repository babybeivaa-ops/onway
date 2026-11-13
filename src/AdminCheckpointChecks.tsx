import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,CheckCircle2} from 'lucide-react';
import type {DemoState} from './types';
import {adminJourney} from './adminJourney';
export function AdminCheckpointChecks({state,onToggle}:{state:DemoState;onToggle?:(id:string,time?:string)=>void}){
 const steps=adminJourney(state).steps;
 const checks=state.adminCheckpointChecks??[];
 const [editing,setEditing]=useState<string>(),[draft,setDraft]=useState(''),[error,setError]=useState('');
 const [pending,setPending]=useState<{id:string;label:string}>();
 const confirmation=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(pending)confirmation.current?.showModal()},[pending]);
 const begin=(id:string,time:string)=>{if(onToggle){setEditing(id);setDraft(time);setError('')}};
 const save=()=>{const normalized=draft.split(':').map(v=>v.padStart(2,'0')).join(':');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)){setError('00:00~23:59로 입력해주세요.');return}try{onToggle?.(editing!,normalized);setEditing(undefined);setError('')}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.')}};
 return <details className="admin-checkpoint-checks" aria-label="관리자 확인">
 <summary className="admin-checkpoint-toggle"><span className="admin-checkpoint-toggle-icon" aria-hidden="true">＋</span> 지점 출발·통과 확인 (관리자용)</summary>
 <ol className="admin-checkpoint-buttons" style={{width:'max-content',gridTemplateColumns:`repeat(${steps.length}, max-content)`}} aria-label="관리자 지점 확인">{steps.map((step,index)=>{
 const check=checks.find(c=>c.waypointId===step.id);
 const time=check?new Date(check.confirmedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}):'';
 return <li key={step.id}><div className="admin-checkpoint-item"><button type="button" className="admin-checkpoint-step" role="checkbox" aria-checked={!!check} aria-label={step.label+' 관리자 확인'} data-checked={!!check} disabled={!onToggle} onClick={()=>{if(check){setPending({id:step.id,label:step.label});return;}setEditing(undefined);onToggle?.(step.id)}} title={check?'다시 누르면 관리자 확인을 취소합니다.':'누른 시각으로 관리자 확인을 기록합니다.'}><span className="admin-checkpoint-dot" aria-hidden="true">{index+1}{check&&<span className="admin-checkpoint-checkmark">✓</span>}</span><span className="admin-checkpoint-copy"><span className={step.label==='학교·단체 출발'?'school-departure-label':undefined}>{step.label}</span></span></button>
 {check&&(editing===step.id?<span className="admin-checkpoint-time-editor" role="group" aria-label={step.label+' 관리자 확인 시각 수정'} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))save()}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();save()}if(e.key==='Escape'){e.preventDefault();setEditing(undefined);setError('')}}}>{[0,1].map(part=><span key={part} className="admin-time-part">{part===1&&<span aria-hidden="true">:</span>}<input autoFocus={part===0} aria-label={part===0?'관리자 확인 시':'관리자 확인 분'} type="text" inputMode="numeric" placeholder="00" maxLength={2} value={draft.split(':')[part]??''} onFocus={e=>e.currentTarget.select()} onChange={e=>{const value=e.target.value.replace(/\D/g,'').slice(0,2);setDraft(old=>{const parts=old.split(':');parts[part]=value;return parts.join(':')})}}/></span>)}</span>:<button type="button" className="admin-checkpoint-time" disabled={!onToggle} title="더블클릭 또는 Enter로 시각 수정" aria-label={step.label+' 관리자 확인 시각 '+time+' 수정'} onDoubleClick={()=>begin(step.id,time)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();begin(step.id,time)}}}><time dateTime={check.confirmedAt}>{time}</time></button>)}
 </div></li>})}</ol><p className="admin-checkpoint-time-hint">시간을 수정하려면 더블클릭해주세요. 체크를 해제하려면 확인칸을 한 번 더 클릭해주세요.</p>{error&&<p role="alert">{error}</p>}
 {pending&&createPortal(<dialog ref={confirmation} className="onway-check-reset-dialog" aria-labelledby="check-reset-title" onCancel={()=>setPending(undefined)}><header><span className="check-reset-icon"><CheckCircle2 size={22}/></span><h2 id="check-reset-title">관리자 확인 해제</h2><button type="button" className="check-reset-close" aria-label="닫기" onClick={()=>setPending(undefined)}><X size={18}/></button></header><p><strong>{pending.label}</strong> 확인을 해제하시겠습니까?</p><div className="check-reset-actions"><button type="button" autoFocus onClick={()=>setPending(undefined)}>취소</button><button type="button" className="check-reset-confirm" onClick={()=>{setEditing(undefined);onToggle?.(pending.id);setPending(undefined)}}>확인 해제</button></div></dialog>,document.body)}
 </details>;
}
