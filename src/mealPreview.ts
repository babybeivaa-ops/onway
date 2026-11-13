import type {WeeklyMenu} from './weeklyMeals';
export const mealPreviewKey=(groupId:string)=>'onway-meal-preview-v1:'+groupId;
export function withMealPreview(actual:WeeklyMenu[],preview:WeeklyMenu|null,start:string,end:string){
 if((!preview?.previewSourceWeek&&!preview?.previewKind)||actual.some(m=>m.weekStart===preview.weekStart)||!preview.days.some(d=>d.date>=start&&d.date<=end))return actual;
 return [...actual,preview];
}

