import {useRef,useState} from 'react';
import './save-table-image.css';

export function SaveTableImage({label,targetSelector}:{label:string;targetSelector:string}){
 const host=useRef<HTMLDivElement>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(){
  setBusy(true);setError('');
  try{
   await document.fonts.ready;
   const target=host.current?.closest<HTMLElement>(targetSelector);
   if(!target)throw Error('저장할 화면을 찾지 못했어요.');
   const {toBlob}=await import('html-to-image');
   const width=target.getBoundingClientRect().width,height=Math.max(target.scrollHeight,target.getBoundingClientRect().height);
   const pixelRatio=Math.min(2,Math.sqrt(12000000/(width*height)),16000/height);
   const blob=await toBlob(target,{backgroundColor:'#ffffff',pixelRatio,filter:node=>!(node instanceof Element)||!node.matches('.table-image-save, .program-banner-edit, .weekly-menu-manager, .arrival-lunch-check, .meal-demo-notice button'),preferredFontFormat:'woff2'});
   if(!blob)throw Error('이미지 생성에 실패했어요.');
   const title=label.replace(' 저장하기','')+'_'+new Date().toISOString().slice(0,10);
   const file=new File([blob],title+'.png',{type:'image/png'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div ref={host} className="table-image-save"><button type="button" className="secondary" disabled={busy} onClick={()=>void save()}>{busy?'저장 준비 중…':label}</button>{error&&<p role="alert">{error}</p>}</div>;
}
