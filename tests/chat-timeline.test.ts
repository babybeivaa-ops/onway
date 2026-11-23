import test from 'node:test';
import assert from 'node:assert/strict';
import {chatTimeline} from '../src/chatTimelineModel.ts';
import type {CenterMessage} from '../src/types.ts';
test('chat shows original messages and replies once in chronological order with correct speakers',()=>{
 const messages:CenterMessage[]=[{id:'school',text:'학교 질문',at:'2026-11-23T03:01:00Z',acknowledgedAt:'2026-11-23T03:02:00Z',replies:[{id:'reply',text:'센터 답변',at:'2026-11-23T03:03:00Z',actor:'admin'}]},{id:'center',sender:'admin',text:'센터 안내',at:'2026-11-23T03:00:00Z'}];
 const original=structuredClone(messages),rows=chatTimeline(messages);
 assert.deepEqual(rows.map(r=>[r.text,r.sender]),[['센터 안내','admin'],['학교 질문','guide'],['센터 답변','admin']]);
 assert.equal(rows[1].acknowledged,true);assert.equal(new Set(rows.map(r=>r.id)).size,3);assert.deepEqual(messages,original);
});
