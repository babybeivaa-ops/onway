import type {Word,WeeklyMenu} from './weeklyMeals';
import {parseWeeklyMenu} from './weeklyMeals';
import workerAsset from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
let pdfWorkerUrl:string|undefined;
export async function readWeeklyMenu(file:File,anchor:string,onProgress:(text:string)=>void):Promise<WeeklyMenu>{
 if(file.size>10*1024*1024)throw Error('파일당 최대 10MB까지 등록할 수 있어요.');
 if(!/\.(pdf|png|jpe?g)$/i.test(file.name))throw Error('PDF, PNG, JPG 파일을 선택해주세요.');
 let ocr:import('tesseract.js').Worker|undefined;
 const recognize=async(image:HTMLCanvasElement|File)=>{
  const {createWorker}=await import('tesseract.js');
  onProgress('이미지에서 메뉴를 읽고 있어요…');
  ocr??=await createWorker('kor',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr/lang-best',cachePath:'onway-menu-ocr-v2',logger:m=>{if(m.status==='recognizing text')onProgress(`메뉴 인식 중 ${Math.round(m.progress*100)}%`)}});
  await ocr.setParameters({tessedit_pageseg_mode:'6' as import('tesseract.js').PSM});
  let canvas:HTMLCanvasElement;
  if(image instanceof File){const bitmap=await createImageBitmap(image);const scale=Math.min(2,2400/bitmap.width);canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.fillStyle='#fff';canvas.getContext('2d')!.fillRect(0,0,canvas.width,canvas.height);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close()}else canvas=image;
  const {readMenuImage}=await import('./readMenuImage');
  try{return await readMenuImage(canvas,ocr,anchor,file.name,onProgress)}finally{if(image instanceof File)canvas.width=canvas.height=0}
 };
 try{
  if(!/\.pdf$/i.test(file.name))return await recognize(file);
  onProgress('PDF에서 날짜와 메뉴를 읽고 있어요…');
  const pdfjs=await import('pdfjs-dist');
  if(!pdfWorkerUrl){const r=await fetch(workerAsset);if(!r.ok)throw Error('PDF 인식 도구를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.');pdfWorkerUrl=URL.createObjectURL(new Blob([await r.text()],{type:'text/javascript'}))}
  pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true,cMapUrl:'/ocr/cmaps/',cMapPacked:true,standardFontDataUrl:'/ocr/pdf-fonts/'});
  const doc=await task.promise;
  try{
   if(doc.numPages>3)throw Error('주간식단표 페이지만 선택해주세요. 최대 3페이지까지 읽을 수 있어요.');
   let lastError:unknown;
   for(let n=1;n<=doc.numPages;n++){
    const page=await doc.getPage(n),viewport=page.getViewport({scale:1}),text=await page.getTextContent();
    const words:Word[]=text.items.flatMap(item=>'str'in item&&item.str.trim()?[{text:item.str,x:item.transform[4],y:viewport.height-item.transform[5],w:item.width,h:item.height}]:[]);
    try{return parseWeeklyMenu(words,anchor,file.name)}catch(e){lastError=e}
    if(words.length<30){const view=page.getViewport({scale:Math.min(3,2400/viewport.width)}),canvas=document.createElement('canvas');canvas.width=view.width;canvas.height=view.height;await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport:view}).promise;try{return await recognize(canvas)}catch(e){lastError=e}finally{canvas.width=canvas.height=0}}
   }
   throw lastError??Error('주간식단표를 읽지 못했어요.');
  }finally{await task.destroy()}
 }finally{await ocr?.terminate()}
}
