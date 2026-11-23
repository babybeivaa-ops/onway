import {useId,useState} from 'react';
import type {CenterMessage} from './types';
import './message-replies.css';
export function MessageReplies({message,onReply,disabled=false,onCompose,collapsed=false}:{collapsed?:boolean;message:CenterMessage;onReply?:(text:string)=>void;disabled?:boolean;onCompose?:()=>void}){
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[error,setError]=useState('');const id=useId();
 const replies=(message.replies??[]).map(reply=><section className="message-reply" key={reply.id} aria-label="센터 답변"><header><strong>센터 답변</strong><time dateTime={reply.at}>{new Date(reply.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></header><p>{reply.text}</p></section>);
 return <div className="message-replies">
  {collapsed&&replies.length>0?<details className="message-replies-fold"><summary><span>센터 답변</span><span className="reply-thread-count">{replies.length}</span></summary>{replies}</details>:replies}
  {onReply&&<><button className="message-reply-toggle" type="button" disabled={disabled} aria-expanded={open} aria-controls={id} onClick={()=>{setOpen(v=>!v);if(!open)onCompose?.()}}>{open?'답장 접기':'답장'}</button>
   {open&&<form id={id} className="message-reply-form" onSubmit={event=>{event.preventDefault();setError('');try{onReply(text);setText('');setOpen(false)}catch(e){setError(e instanceof Error?e.message:'답변을 저장하지 못했어요.')}}}>
    <label htmlFor={id+'-text'}>답변 내용</label><textarea id={id+'-text'} rows={3} required value={text} onChange={e=>setText(e.target.value)} disabled={disabled}/>
    <div className="message-reply-actions"><button type="submit" disabled={disabled||!text.trim()}>답변 보내기</button></div>{error&&<p role="alert">{error}</p>}
   </form>}
  </>}
 </div>;
}
