import {TelescopeCloudIcon} from './TelescopeCloudIcon';
import {ContactRound,UserRound,Phone,BusFront} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import type {DemoGroup,GroupDetails} from './workspace';
import {formatGroupName} from './groupName';

export function SchoolArrivalForm({group,onSave}:{group:DemoGroup;onSave:(input:GroupDetails)=>void}){
 const [info,setInfo]=useState(()=>{const saved=group.state.organization.arrival??{contactName:'',phone:'',dropoff:'체험관 앞'};return {...saved,phone:saved.phone.trim()?saved.phone:'061-830-'}});
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 const dirty=useRef(false);
 const save=()=>{if(!dirty.current)return;setError('');try{onSave({name:group.state.organization.name,...group.state.counts,arrival:{...info,phone:info.phone.trim()==='061-830-'?'':info.phone}});dirty.current=false;setMessage('저장했어요.')}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 저장해주세요.')}};
 const saveRef=useRef(save);saveRef.current=save;
 useEffect(()=>{const flush=()=>saveRef.current();const hidden=()=>{if(document.visibilityState==='hidden')flush()};window.addEventListener('blur',flush);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',flush);document.removeEventListener('visibilitychange',hidden)}},[]);
 const fields=[['contactName','담당자 이름',''],['phone','연락처','예: 061-830-0000'],['dropoff','버스 하차 위치','예: 체험관 앞']] as const;
 return <section className="school-arrival-card" aria-label="선택 학교·단체 담당자와 하차 안내">
  <div className="school-arrival-title"><h2><span className="admin-section-icon"><span className="cloud-mascot-icon"><TelescopeCloudIcon/></span></span>담당자 정보</h2><p>이 학교·단체의 담당자와 버스 하차 위치를 입력해주세요.</p></div>
  <form onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))save()}} onSubmit={e=>{e.preventDefault();save()}}>
   <div className="school-arrival-fields">{fields.map(([key,label,placeholder])=><label key={key}><span className="arrival-field-label">{key==='contactName'?<UserRound size={15} aria-hidden="true"/>:key==='phone'?<Phone size={15} aria-hidden="true"/>:<BusFront size={15} aria-hidden="true"/>}{label}</span><input type={key==='phone'?'tel':'text'} autoComplete="off" maxLength={key==='phone'?30:key==='contactName'?80:200} placeholder={placeholder} value={info[key]} onFocus={e=>{if(key!=='phone')return;const input=e.currentTarget;if(!input.value.startsWith('061-830-'))return;const placeCursor=()=>{if(document.activeElement===input)input.setSelectionRange(8,input.value.length)};placeCursor();requestAnimationFrame(placeCursor)}} onChange={e=>{dirty.current=true;setInfo({...info,[key]:e.target.value});setMessage('');setError('');}}/></label>)}</div>
   <div className="school-arrival-save"><p role="status">{message}</p><button type="submit" className="secondary">저장</button></div>{error&&<p role="alert" className="form-error">{error}</p>}
  </form>
 </section>;
}
