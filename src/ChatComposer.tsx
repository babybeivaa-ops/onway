import {useEffect,useRef,useState} from 'react';
import {Plus,Send,X} from 'lucide-react';
import {chatFileAccept,checkChatFile,uploadChatFile} from './chatAttachments';
import type {ChatAttachment} from './types';
export function ChatComposer({groupId,token,saving=false,saveFailed=false,enterToSend=false,active=true,onSend}:{groupId:string;token?:string;saving?:boolean;saveFailed?:boolean;enterToSend?:boolean;active?:boolean;onSend:(text:string,attachment?:ChatAttachment)=>void}){
 const [text,setText]=useState(''),[file,setFile]=useState<File|null>(null),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[preview,setPreview]=useState('');
 const input=useRef<HTMLInputElement>(null),controller=useRef<AbortController|null>(null),uploaded=useRef<ChatAttachment|undefined>(undefined),lock=useRef(false);
 useEffect(()=>{if(!file?.type.startsWith('image/')){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 useEffect(()=>{if(!active)controller.current?.abort();return()=>controller.current?.abort()},[active]);
 const disabled=saving||saveFailed||uploading;
 async function send(){
  if(disabled||lock.current||(!text.trim()&&!file))return;lock.current=true;setUploading(true);setError('');const abort=new AbortController();controller.current=abort;
  try{const attachment=file?(uploaded.current??await uploadChatFile(file,groupId,token,abort.signal)):undefined;uploaded.current=attachment;if(abort.signal.aborted)return;onSend(text,attachment);setText('');setFile(null);uploaded.current=undefined}catch(e){if(!abort.signal.aborted)setError((e as Error).message)}finally{lock.current=false;setUploading(false)}
 }
 return <form className="onway-chat-compose" onSubmit={e=>{e.preventDefault();void send()}}>
  {file&&<div className="chat-pending-file">{preview&&<img src={preview} alt="첨부할 사진"/>}<span>{file.name}<small>{(file.size/1024/1024).toFixed(1)}MB</small></span><button type="button" disabled={uploading} aria-label="첨부 취소" onClick={()=>{setFile(null);uploaded.current=undefined}}><X size={16}/></button><button type="submit" className="chat-file-send" disabled={disabled}>{uploading?'전송 중…':'전송'}</button></div>}
  <div className="onway-chat-input-row"><input ref={input} type="file" accept={chatFileAccept} hidden onChange={e=>{const next=e.currentTarget.files?.[0];e.currentTarget.value='';if(!next)return;try{checkChatFile(next);setFile(next);uploaded.current=undefined;setError('')}catch(error){setError((error as Error).message)}}}/>
   <button type="button" className="chat-attach-button" disabled={disabled} aria-label="사진·파일 첨부" title="사진·파일 첨부 (최대 5MB)" onClick={()=>input.current?.click()}><Plus size={22} aria-hidden="true"/></button>
   <textarea rows={1} aria-label="보낼 메시지" placeholder="메시지를 입력해주세요." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(!enterToSend||e.key!=='Enter'||e.shiftKey||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229)return;e.preventDefault();if(!e.repeat)void send()}}/>
   <button className="onway-chat-send-icon" type="submit" aria-label="메시지 보내기" disabled={disabled||(!text.trim()&&!file)}><Send size={19}/></button>
  </div>{uploading&&<p className="onway-chat-notice" role="status">{file?'첨부파일을 올리고 있어요…':'전송 중…'}</p>}{(error||saveFailed)&&<p className="form-error" role="alert">{error||'메시지를 저장하지 못했어요. 화면 상단의 서버 저장 상태를 확인해주세요.'}</p>}
 </form>;
}
