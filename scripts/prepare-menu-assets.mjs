import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),target=path.join(root,'public/ocr');
await fs.mkdir(target,{recursive:true});
const tess=path.dirname(require.resolve('tesseract.js/package.json')),core=path.dirname(require.resolve('tesseract.js-core/package.json')),pdf=path.dirname(require.resolve('pdfjs-dist/package.json'));
await fs.copyFile(path.join(tess,'dist/worker.min.js'),path.join(target,'worker.min.js'));
for(const name of await fs.readdir(core))if(name.endsWith('.wasm')||name.endsWith('.wasm.js'))await fs.copyFile(path.join(core,name),path.join(target,name));
await fs.cp(path.join(pdf,'cmaps'),path.join(target,'cmaps'),{recursive:true});
await fs.cp(path.join(pdf,'standard_fonts'),path.join(target,'pdf-fonts'),{recursive:true});
await fs.copyFile(path.join(tess,'LICENSE.md'),path.join(target,'tesseract-LICENSE.md'));
await fs.copyFile(path.join(core,'LICENSE'),path.join(target,'core-LICENSE'));
await fs.copyFile(path.join(pdf,'LICENSE'),path.join(target,'pdfjs-LICENSE'));
await fs.mkdir(path.join(target,'lang-best'),{recursive:true});
for(const lang of ['kor']){
 const dest=path.join(target,'lang-best',lang+'.traineddata.gz');
 try{await fs.access(dest)}catch{
  const response=await fetch(`https://tessdata.projectnaptha.com/4.0.0_best/${lang}.traineddata.gz`);if(!response.ok)throw Error('OCR language download failed: '+lang);
  await fs.writeFile(dest,new Uint8Array(await response.arrayBuffer()));
 }
}
console.log('Weekly menu reading assets ready');
