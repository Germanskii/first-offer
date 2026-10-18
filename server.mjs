import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const sqlite=new DatabaseSync(':memory:');for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}}}}};
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import worker from './dist/server/index.js';
const root=path.resolve('dist/client');
const assets={async fetch(request){try{const name=decodeURIComponent(new URL(request.url).pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error();const body=await readFile(file);return new Response(body,{headers:{'Content-Type':({'html':'text/html; charset=utf-8','js':'application/javascript','json':'application/json','css':'text/css','svg':'image/svg+xml'})[file.split('.').pop()]||'application/octet-stream'}})}catch{return new Response('Not found',{status:404})}}};
// Local-only simulated identities. This server is not included in deployment archives.
http.createServer(async(req,res)=>{try{
 const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(!k.startsWith('oai-authenticated-user-')&&typeof v==='string')headers.set(k,v);
 const who=process.env.LOCAL_TEST_MODE==='1'?req.headers['x-test-principal']||'owner':'owner';
 if(who!=='anonymous'){
  headers.set('oai-authenticated-user-id',who==='guest'?'local-guest':'local-owner');
  headers.set('oai-authenticated-user-email',who==='guest'?'guest@sites.test':'owner@sites.test');
  headers.set('oai-authenticated-user-full-name',who==='guest'?'Guest':'Owner');
 }
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
 const response=await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers,...(body.length?{body}: {})}),{DB,ASSETS:assets,TRACKER_OWNER_EMAIL:'owner@sites.test'});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch{res.writeHead(500);res.end('Local error')}}).listen(Number(process.argv[process.argv.indexOf('--port')+1])||Number(process.env.PORT)||3000,'127.0.0.1');
