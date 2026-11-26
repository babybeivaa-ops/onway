import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProgramExcel} from '../src/programExcel.ts';
import type {ExcelCell} from '../src/programExcel.ts';
const c=(row:number,col:number,text:string,endCol=col):ExcelCell=>({row,col,text,endCol});
const cells=[c(1,2,'월'),c(1,4,'46349'),c(2,2,'사업/단체'),c(2,4,'가람초등학교',7),c(2,10,'누리초등학교',13),c(3,2,'구분'),c(3,4,'1반(20)'),c(3,7,'2, 3반(40)'),c(4,2,'13:40~15:50'),c(4,4,'대기비행의 원리와 종이비행기',7),c(4,10,'GPS 오리엔티어링',13),c(7,2,'장소'),c(7,4,'영상관 13:40~15:10',7),c(7,10,'위성블럭실',13)];
test('merged activity includes both class columns and its own exceptional time',()=>{
 const plan=parseProgramExcel([{name:'편성표',cells}],'test.xlsx',{name:'가람초등학교',date:'2026-11-23'});
 assert.equal(plan.groups.length,1);assert.deepEqual(plan.groups[0].sessions,[{date:'2026-11-23',time:'13:40~15:10',activity:'대기비행의 원리와 종이비행기',place:'영상관',classes:'1반·2·3반'}]);
});
test('other school keeps the common row time',()=>{const plan=parseProgramExcel([{name:'편성표',cells}],'test.xlsx',{name:'누리초등학교',date:'2026-11-23'});assert.equal(plan.groups[0].sessions[0].time,'13:40~15:50')});
test('unknown school and unrelated workbook cannot overwrite a schedule',()=>{
 assert.throws(()=>parseProgramExcel([{name:'편성표',cells}],'x.xlsx',{name:'다른초등학교',date:'2026-11-23'}),/찾지 못/);
 assert.throws(()=>parseProgramExcel([{name:'업무',cells:[]}],'x.xlsx',{name:'가람초등학교',date:'2026-11-23'}),/찾지 못/);
});
test('duplicate backup worksheet is not imported twice',()=>{assert.equal(parseProgramExcel([{name:'편성표',cells},{name:'중복',cells}],'x.xlsx',{name:'가람초등학교',date:'2026-11-23'}).groups[0].sessions.length,1)});
