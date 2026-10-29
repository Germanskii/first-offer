import {ownerResume} from './demo-resume.js';
import {ownerPortfolio} from './demo-portfolio.js';
// Production identity is supplied by the Sites Sign in with ChatGPT gateway.
// Never accept identity from query parameters, browser storage, or request bodies.
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(['/api/resume-baseline','/api/portfolio-baseline'].includes(url.pathname)){
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  if(!request.headers.get('oai-authenticated-user-id'))return json({error:'sign_in_required'},401);
  const email=(request.headers.get('oai-authenticated-user-email')||'').toLowerCase();
  const key=url.pathname==='/api/resume-baseline'?'resume':'portfolio';
  if(!env.TRACKER_OWNER_EMAIL||email!==env.TRACKER_OWNER_EMAIL.toLowerCase())return json({[key]:null});
  return json({[key]:key==='resume'?ownerResume:ownerPortfolio});
 }
 if(url.pathname==='/api/session'){
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  const id=request.headers.get('oai-authenticated-user-id');
  if(!id)return json({error:'sign_in_required'},401);
  const email=(request.headers.get('oai-authenticated-user-email')||'').toLowerCase();
  let name=request.headers.get('oai-authenticated-user-full-name')||'Мой профиль';
  if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name)}catch{name='Мой профиль'}}
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));
  const storageId=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const isOwner=!!env.TRACKER_OWNER_EMAIL&&email===env.TRACKER_OWNER_EMAIL.toLowerCase();
  return json({storageId,name:name.slice(0,100),isOwner});
 }
 if(url.pathname==='/api/backup'){
  const userId=request.headers.get('oai-authenticated-user-id');if(!userId)return json({error:'sign_in_required'},401);
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  try{const row=await env.DB.prepare('SELECT state, revision FROM strategy_backups WHERE user_id=?').bind(userId).first();return json(row?{state:JSON.parse(row.state),revision:row.revision}:{state:null})}catch{return json({error:'storage_unavailable'},503)}
 }
 if(url.pathname==='/api/search-profile'){
  const userId=request.headers.get('oai-authenticated-user-id');
  if(!userId)return json({error:'sign_in_required'},401);
  const profileId=request.headers.get('X-Profile');if(profileId){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId));const expected=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');if(profileId!==expected)return json({error:'account_changed'},403);}
  if(!env.DB)return json({error:'storage_unavailable'},503);
  try{
   if(request.method==='GET'){const row=await env.DB.prepare('SELECT profile, updated_at FROM search_profiles WHERE user_id = ?').bind(userId).first();return json(row?{profile:JSON.parse(row.profile),updatedAt:row.updated_at}:{profile:null,updatedAt:null})}
   if(request.method!=='PUT')return json({error:'method_not_allowed'},405);
   if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'forbidden'},403);
   const raw=await request.text();if(raw.length>30000)return json({error:'too_large'},413);let data;try{data=JSON.parse(raw)}catch{return json({error:'invalid_json'},400)}if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'invalid_profile'},400);const limits={headline:300,githubUrl:2000,linkedinUrl:2000,targetRoles:2000,skills:4000,locations:2000,languages:1000,projects:8000,cvVersion:160,cvUrl:2000};const profile={};for(const [field,max]of Object.entries(limits)){if(typeof data?.[field]!=='string'||data[field].length>max)return json({error:'invalid_profile'},400);profile[field]=data[field]}
   for(const field of ['githubUrl','linkedinUrl','cvUrl'])if(profile[field]){try{const protocol=new URL(profile[field]).protocol;if(protocol!=='http:'&&protocol!=='https:')throw Error()}catch{return json({error:'invalid_url'},400)}}
   const at=new Date().toISOString();await env.DB.prepare('INSERT INTO search_profiles (user_id,profile,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile=excluded.profile,updated_at=excluded.updated_at').bind(userId,JSON.stringify(profile),at).run();return json({updatedAt:at});
  }catch(e){console.error('Search profile storage failed',e.message);return json({error:'storage_unavailable'},503)}
 }
 if(url.pathname==='/api/state'){
  const userId=request.headers.get('oai-authenticated-user-id');
  if(!userId)return json({error:'sign_in_required'},401);
  const profile=request.headers.get('X-Profile');if(profile){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId));const expected=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');if(profile!==expected)return json({error:'account_changed'},403);}
  if(!env.DB)return json({error:'storage_unavailable'},503);
  try{
   if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT state, revision FROM tracker_profiles WHERE user_id = ?').bind(userId).first();
    return json(row?{state:JSON.parse(row.state),revision:row.revision}:{state:null,revision:0});
   }
   if(request.method!=='PUT')return json({error:'method_not_allowed'},405);
   if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'forbidden'},403);
   const raw=await request.text();if(raw.length>2000000)return json({error:'too_large'},413);
   let data;try{data=JSON.parse(raw)}catch{return json({error:'invalid_json'},400)}if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'invalid_state'},400);if(!Number.isInteger(data.revision)||data.revision<0||data.state?.version!==1||!Array.isArray(data.state.jobs)||data.state.jobs.length>3000)return json({error:'invalid_state'},400);
   const value=JSON.stringify(data.state),at=new Date().toISOString();
   // Immutable, account-scoped snapshot before the first write by the upgraded app.
   // Failure aborts the save; never discard the original cloud state without a backup.
   await env.DB.prepare('INSERT INTO strategy_backups (user_id,state,revision,created_at) SELECT user_id,state,revision,? FROM tracker_profiles WHERE user_id=? ON CONFLICT(user_id) DO NOTHING').bind(at,userId).run();
   const result=data.revision===0
    ?await env.DB.prepare('INSERT INTO tracker_profiles (user_id,state,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id) DO NOTHING').bind(userId,value,at).run()
    :await env.DB.prepare('UPDATE tracker_profiles SET state=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=?').bind(value,at,userId,data.revision).run();
   if(!result.meta.changes)return json({error:'conflict'},409);
   // Only mirror the exact successfully saved profile, never a stale startup cache.
   const p=data.state.profile;if(p&&typeof p==='object'){
    const safe={};for(const key of ['headline','githubUrl','linkedinUrl','targetRoles','skills','locations','languages','projects','refreshSkills'])safe[key]=typeof p[key]==='string'?p[key].slice(0,key==='projects'?8000:4000):'';
    safe.strategyVersion=2;safe.sourceRevision=data.revision+1;safe.isOwner=!!env.TRACKER_OWNER_EMAIL&&(request.headers.get('oai-authenticated-user-email')||'').toLowerCase()===env.TRACKER_OWNER_EMAIL.toLowerCase();
    try{await env.DB.prepare("INSERT INTO search_profiles (user_id,profile,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile=excluded.profile,updated_at=excluded.updated_at WHERE COALESCE(json_extract(search_profiles.profile,'$.sourceRevision'),0)<=?").bind(userId,JSON.stringify(safe),at,safe.sourceRevision).run()}catch(e){console.error('Search context mirror failed',e.message);return json({revision:data.revision+1,searchProfileSynced:false})}
   }
   return json({revision:data.revision+1});
  }catch(e){console.error('Profile storage failed',e.message);return json({error:'storage_unavailable'},503)}
 }
 if(url.pathname.startsWith('/api/'))return json({error:'not_found'},404);
 if(!env.ASSETS)return new Response('Assets unavailable',{status:503});
 const response=await env.ASSETS.fetch(request);
 const headers=new Headers(response.headers);
 if(url.pathname.endsWith('feed.json')||url.pathname==='/'||url.pathname.endsWith('.js'))headers.set('Cache-Control','no-cache, no-store, must-revalidate');
 headers.set('X-Content-Type-Options','nosniff');
 return new Response(response.body,{status:response.status,headers});
}};
