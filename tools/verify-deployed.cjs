// Verify public Pages responses byte-for-byte against this checkout (no authentication).
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base=process.argv[2]||'https://yanghaobin525-commits.github.io/shenhua-cuilian/';
const root=path.resolve(__dirname,'..'),files=['index.html','config.js','combat-art.js','game.js','audio.js'];
function walk(dir){for(const ent of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const p=dir+'/'+ent.name;if(ent.isDirectory())walk(p);else files.push(p);}}
walk('assets/approved-v6');walk('assets/selection-v6');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const result=[];for(let i=0;i<files.length;i+=5)await Promise.all(files.slice(i,i+5).map(async file=>{const response=await fetch(new URL(file+'?verify=approved-v6-20261116',base));const actual=Buffer.from(await response.arrayBuffer()),expected=fs.readFileSync(path.join(root,file));const ok=response.ok&&hash(actual)===hash(expected);result.push({file,status:response.status,sha256:hash(actual),match:ok});}));fs.mkdirSync(path.join(root,'screens'),{recursive:true});fs.writeFileSync(path.join(root,'screens/v6-deployment-hashes.json'),JSON.stringify({base,files:result},null,2));const bad=result.filter(x=>!x.match);if(bad.length)throw Error('Public deployment differs: '+JSON.stringify(bad));console.log('PASS: '+result.length+' public runtime/art files match this checkout byte-for-byte at '+base);})().catch(e=>{console.error(e);process.exit(1);});
