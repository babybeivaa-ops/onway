import {ChatAttachmentView} from './ChatAttachmentView';
import {Fragment,useEffect,useRef} from 'react';
import {School,Users} from 'lucide-react';
import {SpaceCenterIcon} from './SpaceCenterIcon';
import {chatTimeline} from './chatTimelineModel';
import type {CenterMessage} from './types';
const day=(at:string)=>new Date(at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short'});
const time=(at:string)=>new Date(at).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'});
export function ChatTimeline({messages,open,organizationName,groupId="",token,viewer='guide',onAcknowledge,onCancel}:{messages:CenterMessage[];groupId?:string;token?:string;open:boolean;organizationName:string;viewer?:'admin'|'guide';onAcknowledge?:(id:string)=>void;onCancel?:(id:string)=>void}){
 const isSchool=/(?:학교|초등|중등|고등|대학교|대학|유치원|(?:초|중|고)(?:$|[\s(]))/.test(organizationName);
 const rows=chatTimeline(messages),end=useRef<HTMLDivElement>(null);
 const unread=viewer==='admin'?messages.find(m=>m.sender!=='admin'&&!m.acknowledgedAt&&!m.cancelledAt)?.id:undefined;
 useEffect(()=>{if(!open||!unread||!onAcknowledge)return;const read=()=>{if(document.visibilityState==='visible')onAcknowledge(unread)};const timer=setTimeout(read,300);document.addEventListener('visibilitychange',read);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',read)}},[open,unread,onAcknowledge]);
 const contentKey=JSON.stringify(rows.map(row=>[row.id,row.at,row.text]));
 useEffect(()=>{
  if(!open)return;
  const timeline=end.current?.parentElement;
  const history=timeline?.closest<HTMLElement>('.onway-chat-history');
  if(!timeline||!history)return;
  let frame=0,disposed=false;
  const scrollToLatest=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!disposed)history.scrollTop=history.scrollHeight})};
  // Wait for the dialog and message layout, and follow font/viewport changes.
  const observer=new ResizeObserver(scrollToLatest);
  observer.observe(timeline);observer.observe(history);
  scrollToLatest();
  document.fonts.ready.then(()=>{if(!disposed)scrollToLatest()});
  const onVisible=()=>{if(document.visibilityState==='visible')scrollToLatest()};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',onVisible)};
 },[open,contentKey]);
 const metadata=(row:ReturnType<typeof chatTimeline>[number])=><div className="chat-line-meta">{viewer==='admin'&&row.sender===viewer&&row.acknowledged&&<span>읽음</span>}{viewer==='admin'&&row.sender==='guide'&&!row.cancelled&&!row.acknowledged&&onAcknowledge&&<button type="button" className="chat-acknowledge" onClick={()=>onAcknowledge(row.id)}>확인 완료</button>}{viewer==='admin'&&row.sender===viewer&&row.cancellable&&onCancel&&<button type="button" className="chat-cancel" onClick={()=>{if(window.confirm('이 메시지의 전송을 취소할까요?'))onCancel(row.id)}}>전송 취소</button>}<time dateTime={row.at}>{time(row.at)}</time></div>;
 return <div className="chat-timeline">{rows.map((row,index)=><Fragment key={row.id}>
  {(index===0||day(rows[index-1].at)!==day(row.at))&&<div className="chat-day"><span>{day(row.at)}</span></div>}
  <article className="chat-line" data-sender={row.sender} data-own={row.sender===viewer} aria-label={row.sender==='admin'?'센터 메시지':`${organizationName} 메시지`}>
   <span className="chat-avatar" aria-hidden="true">{row.sender==='admin'?<SpaceCenterIcon size={26}/>:isSchool?<School size={25}/>:<Users size={25}/>}</span>
   <div className="chat-line-content" data-photo={!!(open&&!row.cancelled&&row.attachment?.mime.startsWith('image/'))}><strong>{row.sender==='admin'?'국립청소년우주센터':`${isSchool?'학교':'단체'} · 인솔교사`}</strong><p className="chat-bubble" data-cancelled={row.cancelled}>{row.text}</p>{open&&row.attachment&&!row.cancelled&&<ChatAttachmentView attachment={row.attachment} groupId={groupId} token={token} footer={metadata(row)}/>}{!(open&&row.attachment&&!row.cancelled)?metadata(row):null}</div>
  </article>
 </Fragment>)}<div ref={end}/></div>;
}
