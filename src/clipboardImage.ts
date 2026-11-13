export function pastedImage(data:DataTransfer):File|undefined{
 return [...data.files].find(file=>/^image\/(png|jpeg|webp)$/.test(file.type));
}
// Clipboard images may have no filename or a JPEG/WebP name. Decode and
// normalize them before passing them to the PNG recognition path.
export async function clipboardPng(file:File):Promise<File>{
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>10*1024*1024)throw Error('10MB 이하 이미지를 붙여넣어 주세요.');
 const bitmap=await createImageBitmap(file);
 if(bitmap.width>6000||bitmap.height>12000){bitmap.close();throw Error('이미지 크기를 줄여 다시 붙여넣어 주세요.');}
 const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
 try{const context=canvas.getContext('2d');if(!context)throw Error('이미지를 읽지 못했어요.');context.drawImage(bitmap,0,0);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('이미지를 읽지 못했어요.')),'image/png'));if(blob.size>10*1024*1024)throw Error('이미지 크기를 줄여 다시 붙여넣어 주세요.');return new File([blob],'붙여넣은 이미지.png',{type:'image/png'});}finally{bitmap.close();canvas.width=canvas.height=0;}
}
