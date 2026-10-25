import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Engine } from './engine.js';
import { parseCSV } from './csv.js';
import { studyPack } from './questions.js';
const engine=new Engine(process.env.QUEST_DB??fileURLToPath(new URL('./data/quest.sqlite',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/api/state')return send(200,engine.snapshot());
  if(req.method==='GET'&&url.pathname==='/api/audit')return send(200,engine.auditLog());
  if(req.method==='GET'&&url.pathname==='/api/backup'){res.setHeader('Content-Disposition','attachment; filename="ai103-backup.json"');return send(200,engine.backup());}
  if(req.method==='POST'&&url.pathname==='/api/command'){
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'origin_forbidden'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'json_required'});
   let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>8_000_000)return send(413,{error:'payload_too_large'});body+=chunk;}
   let data;try{data=JSON.parse(body);if(!data||typeof data!=='object')throw Error();if(data.action==='import'&&data.csv)data.pack=parseCSV(data.csv,data.version);if(data.action==='import'&&data.builtin_version){if(data.builtin_version!==studyPack.version)throw Error('invalid_builtin');data.pack=studyPack;}}catch{return send(400,{error:'validation_failed'});}
   const result=engine.command(data);return send(result.status,result);
  }
  const paths={'/':'index.html','/app.js':'app.js','/explanations.js':'explanations.js','/style.css':'style.css','/sw.js':'sw.js','/manifest.json':'manifest.json','/icon.svg':'icon.svg'};
  const name=paths[url.pathname];if(req.method!=='GET'||!name)return send(404,{error:'not_found'});
  const content=await readFile(new URL('./public/'+name,import.meta.url));res.writeHead(200,{'Content-Type':name.endsWith('.json')?'application/json':mime['.'+name.split('.').pop()],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});res.end(content);
 }catch(e){console.error(e.message);send(500,{error:'server_error'});}
});
server.listen(Number(process.env.PORT??3000),process.env.HOST??'0.0.0.0',()=>console.log('AI-103 Quest listening on port '+(process.env.PORT??3000)));
