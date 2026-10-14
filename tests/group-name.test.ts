import test from 'node:test';
import assert from 'node:assert/strict';
import {formatGroupName} from '../src/groupName.ts';
test('separates known region prefixes on school names', () => {
 assert.equal(formatGroupName('창원현동초'), '창원 현동초');
 assert.equal(formatGroupName('창원현동초등학교'), '창원 현동초등학교');
 assert.equal(formatGroupName('영암삼호고'), '영암 삼호고');
});
test('preserves already spaced names and unrelated names', () => {
 for (const name of ['창원 현동초','현동초등학교','창원초등학교','창원청소년센터','서울대학교']) assert.equal(formatGroupName(name),name);
});
