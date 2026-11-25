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
   await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   const width=Math.ceil(Math.max(target.scrollWidth,target.getBoundingClientRect().width)),height=Math.ceil(Math.max(target.scrollHeight,target.getBoundingClientRect().height));
   const pixelRatio=Math.min(2,Math.sqrt(12000000/(width*height)),16000/height);
   const options={backgroundColor:'#ffffff',pixelRatio,filter:(node:HTMLElement)=>!(node instanceof Element)||!node.matches('.table-image-save, .program-banner-edit, .weekly-menu-manager, .arrival-lunch-check, .meal-demo-notice button'),preferredFontFormat:'woff2'};
   if(width<=0||height<=0)throw Error('저장할 일정표를 펼친 후 다시 시도해주세요.');
   // Use the same direct DOM-to-PNG path as the working meal table.
   let blob=await toBlob(target,target.matches('.program-display-table')?{...options,width,height,style:{position:'static',transform:'none',contain:'none',contentVisibility:'visible'}}:options);
   if(!blob)throw Error('이미지 생성에 실패했어요.');
   if(target.matches('.program-display-table')){
    // Pad the already-rendered PNG, without reflowing or re-capturing the table.
    const imageUrl=URL.createObjectURL(blob);
    try{
     const image=new Image();image.src=imageUrl;await image.decode();
     const padding=Math.max(16,Math.round(20*pixelRatio));
     const canvas=document.createElement('canvas');canvas.width=image.naturalWidth+padding*2;canvas.height=image.naturalHeight+padding*2;
     const context=canvas.getContext('2d');if(!context)throw Error('이미지 여백을 만들 수 없어요.');
     context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,padding,padding);
     const padded=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
     if(!padded)throw Error('이미지 저장에 실패했어요.');blob=padded;
    }finally{URL.revokeObjectURL(imageUrl)}
   }
   const title=(target.dataset.exportTitle||label.replace(' 저장하기','')+'_'+new Date().toISOString().slice(0,10)).replace(/[<>:"/\\|?*]/g,'_');
   const file=new File([blob],title+'.png',{type:'image/png'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div ref={host} className="table-image-save"><button type="button" className="secondary" disabled={busy} onClick={()=>void save()}>{busy?'저장 준비 중…':label}</button>{error&&<p role="alert">{error}</p>}</div>;
}
