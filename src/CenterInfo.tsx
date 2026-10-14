import {Cloud} from './Visuals';

import {useEffect,useState} from 'react';
const key='onway-center-info-v2';const blank={contactName:'',phone:'',address:'전남 고흥군 동일면 덕흥양쪽길200',dropoff:'체험관 앞'};
export function CenterInfo({editable=false}:{editable?:boolean}){
 const [info,setInfo]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'{}');return Object.fromEntries(Object.entries(blank).map(([field,fallback])=>[field,typeof saved[field]==='string'?saved[field]:fallback])) as typeof blank}catch{return blank}}),[message,setMessage]=useState('');
 const fields=[['contactName','담당자 이름'],['phone','담당자 전화번호'],['address','센터 주소'],['dropoff','버스 하차 위치']] as const;
 return <section className="feature-card"><h2>{editable?'센터 연락처 · 입소 안내 설정':'입소 전 확인'}</h2>{editable?<form onSubmit={e=>{e.preventDefault();try{if(info.phone&&!/^[0-9+() -]+$/.test(info.phone))throw Error('전화번호를 확인해주세요.');localStorage.setItem(key,JSON.stringify(info));window.dispatchEvent(new Event('onway-center-info-change'));setMessage('이 브라우저에 저장했어요.')}catch(e){setMessage(e instanceof Error?e.message:'저장하지 못했어요.')}}}><p className="fine">확인된 실제 정보를 입력해주세요. 현재는 이 브라우저에서 사용하는 안내입니다.</p>{fields.map(([k,label])=><label key={k}>{label}<input type={k==='phone'?'tel':'text'} maxLength={k==='phone'?30:200} value={info[k]} onChange={e=>setInfo({...info,[k]:e.target.value})}/></label>)}<button className="secondary">안내 저장</button></form>:<><dl className="arrival-info">{fields.filter(([k])=>k==='dropoff').map(([k,label])=><div key={k}><dt>{label}</dt><dd>{info[k]||'담당자 안내를 확인해주세요.'}</dd></div>)}</dl></>}{editable&&<p className="fine" role="status">{message}</p>}</section>;
}

function readCenterAddress(){
 try{const saved=JSON.parse(localStorage.getItem(key)||'{}');return typeof saved.address==='string'&&saved.address.trim()?saved.address.trim():blank.address}catch{return blank.address}
}
export function CenterCallButton(){
 const [address,setAddress]=useState(readCenterAddress),[open,setOpen]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const update=()=>{setAddress(readCenterAddress());setMessage('')};window.addEventListener('onway-center-info-change',update);window.addEventListener('storage',update);return()=>{window.removeEventListener('onway-center-info-change',update);window.removeEventListener('storage',update)}},[]);
 async function copyAddress(){
  const current=readCenterAddress();setAddress(current);setOpen(true);setMessage('');
  try{await navigator.clipboard.writeText(current);setMessage('주소를 복사했어요.')}catch{setMessage('자동 복사가 안 됐어요. 주소를 길게 누르거나 선택해서 복사해주세요.')}
 }
 return <div className="header-center-contact"><button type="button" className="center-call-button center-address-button" aria-expanded={open} aria-label="센터 주소 보기 및 복사" onClick={copyAddress}><span className="calling-cloud" aria-hidden="true"><Cloud/></span><span>주소 복사</span></button><a href="tel:0618301588" className="center-call-button" aria-label="센터에 전화하기 061-830-1588" title="061-830-1588"><span className="calling-cloud" aria-hidden="true"><Cloud calling/></span><span>전화하기</span></a>{open&&<div className="center-address-popover"><div className="center-address-heading"><strong>센터 주소</strong><button type="button" aria-label="센터 주소 닫기" onClick={()=>setOpen(false)}>×</button></div><p className="center-address-text">{address}</p><p className="center-address-status" role="status">{message}</p></div>}</div>;
}

export function HeartMascot({calling=false}:{calling?:boolean}){return <svg className="calling-heart" width={calling?34:30} height="30" viewBox={calling?"0 0 46 40":"0 0 40 40"} aria-hidden="true"><path d="M20 35C15 31 3 23 3 13C3 3 15 2 20 10C25 2 37 3 37 13C37 23 25 31 20 35Z" fill="#f399ab" stroke="#dd7a91" strokeWidth="1.4"/><ellipse cx="14" cy="17" rx="2" ry="3" fill="#633c54"/><ellipse cx="26" cy="17" rx="2" ry="3" fill="#633c54"/><path d="M16 24q4 4 8 0" fill="none" stroke="#633c54" strokeWidth="1.7" strokeLinecap="round"/><ellipse cx="10" cy="23" rx="3" ry="1.5" fill="#f7bdc9"/><ellipse cx="30" cy="23" rx="3" ry="1.5" fill="#f7bdc9"/>{calling&&<><path d="M36 8C31 13 31 24 37 29L41 26L37 21L35 22Q33 18 35 14L37 15L40 10Z" fill="#375b76" stroke="#274760" strokeWidth="1.2" strokeLinejoin="round"/><ellipse cx="33" cy="23" rx="3.3" ry="2.8" fill="#f399ab" stroke="#dd7a91" strokeWidth="1"/><path d="M43 11q3 5 0 10" fill="none" stroke="#8a718a" strokeWidth="1.5" strokeLinecap="round"/></>}</svg>}
