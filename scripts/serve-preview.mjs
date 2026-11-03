// Local QA only. SQLite WASM requires a cross-origin isolated context.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.join(root,pathname);if(!file.startsWith(root+path.sep)&&file!==root)throw new Error('Path');if(!path.extname(file))file=path.join(root,'index.html');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(8081,'0.0.0.0',()=>console.log('QA preview http://localhost:8081'));
