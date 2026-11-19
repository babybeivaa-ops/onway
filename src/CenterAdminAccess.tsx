import {useState} from 'react';
import {sharedRequest} from './sharedClient';
export async function authenticateCenter(code:string){
 try{const result=await sharedRequest(code,'workspace');if(result.role!=='admin')throw Error('관리자 코드가 아닙니다.');return code;}catch(e){if((e as {status?:number}).status!==401)throw e;}
 const result=await sharedRequest('','admin-login','POST',{code});return result.token as string;
}
export function CenterCodeSettings({token,onSaved}:{token:string;onSaved?:(token:string)=>void}){
 const [code,setCode]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <form className="center-code-form" onSubmit={async e=>{e.preventDefault();if(code!==confirm){setMessage('두 코드가 같지 않아요.');return;}setBusy(true);setMessage('');try{await sharedRequest(token,'admin-code','POST',{code});const result=await sharedRequest('','admin-login','POST',{code});sessionStorage.setItem('onway-admin-access',result.token);setCode('');setConfirm('');setMessage('센터 코드를 저장했습니다. 이 코드로 접속하고 인솔교사 링크를 발급할 수 있어요.');onSaved?.(result.token);}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}}>
 <p className="fine">직원들이 사용할 센터 전용 코드를 정해주세요. 10자 이상이며 인솔교사에게는 전용 링크만 전달해주세요.</p>
 <label>새 센터 관리자 코드<input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={code} onChange={e=>setCode(e.target.value)}/></label>
 <label>코드 다시 입력<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
 <button className="primary" disabled={busy}>{busy?'저장 중…':'센터 코드 저장'}</button><p role="status">{message}</p></form>;
}
export function CenterAdminAccess(){
 const [setup]=useState(()=>{const token=new URLSearchParams(location.hash.slice(1)).get('admin-setup')||'';if(token)history.replaceState(null,'',location.pathname+location.search);return token});
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saved,setSaved]=useState(false);
 return <main className="center-admin-login"><h1>ON:WAY 센터 관리자</h1>{setup?<><h2>센터 전용 코드 설정</h2><CenterCodeSettings token={setup} onSaved={()=>setSaved(true)}/>{saved&&<a href="/">관리자 화면으로 돌아가기 →</a>}</>:<form className="center-code-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const token=await authenticateCenter(code);sessionStorage.setItem('onway-admin-access',token);location.href='/#shared-admin';}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}}><label>센터 관리자 코드<input type="password" autoComplete="current-password" required value={code} onChange={e=>setCode(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'접속 중…':'센터 관리 접속'}</button><p role="alert">{message}</p><p className="fine">센터에서 정한 코드로 접속합니다. 인솔교사는 단체별 전용 링크를 이용해주세요.</p></form>}</main>;
}
