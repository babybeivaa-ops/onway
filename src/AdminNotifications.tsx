import {sharedSession,sharedRequest} from './sharedClient';
import {WORKSPACE_KEY} from './workspace';
import {DEMO_STORAGE_PREFIX} from './demoStorage';
import {notificationGroupColor} from './notificationColors';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Bell,X,BusFront,Clock} from 'lucide-react';
import {CloudPersonIcon} from './CloudMascot';
import {adminNotices,newAdminNotices} from './adminNotificationModel';
import type {AdminNotice} from './adminNotificationModel';
import type {DemoGroup} from './workspace';
import './admin-notifications.css';
const key='onway-admin-notification-read-v1';
function NoticeIcon({kind}:{kind:AdminNotice['kind']}){return kind==='arrival'?<Clock aria-hidden="true"/>:kind==='movement'?<BusFront aria-hidden="true"/>:kind!=='message'?<CloudPersonIcon/>:<img className="notification-heart-icon" src="/icons/journey-heart-face.svg" width="30" height="30" alt=""/>}
function NoticeText({notice}:{notice:AdminNotice}){return notice.kind==='movement'?<span className="notification-movement-text"><strong className="notification-group-name" style={{color:notificationGroupColor(notice.groupId)}}>{notice.groupName}</strong>{notice.text.slice(notice.groupName.length)}</span>:<><strong className="notification-group-name" style={{color:notificationGroupColor(notice.groupId)}}>{notice.groupName}</strong><span>{notice.text}</span></>}
function readIds():string[]{try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter(v=>typeof v==='string'):[]}catch{return []}}
export function AdminNotifications({groups,active,onOpen,dashboard=false}:{groups:DemoGroup[];active:boolean;dashboard?:boolean;onOpen:(notice:AdminNotice)=>void}){
 const [preview,setPreview]=useState(()=>new URLSearchParams(location.search).get('previewNotification')==='1');
 useEffect(()=>{if(preview){const url=new URL(location.href);url.searchParams.delete('previewNotification');history.replaceState(history.state,'',url)}},[]);
 const [liveGroups,setLiveGroups]=useState<DemoGroup[]|null>(null);
 useEffect(()=>{if(!active)return;let alive=true,busy=false;const remote=sharedSession();const storageKey=(new URLSearchParams(location.search).get('demo')==='1'?DEMO_STORAGE_PREFIX:'')+WORKSPACE_KEY;const load=async()=>{if(busy)return;busy=true;try{const workspace=remote?(await sharedRequest(remote.token,'workspace')).workspace:JSON.parse(localStorage.getItem(storageKey)??'null');if(alive&&Array.isArray(workspace?.groups))setLiveGroups(workspace.groups)}catch{}finally{busy=false}};const changed=(e:StorageEvent)=>{if(e.key===storageKey||e.key===null)void load()};void load();const timer=setInterval(()=>void load(),5000);window.addEventListener('storage',changed);return()=>{alive=false;clearInterval(timer);window.removeEventListener('storage',changed)}},[active]);
 const events=useMemo(()=>adminNotices(liveGroups??groups),[groups,liveGroups]);
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
 useEffect(()=>{if(!active||!toasts.length)return;const timer=setTimeout(()=>setToasts([]),300000);return()=>clearTimeout(timer)},[active,toasts,dashboard]);
 const mark=(ids:string[])=>{const next=[...new Set([...readIds(),...read,...ids])];setRead(next);try{localStorage.setItem(key,JSON.stringify(next))}catch{/* Keep this session usable when storage is unavailable. */}};
 const confirm=(e:AdminNotice)=>{mark([e.id]);setToasts(old=>old.filter(x=>x.id!==e.id));};
 const visit=(e:AdminNotice)=>{confirm(e);setOpen(false);onOpen(e)};
 if(!active)return null;
 return <div className="admin-notifications">
  <button type="button" className="admin-notification-toggle" aria-expanded={open} aria-controls="admin-notification-list" onClick={()=>setOpen(v=>!v)}><Bell size={19} aria-hidden="true"/>알림 <span>{unread.length}</span></button>
  {open&&<section id="admin-notification-list" className="admin-notification-panel" aria-label="관리자 알림">
   <header><h2>알림 <small>읽지 않음 {unread.length}건</small></h2><button type="button" aria-label="알림함 닫기" onClick={()=>setOpen(false)}><X size={18}/></button></header>
   <p>단체 이동, 도착 예정 시각, 인원 확인과 전달사항을 확인하세요.</p>
   {!!unread.length&&<button type="button" className="notification-read-all" onClick={()=>{mark(events.map(e=>e.id));setToasts([])}}>알림 모두 읽음</button>}
   <div className="admin-notification-items">{!events.length?<p>아직 알림이 없어요.</p>:events.map(e=><button type="button" key={e.id} className={!readSet.has(e.id)&&!e.acknowledged?'is-unread':''} onClick={()=>visit(e)}><span className="notification-kind"><NoticeIcon kind={e.kind}/>{e.kind==='message'?'전달사항':e.kind==='confirmation'?(e.countsEdited?'인원 수정 완료':'인원 변동없음 확인'):e.kind==='arrival'?'도착 예정 시각':e.kind==='movement'?'이동 확인':'인원 변경'}{!readSet.has(e.id)&&!e.acknowledged?' · 새 알림':''}</span><NoticeText notice={e}/><time dateTime={e.at}>{new Date(e.at).toLocaleString('ko-KR')}</time></button>)}</div>
  </section>}
  <div className="admin-notification-toasts" aria-live="polite" aria-atomic="false">{preview&&<div className="admin-notification-toast"><button type="button" onClick={()=>setPreview(false)}><span className="notification-toast-title"><NoticeIcon kind="message"/><span>새 전달사항이 도착했어요</span></span><strong>시범 알림</strong><span>알림 모양을 확인하는 예시입니다.</span><b>실제 기록에는 저장되지 않습니다.</b></button><button type="button" className="notification-toast-confirm" onClick={()=>setPreview(false)}>확인</button><button type="button" aria-label="팝업 닫기" onClick={()=>setPreview(false)}><X size={18}/></button></div>}{toasts.flatMap(e=>{const current=events.find(x=>x.id===e.id&&!x.acknowledged);return current&&!readSet.has(e.id)?[current]:[]}).map(e=><div className="admin-notification-toast timed-notification-toast" key={e.id} onAnimationEnd={event=>{if(event.animationName==='notification-dismiss')setToasts(old=>old.filter(item=>item.id!==e.id))}}><button type="button" onClick={()=>visit(e)}><span className="notification-toast-title"><NoticeIcon kind={e.kind}/><span>{e.kind==='message'?'새 전달사항이 도착했어요':e.kind==='confirmation'?(e.countsEdited?'인원 수정 완료':'인원 변동없음 확인'):e.kind==='arrival'?'도착 예정 시각':e.kind==='movement'?'이동 확인':'인원이 변경되었어요'}</span></span><NoticeText notice={e}/><time className="notification-event-time" dateTime={e.at}>{e.kind==='confirmation'?'인원 확인':e.kind==='movement'?'출발·통과·도착':e.kind==='message'?'전달사항 등록':e.kind==='arrival'?'예정 시각 변경':'인원 변경'} · {new Date(e.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</time><b>내역 보기 →</b></button><button type="button" className="notification-toast-confirm" onClick={()=>visit(e)}>확인</button><button type="button" aria-label="팝업 닫기" onClick={()=>setToasts(old=>old.filter(x=>x.id!==e.id))}><X size={18}/></button></div>)}</div>
 </div>;
}
