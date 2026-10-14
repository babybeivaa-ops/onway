import type {StorageLike} from './workspace';
import {WORKSPACE_KEY,LEGACY_KEY} from './workspace.ts';
export const DEMO_STORAGE_PREFIX='onway-self-demo:';
export function demoStorage(storage:StorageLike):StorageLike{return {
 getItem(key){if(key===LEGACY_KEY)return null;const saved=storage.getItem(DEMO_STORAGE_PREFIX+key);return saved===null&&key===WORKSPACE_KEY?JSON.stringify({version:2,activeGroupId:'',view:'admin',groups:[]}):saved;},
 setItem(key,value){storage.setItem(DEMO_STORAGE_PREFIX+key,value)}
};}
