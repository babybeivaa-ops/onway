import {useEffect,useState} from 'react';
import type {PublicPlace} from './places';

export function CheckpointSearch({query,onSelect}:{query:string;onSelect:(place:PublicPlace)=>void}){
 const [items,setItems]=useState<PublicPlace[]>([]),[message,setMessage]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  setItems([]);setMessage('');if(query.trim().length<2)return;
  const controller=new AbortController();setMessage('장소와 주소를 찾고 있어요…');
  const timer=setTimeout(async()=>{try{
   const response=await fetch('/api/maps/search?q='+encodeURIComponent(query.trim()),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});
   if(!response.ok)throw Error('장소를 검색하지 못했어요. 다시 검색해주세요.');
   const data=await response.json();if(!Array.isArray(data.items))throw Error('검색 결과를 읽지 못했어요.');
   if(controller.signal.aborted)return;setItems(data.items);setMessage(data.items.length?'주소를 확인하고 선택하면 이동 지점에 바로 등록돼요.':'검색 결과가 없어요. 지역명을 함께 입력해주세요.');
  }catch{if(!controller.signal.aborted)setMessage('장소 검색에 연결하지 못했어요. 다시 검색해주세요.');}},600);
  return()=>{clearTimeout(timer);controller.abort()};
 },[query,attempt]);
 if(query.trim().length<2)return null;
 return <section className="school-origin-search" aria-label="새 지점 주소 검색"><p className="fine" role="status">{message}</p><ul className="place-results">{items.map(place=><li key={place.id}><button type="button" onClick={()=>onSelect(place)}><strong>{place.name}</strong><span>{place.address||'주소 정보 없음'}</span><small>이 주소로 지점 등록</small></button></li>)}</ul><button type="button" className="text-button" onClick={()=>setAttempt(v=>v+1)}>다시 검색</button></section>;
}
