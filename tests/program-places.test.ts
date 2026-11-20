import test from 'node:test';
import assert from 'node:assert/strict';
import {displayProgramPlace} from '../src/programPlaces.ts';
test('observatory and team meeting room names and abbreviations',()=>{
 for(const value of ['팀','(팀)','（팀）','팀미팅룸','팀미팅롬'])assert.equal(displayProgramPlace(value),'팀미팅룸');
 assert.equal(displayProgramPlace('(팀) MAT MW 4D / S.O.S.'),'팀미팅룸 / MAT MW 4D / S.O.S.');
 assert.equal(displayProgramPlace('덕흥천문대'),'덕흥천문대');
 assert.equal(displayProgramPlace('덕홍천문대'),'덕흥천문대');
 assert.equal(displayProgramPlace('(영) MAT'),'영상관 / MAT');
 assert.equal(displayProgramPlace('세미나실'),'세미나실');
});

test('confirmed planetarium OCR and program venue use the correct room',()=>{assert.equal(displayProgramPlace('선체투통관'),'천체투영관');for(const place of ['','선체투통관','세미나실'])assert.equal(displayProgramPlace(place,'천체투영관에서 본 하늘'),'천체투영관');assert.equal(displayProgramPlace('세미나실','자기주도 활동'),'세미나실')});

test('small seminar shorthand in staff timetable is shown as the visitor room name',()=>{assert.equal(displayProgramPlace('(소세) MAT MW 4D / S.O.S.'),'소세미나실')});
