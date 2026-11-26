import test from 'node:test';
import assert from 'node:assert/strict';
import {unreadAdminChats,incomingAdminChats} from '../src/adminChatInbox.ts';
import type {DemoGroup} from '../src/workspace';
const groups=[
 {id:'upcoming',travelDate:'2099-01-01',state:{centerMessages:[{id:'a',text:'예정 단체',at:'2026-11-26'}]}},
 {id:'admitted',travelDate:'2026-11-25',state:{admissionCompletedAt:'2026-11-25',centerMessages:[{id:'b',text:'입소 완료',at:'2026-11-26',sender:'guide'}]}},
 {id:'past',travelDate:'2020-01-01',state:{centerMessages:[{id:'c',text:'보관 단체',at:'2020-01-01'},{id:'read',acknowledgedAt:'2020-01-01'},{id:'cancelled',cancelledAt:'2020-01-01'},{id:'sent',sender:'admin'}]}},
] as DemoGroup[];
test('all schools contribute unread chats regardless of arrival or archived visit',()=>{const unread=unreadAdminChats(groups);assert.deepEqual(unread.map(x=>[x.group.id,x.count]),[['upcoming',1],['admitted',1],['past',1]])});
test('incoming queue excludes read, cancelled and center messages across every school',()=>{assert.deepEqual(incomingAdminChats(groups).map(x=>x.key),['upcoming:a','admitted:b','past:c'])});
