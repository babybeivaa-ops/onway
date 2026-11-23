const key='onway.admin.selected-group';
export function rememberSelectedGroup(storage:Pick<Storage,'setItem'>,id:string){try{storage.setItem(key,id)}catch{}}
export function restoreSelectedGroup(storage:Pick<Storage,'getItem'>,groups:{id:string}[],current:string|undefined,fallback:string){let remembered:string|null=null;try{remembered=storage.getItem(key)}catch{}return [current,remembered,fallback].find(id=>id&&groups.some(g=>g.id===id))??groups[0]?.id??''}
