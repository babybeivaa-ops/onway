import {useEffect,useState,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import type {ChatAttachment} from './types';
import {downloadChatFile} from './chatAttachments';
function PhotoViewer({url,name,onClose}:{url:string;name:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),[original,setOriginal]=useState(false);
 useEffect(()=>{ref.current?.showModal()},[]);
 return createPortal(<dialog className="chat-photo-viewer" ref={ref} aria-label="사진 확대" onCancel={e=>{e.preventDefault();onClose()}} onClose={onClose}><header><button type="button" onClick={()=>setOriginal(v=>!v)}>{original?'화면에 맞추기':'원본 크기'}</button><button type="button" className="chat-photo-close" aria-label="사진 닫기" autoFocus onClick={onClose}><X size={22}/></button></header><div className="chat-photo-viewer-body" data-original={original}><img src={url} alt={name}/></div></dialog>,document.body);
}
export function ChatAttachmentView({attachment,groupId,token,footer,inlineFooter=false}:{attachment:ChatAttachment;groupId:string;token?:string;footer?:ReactNode;inlineFooter?:boolean}){
 const [expanded,setExpanded]=useState(false);
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[photoWidth,setPhotoWidth]=useState<number>();
 useEffect(()=>{let alive=true,objectUrl='';setUrl('');setError('');void downloadChatFile(attachment,groupId,token).then(blob=>{if(!alive)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}},[attachment.id,groupId,token]);
 if(error)return <small className="chat-file-error">{attachment.name}: {error}</small>;
 if(!url)return <small>첨부파일을 불러오는 중…</small>;
 const isPhoto=attachment.mime.startsWith('image/');
 return <div className={`chat-attachment${isPhoto?' chat-attachment-photo':''}`} style={isPhoto&&photoWidth?{width:photoWidth}:undefined}>{isPhoto&&<button type="button" className="chat-photo-open" onClick={()=>setExpanded(true)} aria-label="사진 크게 보기"><img src={url} alt={attachment.name} onLoad={e=>{const img=e.currentTarget;if(img.naturalWidth&&img.naturalHeight)setPhotoWidth(Math.min(240,img.naturalWidth,260*img.naturalWidth/img.naturalHeight))}}/></button>}{isPhoto&&inlineFooter?<div className="chat-photo-inline-footer">{footer}<a className="chat-photo-save" href={url} download={attachment.name}>저장</a></div>:<a className={isPhoto?'chat-photo-save':undefined} href={url} download={attachment.name}>{isPhoto?'저장':`${attachment.name} · 저장`}</a>}{!isPhoto&&<small>{(attachment.size/1024/1024).toFixed(1)}MB</small>}{!(isPhoto&&inlineFooter)&&footer}{expanded&&<PhotoViewer url={url} name={attachment.name} onClose={()=>setExpanded(false)}/>}</div>;
}
