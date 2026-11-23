import {Fragment,useEffect,useRef} from 'react';
import {School,Users} from 'lucide-react';
import {SpaceCenterIcon} from './SpaceCenterIcon';
import {chatTimeline} from './chatTimelineModel';
import type {CenterMessage} from './types';
const day=(at:string)=>new Date(at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short'});
const time=(at:string)=>new Date(at).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'});
export function ChatTimeline({messages,open,organizationName,viewer='guide',onAcknowledge}:{messages:CenterMessage[];open:boolean;organizationName:string;viewer?:'admin'|'guide';onAcknowledge?:(id:string)=>void}){
 const isSchool=/(?:학교|초등|중등|고등|대학교|대학|유치원|(?:초|중|고)(?:$|[\s(]))/.test(organizationName);
 const rows=chatTimeline(messages),end=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(open)end.current?.scrollIntoView({block:'end'});},[open,rows.length]);
 return <div className="chat-timeline">{rows.map((row,index)=><Fragment key={row.id}>
  {(index===0||day(rows[index-1].at)!==day(row.at))&&<div className="chat-day"><span>{day(row.at)}</span></div>}
  <article className="chat-line" data-sender={row.sender} data-own={row.sender===viewer} aria-label={row.sender==='admin'?'센터 메시지':`${organizationName} 메시지`}>
   <span className="chat-avatar" aria-hidden="true">{row.sender==='admin'?<SpaceCenterIcon size={26}/>:isSchool?<School size={25}/>:<Users size={25}/>}</span>
   <div className="chat-line-content"><strong>{row.sender==='admin'?'국립청소년우주센터':`${isSchool?'학교':'단체'} · 인솔교사`}</strong><p className="chat-bubble">{row.text}</p><div className="chat-line-meta">{row.sender!=='admin'&&row.acknowledged&&<span>센터 확인</span>}{viewer==='admin'&&row.sender==='guide'&&!row.acknowledged&&onAcknowledge&&<button type="button" className="chat-acknowledge" onClick={()=>onAcknowledge(row.id)}>확인 완료</button>}<time dateTime={row.at}>{time(row.at)}</time></div></div>
  </article>
 </Fragment>)}<div ref={end}/></div>;
}
