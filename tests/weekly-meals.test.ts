import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mealDates,monday,parseWeeklyMenu} from '../src/weeklyMeals.ts';
import type {Word} from '../src/weeklyMeals.ts';
test('meals follow the entered arrival date, duration and optional lunch, including week/year boundaries',()=>{
 assert.deepEqual(mealDates('2026-11-13','1박 2일'),[{date:'2026-11-13',meal:'dinner'},{date:'2026-11-14',meal:'breakfast'},{date:'2026-11-14',meal:'lunch'}]);
 assert.equal(mealDates('2026-11-13','1박 2일',true)[0].meal,'lunch');
 assert.equal(mealDates('2026-12-31','2박 3일').at(-1)?.date,'2027-01-02');
 assert.equal(mealDates('2026-11-15','2박 3일').length,6);assert.equal(monday('2026-11-16'),'2026-11-16');
 assert.deepEqual(mealDates('2026-11-13',undefined),[]);assert.deepEqual(mealDates('2026-11-13','당일'),[]);assert.deepEqual(mealDates('2026-11-13','당일',true),[{date:'2026-11-13',meal:'lunch'}]);
});
test('spatial parser separates menus from group/count blocks and keeps empty source cells empty',()=>{
 const words:Word[]=Array.from({length:7},(_,i)=>({text:`11월 ${9+i}일`,x:100+i*100,y:40,w:50,h:10}));
 for(let meal=0;meal<3;meal++){const y=100+meal*150;words.push({text:'메',x:50,y,w:10,h:10},{text:'뉴',x:50,y:y+10,w:10,h:10},{text:'인원',x:45,y:y+50,w:20,h:10},{text:'단체 이름 45명',x:110,y:y-50,w:70,h:10});}
 words.push({text:'카레우동',x:410,y:400,w:40,h:10},{text:'순살감자탕',x:510,y:250,w:50,h:10});
 const result=parseWeeklyMenu(words,'2026-11-09','weekly.pdf');assert.deepEqual(result.days[3].dinner,['카레우동']);assert.deepEqual(result.days[4].lunch,['순살감자탕']);assert.deepEqual(result.days[4].dinner,[]);assert(!JSON.stringify(result).includes('단체 이름'));assert.throws(()=>parseWeeklyMenu(words.filter(w=>w.text!=='인원'),'2026-11-09','bad.pdf'));
});
