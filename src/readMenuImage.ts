import type {Worker} from 'tesseract.js';
import {addDays,mealKeys,monday} from './weeklyMeals.ts';
import type {WeeklyMenu,MealDay} from './weeklyMeals.ts';
function clusters(values:number[]){const groups:number[][]=[];for(const n of values){const last=groups.at(-1);if(last&&n-last.at(-1)!<=2)last.push(n);else groups.push([n])}return groups.map(g=>Math.round((g[0]+g.at(-1)!)/2))}
export async function readMenuImage(canvas:HTMLCanvasElement,worker:Worker,anchor:string,name:string,progress:(s:string)=>void):Promise<WeeklyMenu>{
 const {width:w,height:h}=canvas,pixels=canvas.getContext('2d')!.getImageData(0,0,w,h).data;
 const dark=(x:number,y:number)=>{const p=(y*w+x)*4;return pixels[p]<90&&pixels[p+1]<90&&pixels[p+2]<90};
 const horizontal:number[]=[];for(let y=0;y<h;y++){let count=0;for(let x=0;x<w;x++)if(dark(x,y))count++;if(count>w*.55)horizontal.push(y)}
 const ys=clusters(horizontal);if(ys.length!==12)throw Error('표의 칸을 구분하지 못했어요. 여백을 포함한 센터 주간식단표 원본 PDF나 선명한 이미지를 선택해주세요.');
 const vertical:number[]=[];for(let x=0;x<w;x++){let count=0;for(let y=ys[0]+3;y<ys[1]-3;y++)if(dark(x,y))count++;if(count>(ys[1]-ys[0]-6)*.8)vertical.push(x)}
 const xs=clusters(vertical);if(xs.length!==9)throw Error('7일 날짜 열을 구분하지 못했어요. 표 전체가 보이는 이미지를 선택해주세요.');
 const crop=(left:number,top:number,right:number,bottom:number)=>{const c=document.createElement('canvas');c.width=right-left-6;c.height=bottom-top-2;c.getContext('2d')!.drawImage(canvas,left+3,top+1,c.width,c.height,0,0,c.width,c.height);return c};
 const headers:string[]=[];let recognized=0,firstDate='';
 for(let i=0;i<7;i++){progress(`날짜 확인 중 ${i+1}/7`);const c=crop(xs[i+1],ys[0],xs[i+2],ys[1]);const {data}=await worker.recognize(c);c.width=c.height=0;headers.push(data.text);const match=data.text.replace(/\s/g,'').match(/(\d{1,2})월(\d{1,2})일/);if(match){const years=[+anchor.slice(0,4)-1,+anchor.slice(0,4),+anchor.slice(0,4)+1];const date=years.map(year=>`${year}-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}`).filter(d=>Number.isFinite(Date.parse(d))).sort((a,b)=>Math.abs(Date.parse(a)-Date.parse(anchor))-Math.abs(Date.parse(b)-Date.parse(anchor)))[0];if(date){const start=addDays(date,-i);if(firstDate&&start!==firstDate)throw Error('날짜 인식 결과가 일치하지 않아요. 더 선명한 원본을 선택해주세요.');firstDate=start;recognized++}}}
 if(recognized<4||monday(firstDate)!==firstDate)throw Error('날짜를 정확히 읽지 못했어요. 원본 PDF 또는 더 선명한 이미지를 선택해주세요.');
 const days:MealDay[]=Array.from({length:7},(_,i)=>({date:addDays(firstDate,i),breakfast:[],lunch:[],dinner:[]}));
 for(let meal=0;meal<3;meal++)for(let day=0;day<7;day++){
  progress(`메뉴 인식 중 ${meal*7+day+1}/21`);const c=crop(xs[day+1],ys[2+meal*3],xs[day+2],ys[3+meal*3]);
  const data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=0;i<data.length;i+=4)if(data[i]<120&&data[i+1]<120&&data[i+2]<120)ink++;
  if(ink>c.width*c.height*.002){const {data}=await worker.recognize(c);days[day][mealKeys[meal]]=data.text.split('\n').map(line=>line.trim()).filter(Boolean)}c.width=c.height=0;
 }
 return {reviewNote:'이미지 인식 결과입니다. 잘못 읽은 글자가 있을 수 있으니 저장 전에 원본과 메뉴를 확인해주세요.',weekStart:firstDate,sourceName:name,updatedAt:new Date().toISOString(),days};
}
