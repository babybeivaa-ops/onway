import {createPortal} from 'react-dom';
import {useEffect,useId,useRef,useState} from 'react';
import {X,Send} from 'lucide-react';
import {HeartMessageIcon} from './HeartMessageIcon';
import {ChatTimeline} from './ChatTimeline';
import type {DemoGroup} from './workspace';
import './center-chat.css';
export function AdminChatDialog({group,saving=false,saveFailed=false,readOnly,onClose,onSend,onAcknowledge}:{group:DemoGroup;saving?:boolean;saveFailed?:boolean;readOnly:boolean;onClose:()=>void;onSend:(text:string)=>void;onAcknowledge:(id:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
 const [text,setText]=useState(''),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 return createPortal(<dialog ref={dialog} className="onway-chat-dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose()}} onClose={onClose} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}>
 <div className="onway-chat-shell"><header className="onway-chat-header"><HeartMessageIcon/><div><span>ON:WAY</span><h2 id={titleId}>{group.state.organization.name}</h2></div><button type="button" className="onway-chat-close" aria-label="채팅 닫기" autoFocus onClick={onClose}><X size={22}/></button></header>
 <div className="onway-chat-history" tabIndex={0} aria-label="인솔교사와 주고받은 메시지">{group.state.centerMessages?.length?<ChatTimeline messages={group.state.centerMessages} organizationName={group.state.organization.name} viewer="admin" open onAcknowledge={readOnly||saving||saveFailed?undefined:id=>{try{onAcknowledge(id)}catch(e){setError((e as Error).message)}}}/>:<div className="onway-chat-empty"><HeartMessageIcon/><strong>인솔교사에게 먼저 안내해주세요</strong></div>}</div>
 {!readOnly&&<form className="onway-chat-compose" onSubmit={e=>{e.preventDefault();if(saving||saveFailed)return;setError('');try{onSend(text);setText('')}catch(e){setError((e as Error).message)}}}><div className="onway-chat-input-row"><textarea aria-label="인솔교사에게 보낼 메시지" rows={1} placeholder="메시지를 입력해주세요." value={text} onChange={e=>setText(e.target.value)}/><button className="onway-chat-send-icon" type="submit" aria-label="메시지 보내기" title="보내기" disabled={saving||saveFailed||!text.trim()}><Send size={19} aria-hidden="true"/></button></div>{(error||saveFailed)&&<p className="form-error" role="alert">{error||"저장하지 못했어요. 채팅창을 닫고 상단에서 미저장 내용을 백업해주세요."}</p>}</form>}
 </div></dialog>,document.body);
}
