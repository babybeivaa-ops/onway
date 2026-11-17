import test from 'node:test';
import assert from 'node:assert/strict';
import {matchProgramActivity,suggestProgramActivity,normalizeProgramGroup,confirmedProgramActivity} from '../src/programActivityMatch.ts';
import {programActivities} from '../src/programTimetable.ts';
test('exact copied user error is corrected for imports, display and editor drafts',()=>{
 const raw='으츠이후려자비체천6: (0)',expected='우주인훈련장비체험 & S.O.S.';
 assert.equal(confirmedProgramActivity(raw),expected);
 assert.deepEqual(matchProgramActivity(raw,programActivities),{activity:expected,changed:true,needsReview:false});
 assert.equal(normalizeProgramGroup({sessions:[{activity:raw}]},programActivities).sessions[0].activity,expected);
 assert.equal(suggestProgramActivity(raw,programActivities),undefined);
});
test('OCR spelling and spacing match registered activity names',()=>{
 for(const name of programActivities)assert.equal(matchProgramActivity(name,programActivities).activity,name);
 assert.equal(matchProgramActivity('GPS오리엔티어링',programActivities).activity,'GPS 오리엔티어링');
 assert.equal(matchProgramActivity('천체투영관에서 본 하늘',programActivities).needsReview,false);
 assert.equal(matchProgramActivity('대기비행의 안정성과 폼로켓',programActivities).activity,'대기비행의 안정성과 폼로켓');
 assert.equal(matchProgramActivity('에어로켓 원하는 곳에 보내가',programActivities).activity,'에어로켓 원하는 곳에 보내기');
 assert.equal(matchProgramActivity('우주인 훈련장비체험 S.O.S.',programActivities).activity,'우주인훈련장비체험 & S.O.S.');
});
test('distinctive damaged Hangul OCR automatically uses the catalog name',()=>{
 for(const text of ['으초이후련자비체천6: (0)','우주인후련자비체천6: (0)','우주인 훈련장비체험']){
  assert.equal(suggestProgramActivity(text,programActivities),undefined);
  assert.equal(matchProgramActivity(text,programActivities).activity,'우주인훈련장비체험 & S.O.S.');
 }
 for(const text of ['덕흥천문대 소개','원격관측 실습','대기비행',''])assert.equal(suggestProgramActivity(text,programActivities),undefined);
 assert.equal(suggestProgramActivity('관측자료 이론 및 실습',['관측자료 이론 및 실습 1','관측자료 이론 및 실습 2']),undefined);
});
test('unknown, truncated and ambiguous names are preserved for review',()=>{
 for(const name of ['덕흥천문대 소개','원격관측 실습','대기비행',''])assert.deepEqual(matchProgramActivity(name,programActivities),{activity:name,changed:false,needsReview:true});
 const name='관측자료 이론 및 실습';
 assert.equal(matchProgramActivity(name,[name+' 1',name+' 2']).needsReview,true);
});

test('existing editor drafts are corrected without mutating saved rows',()=>{const g={sessions:[{activity:'으초이후련자비체천6: (0)',place:'세미나실'}]};const fixed=normalizeProgramGroup(g,programActivities);assert.equal(fixed.sessions[0].activity,'우주인훈련장비체험 & S.O.S.');assert.equal(fixed.sessions[0].place,'세미나실');assert.equal(g.sessions[0].activity,'으초이후련자비체천6: (0)')});

test('user-confirmed OCR error is corrected in saved display and future imports',()=>{for(const raw of ['으초이후련자비체천6: (0)','으초이후련자비체천6: (O)','으초이후련자비체천6: (ㅇ)']){assert.equal(confirmedProgramActivity(raw),'우주인훈련장비체험 & S.O.S.');assert.equal(matchProgramActivity(raw,programActivities).needsReview,false)}assert.equal(confirmedProgramActivity('덕흥천문대 소개'),'덕흥천문대 소개')});
