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
   const {toBlob,toCanvas}=await import('html-to-image');
   const isSchedule=target.matches('.program-display-table');
   const width=Math.ceil(Math.max(target.scrollWidth,target.getBoundingClientRect().width)),height=Math.ceil(Math.max(target.scrollHeight,target.getBoundingClientRect().height));
   const pixelRatio=Math.min(2,Math.sqrt(12000000/(width*height)),16000/height);
   const options={backgroundColor:'#ffffff',pixelRatio,filter:(node:HTMLElement)=>!(node instanceof Element)||!node.matches('.table-image-save, .program-banner-edit, .weekly-menu-manager, .arrival-lunch-check, .meal-demo-notice button'),preferredFontFormat:'woff2'};
   let blob:Blob|null;
   if(isSchedule){
    const image=await toCanvas(target,{...options,width,height});
    // Add space outside the captured layout so neither text nor table widths change.
    const padding=Math.ceil(20*pixelRatio),canvas=document.createElement('canvas');
    canvas.width=image.width+padding*2;canvas.height=image.height+padding*2;
    const context=canvas.getContext('2d');
    if(!context)throw Error('이미지를 만들 수 없어요.');
    context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,padding,padding);
    blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
   }else blob=await toBlob(target,options);
   if(!blob)throw Error('이미지 생성에 실패했어요.');
   const title=label.replace(' 저장하기','')+'_'+new Date().toISOString().slice(0,10);
   const file=new File([blob],title+'.png',{type:'image/png'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div ref={host} className="table-image-save"><button type="button" className="secondary" disabled={busy} onClick={()=>void save()}>{busy?'저장 준비 중…':label}</button>{error&&<p role="alert">{error}</p>}</div>;
}
