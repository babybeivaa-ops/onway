import test from 'node:test';
import assert from 'node:assert/strict';
import {plannedArrivalParts,plannedArrivalTime} from '../src/plannedArrivalInput.ts';

test('new arrival defaults to afternoon with actual zero values',()=>{
 assert.deepEqual(plannedArrivalParts(),{period:'PM',hour:'00',minute:'00'});
 assert.equal(plannedArrivalTime(plannedArrivalParts()),'12:00');
});
test('untouched or emptied minutes save as zero and 24-hour input normalizes',()=>{
 assert.equal(plannedArrivalTime({...plannedArrivalParts(),hour:'03'}),'15:00');
 assert.equal(plannedArrivalTime({period:'PM',hour:'03',minute:''}),'15:00');
 assert.equal(plannedArrivalTime({...plannedArrivalParts(),hour:'15'}),'15:00');
 assert.deepEqual(plannedArrivalParts('15:00'),{period:'PM',hour:'03',minute:'00'});
});
test('noon, midnight, morning and saved periods remain distinct',()=>{
 assert.equal(plannedArrivalTime({period:'AM',hour:'12',minute:'00'}),'00:00');
 assert.equal(plannedArrivalTime({period:'PM',hour:'12',minute:'00'}),'12:00');
 assert.equal(plannedArrivalTime({period:'AM',hour:'09',minute:'5'}),'09:05');
 assert.equal(plannedArrivalParts('09:05').period,'AM');
});
test('invalid input stays rejected and explicitly clearing both fields is supported',()=>{
 for(const value of [{hour:'24',minute:'00'},{hour:'15',minute:'60'},{hour:'ab',minute:'00'}])
  assert.throws(()=>plannedArrivalTime({period:'PM',...value}));
 assert.equal(plannedArrivalTime({period:'PM',hour:'',minute:''}),'');
});
