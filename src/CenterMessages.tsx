import {createPortal} from 'react-dom';
import {ChatTimeline} from './ChatTimeline';
import './center-chat.css';
import {MessageReplies} from './MessageReplies';
import {useEffect,useRef,useId,useState} from 'react';
import {Check,X,Send} from 'lucide-react';
import {HeartMessageIcon} from './HeartMessageIcon';
import type {CenterMessage,DemoState} from './types';
import type {Dispatch,SetStateAction} from 'react';
import {addCenterMessage} from './centerMessageState';
import {journeyTimeLabel} from './journeyTime';

const stamp=(at:string)=>new Date(at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'})+' '+journeyTimeLabel(at);
function MessageList({messages,onAcknowledge,onReply,admin=false,showAll=false,collapseReplies=false}:{collapseReplies?:boolean;messages:CenterMessage[];showAll?:boolean;onAcknowledge?:(id:string)=>void;onReply?:(id:string,text:string)=>void;admin?:boolean}){
 const [error,setError]=useState('');
 const records=[...messages].sort((a,b)=>(admin?Number(a.sender==='admin'||!!a.acknowledgedAt)-Number(b.sender==='admin'||!!b.acknowledgedAt):0)||Date.parse(b.at)-Date.parse(a.at));
 const visibleCount=showAll?records.length:admin?Math.max(3,records.filter(message=>message.sender!=='admin'&&!message.acknowledgedAt&&!message.cancelledAt).length):3;
 const render=(message:CenterMessage)=><article className="center-message" data-sender={message.sender??'guide'} key={message.id}>
  <div className="center-message-meta"><strong>{message.sender==='admin'?'센터':'인솔교사'}</strong><time dateTime={message.at}>{stamp(message.at)}</time><span className={'center-message-status'+(message.acknowledgedAt?' is-confirmed':'')}>{message.sender==='admin'?'센터에서 보낸 메시지':message.acknowledgedAt?<><Check size={13} aria-hidden="true"/>센터 확인 완료</>:'확인 대기'}</span></div>
  <p>{message.text}</p>
  {message.sender==='admin'?null:message.acknowledgedAt?<p className="center-message-receipt">센터 확인 <time dateTime={message.acknowledgedAt}>{stamp(message.acknowledgedAt)}</time></p>:onAcknowledge&&<div className="center-message-confirm"><button className="secondary" type="button" onClick={()=>{setError('');try{onAcknowledge(message.id)}catch(error){setError(error instanceof Error?error.message:'확인 상태를 저장하지 못했어요.')}}}><Check size={15} aria-hidden="true"/>확인 완료</button></div>}
 <MessageReplies collapsed={collapseReplies} message={message} onReply={onReply?text=>onReply(message.id,text):undefined}/>
 </article>;
 return <>{error&&<p role="alert" className="form-error">{error}</p>}{records.slice(0,visibleCount).map(render)}{records.length>visibleCount&&<details className="center-message-older"><summary>{admin?'확인한':'이전'} 전달사항 {records.length-visibleCount}건 보기</summary>{records.slice(visibleCount).map(render)}</details>}</>;
}

export function CenterMessages({messages=[],onAcknowledge,onReply,onSend}:{onSend?:(text:string)=>void;messages?:CenterMessage[];onAcknowledge?:(id:string)=>void;onReply?:(id:string,text:string)=>void}){
 const [text,setText]=useState(''),[sendError,setSendError]=useState(''),[sent,setSent]=useState(false);
 const pending=messages.filter(message=>message.sender!=='admin'&&!message.acknowledgedAt&&!message.cancelledAt).length;
 return <section className="center-messages admin-center-messages" aria-label="센터 전달사항">
  <h3><HeartMessageIcon/><strong>센터 전달사항</strong><span>{messages.length}건</span>{pending>0&&<span className="center-message-pending-count">미확인 {pending}건</span>}</h3>
  {messages.length?<MessageList messages={messages} onAcknowledge={onAcknowledge} onReply={onReply} admin showAll collapseReplies/>:<p className="center-messages-empty">아직 주고받은 메시지가 없어요.</p>}
  {onSend&&<form className="center-message-compose" onSubmit={event=>{event.preventDefault();setSendError('');setSent(false);try{onSend(text);setText('');setSent(true)}catch(e){setSendError((e as Error).message)}}}><label>인솔교사에게 먼저 메시지 보내기<textarea rows={3} value={text} onChange={e=>{setText(e.target.value);setSent(false)}} placeholder="이 단체 인솔교사에게 안내할 내용을 입력해주세요."/></label><div className="center-message-actions"><button type="submit" className="secondary" disabled={!text.trim()}>메시지 보내기</button></div>{sendError&&<p role="alert">{sendError}</p>}{sent&&<p className="fine" role="status">저장 요청을 보냈어요. 상단의 서버 저장 상태를 확인해주세요.</p>}</form>}
 </section>;
}

export function CenterMessageForm({messages,state,setState,shared,open,onClose,saving=false,saveFailed=false,sender='guide',onCancel}:{sender?:'admin'|'guide';onCancel:(id:string)=>Promise<void>;messages?:CenterMessage[];state:DemoState;setState:Dispatch<SetStateAction<DemoState>>;shared:boolean;open:boolean;onClose:()=>void;saving?:boolean;saveFailed?:boolean}){
 const [text,setText]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),formId=useId();
 const unreadKey=(state.centerMessages??[]).filter(m=>(m.sender??'guide')!==sender&&!m.acknowledgedAt&&!m.cancelledAt).map(m=>m.id).join('|');
 useEffect(()=>{if(!open||saving||saveFailed||!unreadKey)return;
 const read=()=>{if(document.visibilityState!=='visible'||!dialog.current?.open)return;try{setState(previous=>{const at=new Date().toISOString();return {...previous,centerMessages:(previous.centerMessages??[]).map(m=>(m.sender??'guide')!==sender&&!m.acknowledgedAt&&!m.cancelledAt?{...m,acknowledgedAt:at}:m)}})}catch{/* Retry after the active save completes. */}};
 const timer=setTimeout(read,100);document.addEventListener('visibilitychange',read);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',read)};
 },[open,saving,saveFailed,unreadKey,sender]);

 useEffect(()=>{const element=dialog.current;if(!element)return;if(open&&!element.open)element.showModal();if(!open&&element.open)element.close();},[open]);
 return createPortal(<dialog ref={dialog} className="onway-chat-dialog" aria-labelledby={formId+'-title'} onCancel={event=>{event.preventDefault();onClose()}} onClose={onClose} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose()}}>
  <div className="onway-chat-shell"><header className="onway-chat-header"><HeartMessageIcon/><div><span>ON:WAY</span><h2 id={formId+'-title'}>{state.organization.name}</h2></div><button type="button" className="onway-chat-close" aria-label="채팅 닫기" onClick={onClose} autoFocus><X size={22}/></button></header>
  <div className="onway-chat-history" aria-label="센터와 주고받은 메시지" tabIndex={0}>
   {((messages??state.centerMessages)?.length??0)>0?<ChatTimeline messages={messages??state.centerMessages??[]} open={open} organizationName={state.organization.name} viewer={sender} onCancel={saving||saveFailed?undefined:id=>{void onCancel(id).catch(e=>setError((e as Error).message))}}/>:<div className="onway-chat-empty"><HeartMessageIcon/><strong>센터에 편하게 말씀해주세요</strong><p>이동 상황이나 궁금한 내용을 남겨주세요.<br/>담당자가 확인 후 답변드립니다.</p></div>}
  </div>
  <form className="onway-chat-compose" onSubmit={event=>{event.preventDefault();if(saving||saveFailed)return;setError('');setNotice('');try{setState(previous=>addCenterMessage(previous,text,sender));setText('');setNotice(shared?'저장 요청을 보냈어요.':'메시지를 저장했어요.')}catch(error){setError(error instanceof Error?error.message:'저장하지 못했어요. 다시 시도해주세요.')}}}>
   <div className="onway-chat-input-row"><textarea onKeyDown={e=>{if(sender!=='admin'||e.key!=='Enter'||e.shiftKey||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229)return;e.preventDefault();if(!saving&&!saveFailed&&text.trim()&&!e.repeat)e.currentTarget.form?.requestSubmit()}} aria-label={sender==='admin'?'인솔교사에게 보낼 메시지':'센터에 보낼 메시지'} id={formId+'-text'} rows={1} value={text} placeholder="메시지를 입력해주세요." onChange={event=>{setText(event.target.value);setNotice('')}}/>
   <button className="onway-chat-send-icon" type="submit" aria-label={saving?'저장 중':'메시지 보내기'} title="보내기" disabled={saving||saveFailed||!text.trim()}><Send size={19} aria-hidden="true"/></button></div>
   {(error||saveFailed)&&<p className="form-error" role="alert">{error||'저장하지 못했어요. 화면 상단의 서버 저장 상태를 확인해주세요.'}</p>}{notice&&!error&&!saveFailed&&<p className="onway-chat-notice" role="status">{saving?'서버에 저장 중이에요.':notice}</p>}
  </form></div>
 </dialog>,document.body);
}
