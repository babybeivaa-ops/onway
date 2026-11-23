import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=process.env.ONWAY_DATA_DIR||path.resolve(root,'../.onway-server-data');
const origin='http://127.0.0.1:'+(process.env.PORT||4186);
try{
 const token=process.env.ONWAY_ADMIN_TOKEN?.trim()||fs.readFileSync(path.join(directory,'admin-access.secret'),'utf8').trim();
 const response=await fetch(origin+'/api/shared/admin-setup-link',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Setup failed ('+response.status+'). Restart ONWAY with the latest code.');
 const {token:setup}=await response.json();
 const url=origin+'/?center-admin=1#admin-setup='+encodeURIComponent(setup);
 if(process.argv.includes('--check-only')){
  console.log('Setup endpoint verified. One-time setup link issued successfully.');
 }else{
  // Keep a manual fallback when Windows does not open the default browser.
  const shortcut=path.join(root,'ONWAY-center-code-settings.url');
  fs.writeFileSync(shortcut,'[InternetShortcut]\r\nURL='+url+'\r\n');
  const opened=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Start-Process -FilePath $env:ONWAY_SETUP_URL -ErrorAction Stop'],{windowsHide:true,env:{...process.env,ONWAY_SETUP_URL:url},stdio:'ignore',timeout:15000});
  console.log(opened.status===0?'Setup page requested in your default browser.':'The browser could not be opened automatically.');
  console.log('If no page appears, double-click ONWAY-center-code-settings.url in this ONWAY folder.');
  console.log('Enter your new center code twice (at least 10 characters), then save.');
  console.log('This one-time setup link expires in 10 minutes. Run this file again if it expires.');
 }
}catch(error){console.error(error.message);process.exitCode=1;}
