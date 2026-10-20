import {useEffect,useMemo,useRef,useState} from 'react';
import {Bell,X} from 'lucide-react';
import {CloudPersonIcon} from './CloudMascot';
import {adminNotices,newAdminNotices} from './adminNotificationModel';
import type {AdminNotice} from './adminNotificationModel';
import type {DemoGroup} from './workspace';
import './admin-notifications.css';
const key='onway-admin-notification-read-v1';
function NoticeIcon({kind}:{kind:AdminNotice['kind']}){return kind==='counts'?<CloudPersonIcon/>:<img className="notification-heart-icon" src="/icons/journey-heart-face.svg" width="30" height="30" alt=""/>}
function readIds():string[]{try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter(v=>typeof v==='string'):[]}catch{return []}}
export function AdminNotifications({groups,active,onOpen}:{groups:DemoGroup[];active:boolean;onOpen:(notice:AdminNotice)=>void}){
 const events=useMemo(()=>adminNotices(groups),[groups]);
 const previous=useRef<Set<string>|null>(null);
 const [read,setRead]=useState(readIds),[open,setOpen]=useState(false),[toasts,setToasts]=useState<AdminNotice[]>([]);
 const readSet=useMemo(()=>new Set(read),[read]);
 const unread=events.filter(e=>!readSet.has(e.id)&&!e.acknowledged);
 useEffect(()=>{
  const fresh=newAdminNotices(events,previous.current);
  previous.current=new Set(events.map(e=>e.id));
  if(fresh.length)setToasts(old=>[...fresh,...old].slice(0,3));
 },[events]);
 useEffect(()=>{const listener=(event:StorageEvent)=>{if(event.key===key)setRead(readIds())};window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener)},[]);
 useEffect(()=>{if(!active||!toasts.length)return;const timer=setTimeout(()=>setToasts([]),12000);return()=>clearTimeout(timer)},[active,toasts]);
 const mark=(ids:string[])=>{const next=[...new Set([...readIds(),...read,...ids])];setRead(next);try{localStorage.setItem(key,JSON.stringify(next))}catch{/* Keep this session usable when storage is unavailable. */}};
 const visit=(e:AdminNotice)=>{mark([e.id]);setToasts(old=>old.filter(x=>x.id!==e.id));setOpen(false);onOpen(e)};
 if(!active)return null;
 return <div className="admin-notifications">
  <button type="button" className="admin-notification-toggle" aria-expanded={open} aria-controls="admin-notification-list" onClick={()=>setOpen(v=>!v)}><Bell size={19} aria-hidden="true"/>알림 <span>{unread.length}</span></button>
  {open&&<section id="admin-notification-list" className="admin-notification-panel" aria-label="관리자 알림">
   <header><h2>알림 <small>읽지 않음 {unread.length}건</small></h2><button type="button" aria-label="알림함 닫기" onClick={()=>setOpen(false)}><X size={18}/></button></header>
   <p>인솔자의 전달사항과 인원 변경을 확인하세요.</p>
   {!!unread.length&&<button type="button" className="notification-read-all" onClick={()=>{mark(events.map(e=>e.id));setToasts([])}}>알림 모두 읽음</button>}
   <div className="admin-notification-items">{!events.length?<p>아직 알림이 없어요.</p>:events.map(e=><button type="button" key={e.id} className={!readSet.has(e.id)&&!e.acknowledged?'is-unread':''} onClick={()=>visit(e)}><span className="notification-kind"><NoticeIcon kind={e.kind}/>{e.kind==='message'?'전달사항':'인원 변경'}{!readSet.has(e.id)&&!e.acknowledged?' · 새 알림':''}</span><strong>{e.groupName}</strong><span>{e.text}</span><time dateTime={e.at}>{new Date(e.at).toLocaleString('ko-KR')}</time></button>)}</div>
  </section>}
  <div className="admin-notification-toasts" aria-live="polite" aria-atomic="false">{toasts.filter(e=>events.some(x=>x.id===e.id&&!x.acknowledged)&&!readSet.has(e.id)).map(e=><div className="admin-notification-toast" key={e.id}><button type="button" onClick={()=>visit(e)}><span className="notification-toast-title"><NoticeIcon kind={e.kind}/><span>{e.kind==='message'?'새 전달사항이 도착했어요':'인원이 변경되었어요'}</span></span><strong>{e.groupName}</strong><span>{e.text}</span><b>내역 보기 →</b></button><button type="button" aria-label="팝업 닫기" onClick={()=>setToasts(old=>old.filter(x=>x.id!==e.id))}><X size={18}/></button></div>)}</div>
 </div>;
}
