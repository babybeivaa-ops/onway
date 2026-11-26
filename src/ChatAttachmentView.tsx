import {useEffect,useState} from 'react';
import type {ChatAttachment} from './types';
import {downloadChatFile} from './chatAttachments';
export function ChatAttachmentView({attachment,groupId,token}:{attachment:ChatAttachment;groupId:string;token?:string}){
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let alive=true,objectUrl='';setUrl('');setError('');void downloadChatFile(attachment,groupId,token).then(blob=>{if(!alive)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}},[attachment.id,groupId,token]);
 if(error)return <small className="chat-file-error">{attachment.name}: {error}</small>;
 if(!url)return <small>첨부파일을 불러오는 중…</small>;
 const isPhoto=attachment.mime.startsWith('image/');
 return <div className={`chat-attachment${isPhoto?' chat-attachment-photo':''}`}>{isPhoto&&<a href={url} target="_blank" rel="noreferrer" aria-label="사진 크게 보기"><img src={url} alt={attachment.name}/></a>}<a className={isPhoto?'chat-photo-save':undefined} href={url} download={attachment.name}>{isPhoto?'저장':`${attachment.name} · 저장`}</a>{!isPhoto&&<small>{(attachment.size/1024/1024).toFixed(1)}MB</small>}</div>;
}
