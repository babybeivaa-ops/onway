import {MessageReplies} from './MessageReplies';
import {useId,useState} from 'react';
import {Check} from 'lucide-react';
import {HeartMessageIcon} from './HeartMessageIcon';
import type {CenterMessage,DemoState} from './types';
import type {Dispatch,SetStateAction} from 'react';
import {addCenterMessage} from './centerMessageState';
import {journeyTimeLabel} from './journeyTime';

const stamp=(at:string)=>new Date(at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'})+' '+journeyTimeLabel(at);
function MessageList({messages,onAcknowledge,onReply,admin=false,showAll=false,collapseReplies=false}:{collapseReplies?:boolean;messages:CenterMessage[];showAll?:boolean;onAcknowledge?:(id:string)=>void;onReply?:(id:string,text:string)=>void;admin?:boolean}){
 const [error,setError]=useState('');
 const records=[...messages].sort((a,b)=>(admin?Number(!!a.acknowledgedAt)-Number(!!b.acknowledgedAt):0)||Date.parse(b.at)-Date.parse(a.at));
 const visibleCount=showAll?records.length:admin?Math.max(3,records.filter(message=>!message.acknowledgedAt).length):3;
 const render=(message:CenterMessage)=><article className="center-message" key={message.id}>
  <div className="center-message-meta"><time dateTime={message.at}>{stamp(message.at)}</time><span className={'center-message-status'+(message.acknowledgedAt?' is-confirmed':'')}>{message.acknowledgedAt?<><Check size={13} aria-hidden="true"/>센터 확인 완료</>:'확인 대기'}</span></div>
  <p>{message.text}</p>
  {message.acknowledgedAt?<p className="center-message-receipt">센터 확인 <time dateTime={message.acknowledgedAt}>{stamp(message.acknowledgedAt)}</time></p>:onAcknowledge&&<div className="center-message-confirm"><button className="secondary" type="button" onClick={()=>{setError('');try{onAcknowledge(message.id)}catch(error){setError(error instanceof Error?error.message:'확인 상태를 저장하지 못했어요.')}}}><Check size={15} aria-hidden="true"/>확인 완료</button></div>}
 <MessageReplies collapsed={collapseReplies} message={message} onReply={onReply?text=>onReply(message.id,text):undefined}/>
 </article>;
 return <>{error&&<p role="alert" className="form-error">{error}</p>}{records.slice(0,visibleCount).map(render)}{records.length>visibleCount&&<details className="center-message-older"><summary>{admin?'확인한':'이전'} 전달사항 {records.length-visibleCount}건 보기</summary>{records.slice(visibleCount).map(render)}</details>}</>;
}

export function CenterMessages({messages=[],onAcknowledge,onReply}:{messages?:CenterMessage[];onAcknowledge?:(id:string)=>void;onReply?:(id:string,text:string)=>void}){
 const pending=messages.filter(message=>!message.acknowledgedAt).length;
 return <section className="center-messages admin-center-messages" aria-label="센터 전달사항">
  <h3><HeartMessageIcon/><strong>센터 전달사항</strong><span>{messages.length}건</span>{pending>0&&<span className="center-message-pending-count">미확인 {pending}건</span>}</h3>
  {messages.length?<MessageList messages={messages} onAcknowledge={onAcknowledge} onReply={onReply} admin showAll collapseReplies/>:<p className="center-messages-empty">인솔교사가 남긴 전달사항이 아직 없어요.</p>}
 </section>;
}

export function CenterMessageForm({state,setState,shared}:{state:DemoState;setState:Dispatch<SetStateAction<DemoState>>;shared:boolean}){
 const [text,setText]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [historyOpen,setHistoryOpen]=useState(false);
 const formId=useId();
 const total=state.centerMessages?.length??0;
 const pending=(state.centerMessages??[]).filter(message=>!message.acknowledgedAt).length;
 return <section className="section center-messages" aria-label="센터 톡톡">
  <div className="center-message-heading"><h2><button type="button" className="center-message-history-toggle" aria-expanded={historyOpen} aria-controls={formId+'-content'} onClick={()=>setHistoryOpen(value=>!value)}><HeartMessageIcon/>센터 톡톡<span aria-hidden="true">{historyOpen?'−':'+'}</span></button></h2></div><div id={formId+'-content'} hidden={!historyOpen}>
  <form id={formId} onSubmit={event=>{event.preventDefault();setError('');setNotice('');try{setState(previous=>addCenterMessage(previous,text));setText('');setNotice(shared?'저장 요청을 보냈어요. 상단의 서버 저장 상태를 확인해주세요.':'전달사항을 저장했어요.')}catch(error){setError(error instanceof Error?error.message:'저장하지 못했어요. 다시 시도해주세요.')}}}>
   <p id={formId+'-hint'} className="center-message-hint">전달할 사항이나 문의 내용을 남겨주세요.</p><textarea aria-describedby={formId+'-hint'} aria-label="센터에 전달할 내용" rows={2} maxLength={2000} value={text} onChange={event=>{setText(event.target.value);setNotice('')}}/>
   <div className="center-message-actions"><span>{text.length}/2000자</span><button className="secondary" type="submit" disabled={!text.trim()}>전달사항 남기기</button></div>
   {error&&<p className="form-error" role="alert">{error}</p>}
  </form>
  {notice&&<p className={shared?'fine':'visually-hidden'} role="status">{notice}</p>}
  <section id={formId+'-history'} className="center-message-history" aria-label="남긴 전달사항" hidden={!historyOpen}>
   <div className="center-message-counts"><span>남긴 글 {total}건</span><span className={'center-message-status'+(pending?'':' is-confirmed')}>확인 대기 {pending}건</span></div>
   <MessageList messages={state.centerMessages??[]} showAll collapseReplies/>
  </section>
 </div></section>;
}
