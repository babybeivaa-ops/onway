import {useEffect,useState} from 'react';
import type {PublicPlace} from './places';
import {searchMealPlaces} from './placeSearch';
export function MealPlaceSearch({name,selected,onSelect}:{name:string;selected:PublicPlace|null;onSelect:(p:PublicPlace)=>void}){
 const [items,setItems]=useState<PublicPlace[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setItems([]);setMessage('');setBusy(false);if(selected||name.trim().length<2)return;const controller=new AbortController();setBusy(true);const timer=setTimeout(async()=>{try{const results=await searchMealPlaces(name,AbortSignal.any([controller.signal,AbortSignal.timeout(30000)]));if(!controller.signal.aborted){setItems(results);setMessage(results.length?'주소를 확인하고 식사 장소를 선택해주세요.':'검색 결과가 없어요. 지역명을 함께 입력해보세요. 장소명만 저장할 수도 있어요.');}}catch(e){if(!controller.signal.aborted)setMessage(e instanceof Error&&e.name==='TimeoutError'?'검색 시간이 초과됐어요. 다시 검색해주세요.':'장소를 검색하지 못했어요. 잠시 후 다시 검색해주세요.');}finally{if(!controller.signal.aborted)setBusy(false);}},600);return()=>{clearTimeout(timer);controller.abort();};},[name,selected,attempt]);
 if(selected)return <section className="meal-place-search" aria-label="선택한 식사 장소"><p className="fine">{selected.address||'주소 정보 없음'}</p><p className="fine">아래 ‘식사 장소 저장’을 누르면 위치도 함께 저장돼요.</p></section>;
 if(name.trim().length<2)return null;
 return <section className="meal-place-search" aria-label="식사 장소 자동 검색"><p className="fine" role="status">{busy?'식사 장소를 찾고 있어요…':message}</p><ul className="place-results">{items.map(p=><li key={p.id}><button type="button" onClick={()=>onSelect(p)}><strong>{p.name}</strong><span>{p.address||'주소 정보 없음'}</span><small>이 장소 선택</small></button></li>)}</ul><button type="button" className="text-button" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>다시 검색</button></section>;
}
