import {ChatComposer} from './ChatComposer';
import type {ChatAttachment} from './types';
import {createPortal} from 'react-dom';
import {useEffect,useId,useRef,useState} from 'react';
import {X,Send} from 'lucide-react';
import {HeartMessageIcon} from './HeartMessageIcon';
import {ChatTimeline} from './ChatTimeline';
import type {DemoGroup} from './workspace';
import './center-chat.css';
export function AdminChatDialog({group,token,saving=false,saveFailed=false,readOnly,onClose,onSend,onAcknowledge,onCancel}:{group:DemoGroup;token?:string;saving?:boolean;saveFailed?:boolean;readOnly:boolean;onCancel:(id:string)=>Promise<void>;onClose:()=>void;onSend:(text:string,attachment?:ChatAttachment)=>void;onAcknowledge:(id:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
 const [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 return createPortal(<dialog ref={dialog} className="onway-chat-dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose()}} onClose={onClose} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}>
 <div className="onway-chat-shell"><header className="onway-chat-header"><HeartMessageIcon/><div><span>ON:WAY</span><h2 id={titleId}>{group.state.organization.name}</h2></div><button type="button" className="onway-chat-close" aria-label="채팅 닫기" autoFocus onClick={onClose}><X size={22}/></button></header>
 <div className="onway-chat-history" tabIndex={0} aria-label="인솔교사와 주고받은 메시지">{group.state.centerMessages?.length?<ChatTimeline groupId={group.id} token={token} messages={group.state.centerMessages} organizationName={group.state.organization.name} viewer="admin" open onCancel={readOnly||saving||saveFailed?undefined:id=>{void onCancel(id).catch(e=>setError((e as Error).message))}} onAcknowledge={saving||saveFailed?undefined:id=>{try{onAcknowledge(id)}catch(e){setError((e as Error).message)}}}/>:<div className="onway-chat-empty"><HeartMessageIcon/><strong>인솔교사에게 먼저 안내해주세요</strong></div>}</div>
 {!readOnly&&<ChatComposer groupId={group.id} token={token} saving={saving} saveFailed={saveFailed} enterToSend onSend={onSend}/>}
 {error&&<p role="alert" className="form-error">{error}</p>}</div></dialog>,document.body);
}
