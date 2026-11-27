import {useEffect,useRef,useState} from 'react';
import {X,Check} from 'lucide-react';
import {ParticipantEditor} from './ParticipantEditor';
import {normalizeCounts} from './participantCounts';
import type {DemoGroup} from './workspace';
import type {ParticipantCount} from './types';
export function AdminCountDialog({group,onSave,onClose}:{group:DemoGroup;onSave:(counts:ParticipantCount)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [counts,setCounts]=useState<ParticipantCount>(()=>structuredClone(group.state.counts));
 const [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal()},[]);
 return <dialog className="guide-count-dialog admin-count-dialog" ref={dialog} aria-labelledby="admin-count-title" onCancel={onClose}><div className="dialog-head"><h2 id="admin-count-title">인원 수정</h2><button type="button" className="icon-button" aria-label="인원 수정 창 닫기" onClick={onClose}><X/></button></div><form onSubmit={e=>{e.preventDefault();try{onSave(normalizeCounts(counts));onClose()}catch(e){setError((e as Error).message)}}}><div className="guide-count-scroll"><p className="participant-edit-hint">{group.state.organization.name}</p><ParticipantEditor quickEdit name={group.state.organization.name} value={counts} onChange={setCounts}/>{error&&<p className="form-error" role="alert">{error}</p>}</div><button type="submit" className="primary">변경 저장하기<Check size={19}/></button></form></dialog>;
}
