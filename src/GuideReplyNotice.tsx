import {useEffect,useLayoutEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BellRing,ChevronRight} from 'lucide-react';
import type {CenterMessage} from './types';
import {sharedRequest} from './sharedClient';
import {WORKSPACE_KEY} from './workspace';
import {DEMO_STORAGE_PREFIX} from './demoStorage';
import './guide-reply-notice.css';
const storageKey='onway-guide-replies-read-v1';
function readIds():string[]{try{const value=JSON.parse(localStorage.getItem(storageKey)??'[]');return Array.isArray(value)?value.filter((id:unknown)=>typeof id==='string'):[]}catch{return []}}
export function GuideReplyNotice({groupId,messages=[],token,anchorId}:{groupId:string;messages?:CenterMessage[];token?:string;anchorId:string}){
 const [read,setRead]=useState(readIds),[live,setLive]=useState<CenterMessage[]>([]),[open,setOpen]=useState(false),[anchor,setAnchor]=useState<HTMLElement|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 useLayoutEffect(()=>setAnchor(document.getElementById(anchorId)),[anchorId]);
 // Read only reply updates, even while the main workspace preserves an unfinished form.
 useEffect(()=>{
  let alive=true,busy=false;
  const workspaceKey=(new URLSearchParams(location.search).get('demo')==='1'?DEMO_STORAGE_PREFIX:'')+WORKSPACE_KEY;
  const load=async()=>{if(busy)return;busy=true;try{const workspace=token?(await sharedRequest(token,'workspace')).workspace:JSON.parse(localStorage.getItem(workspaceKey)??'null');const incoming=workspace?.groups?.find((g:{id:string})=>g.id===groupId)?.state?.centerMessages;if(alive&&Array.isArray(incoming))setLive(incoming)}catch{/* The main screen displays connection errors; retain known replies. */}finally{busy=false}};
  const changed=(event:StorageEvent)=>{if(event.key===storageKey)setRead(readIds());if(!token&&(event.key===workspaceKey||event.key===null))void load()};
  const refresh=()=>{if(document.visibilityState==='visible')void load()};
  void load();const timer=setInterval(refresh,5000);window.addEventListener('storage',changed);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('storage',changed);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
 },[groupId,token]);
 const merged=new Map<string,{id:string;text:string;at:string;question:string;key:string}>();
 for(const message of [...messages,...live])for(const reply of message.replies??[]){const key=groupId+':'+message.id+':'+reply.id;merged.set(key,{...reply,question:message.text,key})}
 const pending=[...merged.values()].filter(reply=>!read.includes(reply.key)).sort((a,b)=>a.at.localeCompare(b.at));const current=pending[0];
 useEffect(()=>{if(!current){setOpen(false);return;}if(open)dialog.current?.showModal();else dialog.current?.close();return()=>dialog.current?.close()},[open,current?.key]);
 if(!current)return null;
 const confirm=()=>{const next=[...new Set([...readIds(),...read,current.key])];setRead(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{/* Keep read status for this session. */}};
 return <>{anchor&&createPortal(<div className="guide-reply-banner" role="status" aria-live="polite"><button type="button" onClick={()=>setOpen(true)} aria-label={'센터 답장 '+pending.length+'건 확인'}><BellRing size={20} aria-hidden="true"/><strong>답장이 왔어요!</strong><span>{pending.length}건 확인</span><ChevronRight size={18} aria-hidden="true"/></button></div>,anchor)}{createPortal(<dialog ref={dialog} className="guide-reply-notice" aria-labelledby={title} onCancel={event=>{event.preventDefault();setOpen(false)}}>
  <header><h2 id={title}>센터 답변이 도착했어요</h2>{pending.length>1&&<span>{pending.length}건</span>}</header>
  <div className="guide-reply-notice-body"><div className="guide-reply-question"><small>내가 남긴 전달사항</small><p>{current.question}</p></div><div className="guide-reply-answer"><strong>센터 답변</strong><p>{current.text}</p><time dateTime={current.at}>{new Date(current.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div></div>
  <footer><button type="button" onClick={()=>setOpen(false)}>나중에</button><button type="button" className="guide-reply-confirm" onClick={confirm}>확인</button></footer>
 </dialog>,document.body)}</>;
}
