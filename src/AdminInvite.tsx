import {useEffect,useState} from 'react';
import {sharedRequest} from './sharedClient';
import {ShareQr} from './ShareQr';
const cacheKey='onway-admin-invite-link';
type Invite={url:string;expires:number};
export function AdminInvite({code}:{code:string}){
 const [allowed,setAllowed]=useState(false),[denied,setDenied]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [link,setLink]=useState<Invite|null>(null),[expires,setExpires]=useState<number|null>(null);
 useEffect(()=>{let alive=true;sharedRequest(code,'admin-invite').then(d=>{if(!alive)return;setAllowed(true);setExpires(d.expires);try{const cached=JSON.parse(sessionStorage.getItem(cacheKey)||'null');if(cached?.expires===d.expires&&cached.expires>Date.now())setLink(cached)}catch{}}).catch(e=>{if(!alive)return;if(e.status===403)setDenied(true);else setMessage('관리자 초대 설정을 불러오지 못했어요. 새로고침해주세요.')});return()=>{alive=false}},[code]);
 async function issue(revoke=false){setBusy(true);setMessage('');try{const d=await sharedRequest(code,'admin-invite','POST',{revoke});const next=revoke?null:{url:location.origin+location.pathname+'#admin-invite='+d.token,expires:d.expires};setLink(next);setExpires(next?.expires??null);try{if(next)sessionStorage.setItem(cacheKey,JSON.stringify(next));else sessionStorage.removeItem(cacheKey)}catch{}setMessage(revoke?'관리자 초대 링크를 해제했어요.':'24시간 동안 사용할 수 있는 관리자 초대 링크를 발급했어요.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 if(denied)return null;
 return <section className="share-link-card"><h3>관리자 모드 초대 링크</h3><p className="fine">초대받은 사람은 모든 단체의 기록을 수정·삭제할 수 있습니다. 관리자 접속 코드는 전달되지 않으며, 초대받은 관리자는 관리자 초대 링크를 발급할 수 없습니다.</p>{link&&<><input readOnly aria-label="관리자 모드 초대 링크" value={link.url} onFocus={e=>e.target.select()}/><button type="button" onClick={()=>navigator.clipboard.writeText(link.url).then(()=>setMessage('관리자 초대 링크를 복사했어요.'),()=>setMessage('링크를 선택해 직접 복사해주세요.'))}>관리자 초대 링크 복사</button><details><summary>QR 보기</summary><ShareQr url={link.url}/></details></>}{expires&&<p className="fine">유효기간: {new Date(expires).toLocaleString('ko-KR')}</p>}<button disabled={!allowed||busy} onClick={()=>{if(!expires||window.confirm('기존 관리자 초대 링크를 해제하고 새로 발급할까요?'))void issue()}}>{expires?'관리자 초대 링크 재발급':'관리자 초대 링크 발급'}</button>{expires&&<button disabled={busy||!allowed} onClick={()=>{if(window.confirm('초대받은 관리자의 접근을 해제할까요?'))void issue(true)}}>관리자 초대 해제</button>}<p role="status">{busy?'처리 중…':message}</p></section>;
}
