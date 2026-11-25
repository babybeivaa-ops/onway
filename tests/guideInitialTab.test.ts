import test from 'node:test';
import assert from 'node:assert/strict';
import {guideInitialTab} from '../src/guideInitialTab.ts';
test('opens movement before admission day at 18:00 KST',()=>{
 assert.equal(guideInitialTab('2026-11-25',Date.parse('2026-11-24T19:00:00+09:00')),'이동');
 assert.equal(guideInitialTab('2026-11-25',Date.parse('2026-11-25T17:59:59+09:00')),'이동');
});
test('opens arrival information at cutoff and on following days',()=>{
 assert.equal(guideInitialTab('2026-11-25',Date.parse('2026-11-25T09:00:00Z')),'입소안내');
 assert.equal(guideInitialTab('2026-11-25',Date.parse('2026-11-26T08:00:00+09:00')),'입소안내');
});
test('missing or invalid admission date keeps movement accessible',()=>{
 assert.equal(guideInitialTab(''),'이동');assert.equal(guideInitialTab('invalid'),'이동');
});
