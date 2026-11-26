import {parseProgramExcel} from './programExcel.ts';
import type {ExcelCell,ExcelSheet,ProgramSelection} from './programExcel.ts';

// XLSX is a ZIP of XML documents. Read only workbook data, never macros/links.
export async function excelXmlEntries(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer),decoder=new TextDecoder();
 const fail=()=>Error('엑셀 파일을 읽지 못했어요. 암호 없이 저장한 XLSX 파일을 선택해주세요.');
 let end=bytes.length-22;
 while(end>=Math.max(0,bytes.length-65557)&&view.getUint32(end,true)!==0x06054b50)end--;
 if(end<0||end<bytes.length-65557)throw fail();
 const count=view.getUint16(end+10,true);let offset=view.getUint32(end+16,true),total=0;
 if(count>3000)throw fail();
 const entries=new Map<string,string>();
 for(let i=0;i<count;i++){
  if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw fail();
  const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true);
  const nameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  const name=decoder.decode(bytes.slice(offset+46,offset+46+nameLength));offset+=46+nameLength+extra+comment;
  if(!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name))continue;
  total+=size;if(flags&1||size>20*1024*1024||total>40*1024*1024||local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)throw fail();
  const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
  if(start+compressed>bytes.length)throw fail();
  const data=bytes.slice(start,start+compressed);
  let result:Uint8Array;
  if(method===0)result=data;
  else if(method===8){
   const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
   const chunks:Uint8Array[]=[];let length=0;
   while(true){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>size){await reader.cancel();throw fail()}chunks.push(next.value)}
   result=new Uint8Array(length);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length}
  }else throw fail();
  if(result.length!==size)throw fail();entries.set(name,decoder.decode(result));
 }
 return entries;
}
function xml(text:string){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('엑셀 내부 형식을 읽지 못했어요. XLSX로 다시 저장해주세요.');return doc}
const elements=(node:Document|Element,name:string)=>Array.from(node.getElementsByTagNameNS('*',name));
function position(ref:string){const match=ref.match(/^([A-Z]+)(\d+)$/);if(!match)throw Error('엑셀 셀 주소가 올바르지 않아요.');let col=0;for(const letter of match[1])col=col*26+letter.charCodeAt(0)-64;return {col,row:Number(match[2])}}
export function programExcelSheets(entries:Map<string,string>){
 const workbook=xml(entries.get('xl/workbook.xml')??''),rels=xml(entries.get('xl/_rels/workbook.xml.rels')??'');
 const shared=entries.has('xl/sharedStrings.xml')?elements(xml(entries.get('xl/sharedStrings.xml')!),'si').map(si=>elements(si,'t').map(t=>t.textContent??'').join('')):[];
 const sheets:ExcelSheet[]=[];
 for(const sheet of elements(workbook,'sheet')){
  if(sheet.getAttribute('state')==='hidden'||sheet.getAttribute('state')==='veryHidden')continue;
  const id=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const rel=elements(rels,'Relationship').find(r=>r.getAttribute('Id')===id);
  if(!rel||rel.getAttribute('TargetMode')==='External')continue;
  const target=rel.getAttribute('Target')??'';
  const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  if(!entries.has(path))continue;
  const doc=xml(entries.get(path)!);
  const merges=new Map(elements(doc,'mergeCell').map(m=>{const [from,to]=(m.getAttribute('ref')??'').split(':');return [from,position(to??from).col]}));
  const cells:ExcelCell[]=elements(doc,'c').map(cell=>{
   const ref=cell.getAttribute('r')??'',pos=position(ref),type=cell.getAttribute('t');
   const value=elements(cell,'v')[0]?.textContent??'';
   const text=type==='s'?(shared[Number(value)]??''):type==='inlineStr'?elements(cell,'t').map(t=>t.textContent??'').join(''):value;
   return {...pos,endCol:merges.get(ref)??pos.col,text};
  });
  sheets.push({name:sheet.getAttribute('name')??'',cells});
 }
 return {sheets,date1904:['1','true'].includes(elements(workbook,'workbookPr')[0]?.getAttribute('date1904')??'')};
}
export async function readProgramExcel(file:File,onProgress:(text:string)=>void,selection:ProgramSelection){
 if(!/\.xlsx$/i.test(file.name)||file.size>10*1024*1024)throw Error('10MB 이하 XLSX 파일을 선택해주세요. 구형 XLS는 엑셀에서 XLSX로 저장해주세요.');
 onProgress('엑셀의 학교·반별 일정과 예외 시간을 읽고 있어요…');
 const {sheets,date1904}=programExcelSheets(await excelXmlEntries(await file.arrayBuffer()));
 return parseProgramExcel(sheets,file.name,selection,date1904);
}
