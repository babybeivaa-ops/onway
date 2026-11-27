import {useEffect,useState,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import type {ChatAttachment} from './types';
import {downloadChatFile} from './chatAttachments';
function PhotoViewer({url,name,onClose}:{url:string;name:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const [ratio,setRatio]=useState(1);
 const touchStart=useRef<{x:number;y:number}|null>(null);
 useEffect(()=>{ref.current?.showModal()},[]);
 return createPortal(<dialog className="chat-photo-viewer" style={{width:`min(480px, calc(100vw - 24px), calc(min(60dvh, 560px) * ${ratio} + 24px))`}} ref={ref} aria-label="사진 확대" onCancel={e=>{e.preventDefault();onClose()}} onClose={onClose}>
  <header><button type="button" className="chat-photo-close" aria-label="사진 닫기" autoFocus onClick={onClose}><X size={22}/></button></header>
  <div className="chat-photo-viewer-body"
   onTouchStart={e=>{touchStart.current=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null}}
   onTouchMove={e=>{if(e.touches.length!==1)touchStart.current=null}}
   onTouchCancel={()=>{touchStart.current=null}}
   onTouchEnd={e=>{const start=touchStart.current;touchStart.current=null;const end=e.changedTouches[0];if(start&&end&&end.clientY-start.y>70&&end.clientY-start.y>Math.abs(end.clientX-start.x)*1.5)onClose()}}>
   <img src={url} alt={name} draggable={false} onLoad={e=>{const img=e.currentTarget;if(img.naturalWidth&&img.naturalHeight)setRatio(img.naturalWidth/img.naturalHeight)}}/>
  </div>
  <footer><a className="chat-viewer-save" href={url} download={name}>저장</a></footer>
 </dialog>,document.body);
}

export function ChatAttachmentView({attachment,groupId,token,footer}:{attachment:ChatAttachment;groupId:string;token?:string;footer?:ReactNode}){
 const [expanded,setExpanded]=useState(false);
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[photoWidth,setPhotoWidth]=useState<number>();
 useEffect(()=>{let alive=true,objectUrl='';setUrl('');setError('');void downloadChatFile(attachment,groupId,token).then(blob=>{if(!alive)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}},[attachment.id,groupId,token]);
 if(error)return <small className="chat-file-error">{attachment.name}: {error}</small>;
 if(!url)return <small>첨부파일을 불러오는 중…</small>;
 const isPhoto=attachment.mime.startsWith('image/');
 return <div className={`chat-attachment${isPhoto?' chat-attachment-photo':''}`} style={isPhoto&&photoWidth?{width:photoWidth}:undefined}>{isPhoto&&<button type="button" className="chat-photo-open" onClick={()=>setExpanded(true)} aria-label="사진 크게 보기"><img src={url} alt={attachment.name} onLoad={e=>{const img=e.currentTarget;if(img.naturalWidth&&img.naturalHeight)setPhotoWidth(Math.min(240,img.naturalWidth,260*img.naturalWidth/img.naturalHeight))}}/></button>}{!isPhoto&&<><a href={url} download={attachment.name}>{attachment.name} · 저장</a><small>{(attachment.size/1024/1024).toFixed(1)}MB</small></>}{footer}{expanded&&<PhotoViewer url={url} name={attachment.name} onClose={()=>setExpanded(false)}/>}</div>;
}
