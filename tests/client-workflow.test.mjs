// Local DOM integration, not browser automation. No network or production data.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {SourceTextModule} from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM,VirtualConsole} from 'jsdom';
import worker from '../dist/server/index.js';

const root=new URL('../dist/client/',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const db=new DatabaseSync(':memory:');
for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const DB={prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)||null},async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}}}}}};
async function waitFor(fn,message){for(let i=0;i<100;i++){if(fn())return;await delay(30)}assert.fail(message)}
const stored=()=>{const row=db.prepare('SELECT state FROM tracker_profiles WHERE user_id=?').get('dom-test');return row?JSON.parse(row.state):null};
async function mount(){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://local-test.invalid/',runScripts:'outside-only',virtualConsole:vc});
 const w=dom.window;w.structuredClone=structuredClone;w.setInterval=()=>0;w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 w.fetch=async(path,init={})=>{
  if(path==='/feed.json')return Response.json({version:1,checkedAt:'2026-09-28T06:10:44.557Z',jobs:[]});
  const headers=new Headers(init.headers);headers.set('Origin','https://local-test.invalid');headers.set('oai-authenticated-user-id','dom-test');headers.set('oai-authenticated-user-email','owner@test');
  return worker.fetch(new Request(new URL(path,w.location.href),{...init,headers}),{DB,TRACKER_OWNER_EMAIL:'owner@test'});
 };
 const context=dom.getInternalVMContext(),modules=new Map();
 function load(url){if(!modules.has(url))modules.set(url,new SourceTextModule(readFileSync(new URL(url),'utf8'),{context,identifier:url}));return modules.get(url)}
 const app=load(new URL('app.js',root).href);await app.link((spec,parent)=>load(new URL(spec,parent.identifier).href));await app.evaluate();
 const $=s=>w.document.querySelector(s);
 await waitFor(()=>$('#quick-filters')&&$('#share-description')?.textContent.includes('пригласить'),'app startup did not finish');
 const click=s=>{assert.ok($(s),'missing control '+s);$(s).click()};
 const fill=(name,value,form='#job-form')=>{const f=$(form);assert.ok(f.elements[name],'missing field '+name);f.elements[name].value=value;f.elements[name].dispatchEvent(new w.Event('input',{bubbles:true}))};
 const submit=(form='#job-form')=>$(form).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 return{dom,w,$,click,fill,submit,errors};
}

test('client create, save, reload, filters, today, applied and profile workflows',{timeout:20000},async()=>{
 let h=await mount();try{
  h.click('#portfolio-open');await waitFor(()=>h.$('[data-approve-fact="demo-data"]'),'portfolio did not load');
  assert.equal(h.$('#portfolio-links').elements.linkedinUrl.value,'');
  h.click('[data-approve-fact="demo-data"]');h.submit('#portfolio-links');h.click('#portfolio-close');
  h.click('#add-job');assert.equal(h.$('#job-dialog').open,true);
  for(const [k,v] of Object.entries({title:'Remote Data Engineering Internship',company:'Local fixture',requiredStack:'Python, SQL',requiredExperience:'0–1 year',englishLevel:'B2',recruiter:'Test contact',coverLetter:'Test cover letter',cvVersion:'DE-v2',notes:'Keep note',nextAction:'Send CV'}))h.fill(k,v);
  assert.match(h.$('#automatic-analysis').textContent,/100\/100/);
  // Exercise fallback ID creation too; HTTP previews may not have randomUUID.
  Object.defineProperty(h.w.crypto,'randomUUID',{value:undefined,configurable:true});
  h.submit();assert.equal(h.$('#job-dialog').open,false,h.$('#form-error').textContent);
  await waitFor(()=>stored()?.jobs.length===1,'created card did not sync');
  let j=stored().jobs[0];assert.equal(j.coverLetter,'Test cover letter');assert.equal(j.recruiter,'Test contact');assert.equal(j.availability,'open');
  const id=j.id;
  assert.equal(h.$('#nav-today').textContent,'1');
  h.click('[data-view="today"]');assert.ok(h.$(`[data-job="${id}"]`));
  h.click('[data-view="jobs"]');h.click('[data-quick="intern"]');h.click('[data-quick="remote"]');h.click('[data-quick="sql"]');assert.ok(h.$(`[data-job="${id}"]`));
  h.click('[data-quick="junior"]');assert.equal(h.$(`[data-job="${id}"]`),null);h.click('#reset-filters');assert.ok(h.$(`[data-job="${id}"]`));
  h.dom.window.close();h=await mount();
  h.click(`[data-edit="${id}"]`);assert.equal(h.$('#job-form').elements.coverLetter.value,'Test cover letter');assert.equal(h.$('#job-form').elements.cvVersion.value,'DE-v2');
  h.fill('nextAction','Follow up in a week');h.click('#prepare-resume');
  await waitFor(()=>h.$('#resume-base-dialog').open,'baseline did not open');
  assert.equal(h.$('#resume-base-form').elements.fullName.value,'Demo Candidate');
  h.submit('#resume-base-form');assert.equal(h.$('#resume-draft-dialog').open,true);
  assert.match(h.$('#resume-cv-text').value,/Demo Candidate/);
  assert.match(h.$('#resume-cv-text').value,/Example Data Project/);assert.doesNotMatch(h.$('#resume-cv-text').value,/Example ML Project/);
  const projectChecks=[...h.w.document.querySelectorAll('#resume-project-choices input')];
  for(const input of projectChecks)input.checked=input.parentElement.textContent.includes('Example Data Project');
  h.click('#resume-project-apply');h.click('#confirm-action');
  assert.match(h.$('#resume-cv-text').value,/Example Data Project/);assert.doesNotMatch(h.$('#resume-cv-text').value,/Bachelor.s thesis/);
  assert.match(h.$('#resume-questions').textContent,/JOIN/);
  h.click('#resume-check');assert.match(h.$('#resume-checks').textContent,/SQL/);
  h.click('#resume-email-open');assert.match(h.$('#resume-email-result').textContent,/Сначала проверь/);
  assert.doesNotMatch(h.$('#resume-cv-text').value,/Docker/);
  h.click('#resume-download-cv');assert.match(h.$('#resume-result').textContent,/Сначала проверь/);
  h.$('#resume-cover-text').value='My reviewed letter';h.$('#resume-cover-text').dispatchEvent(new h.w.Event('input',{bubbles:true}));
  h.click('#resume-save-draft');
  await waitFor(()=>stored()?.jobs[0].applicationDraft?.coverText==='My reviewed letter','draft not synced');
  assert.equal(stored().jobs[0].appliedAt,'');assert.notEqual(stored().jobs[0].status,'applied');
  h.dom.window.close();h=await mount();h.click(`[data-edit="${id}"]`);h.click('#prepare-resume');
  assert.equal(h.$('#resume-cover-text').value,'My reviewed letter');
  h.click('#resume-reviewed');
  let composed='';h.w.HTMLAnchorElement.prototype.click=function(){composed=this.href};
  h.$('#resume-recipient').value='recruiter@example.test';h.click('#resume-email-open');
  assert.match(composed,/^mailto:recruiter%40example.test\?subject=/);assert.match(decodeURIComponent(composed),/My reviewed letter/);
  assert.notEqual(stored().jobs[0].status,'applied');
  h.click('#resume-mark-applied');assert.equal(h.$('#confirm-dialog').open,true);h.click('#confirm-action');
  await waitFor(()=>stored()?.jobs[0].status==='applied','application did not sync');
  j=stored().jobs[0];assert.match(j.appliedAt,/^\d{4}-\d{2}-\d{2}$/);assert.equal(j.history.at(-1).status,'applied');assert.equal(j.applicationAssessment.score,100);
  assert.equal(j.sentApplication.coverText,'My reviewed letter');assert.equal(j.cvVersion,j.sentApplication.version);
  assert.equal(h.$('#resume-mark-applied').disabled,true);
  h.click('#resume-regenerate');h.click('#confirm-action');h.click('#resume-save-draft');
  await waitFor(()=>stored()?.jobs[0].applicationDraft?.revision>j.applicationDraft.revision,'regenerated draft not saved');
  assert.equal(stored().jobs[0].sentApplication.coverText,'My reviewed letter');
  h.click('#resume-draft-dialog [data-resume-close]');
  h.click('[data-view="today"]');assert.equal(h.$(`[data-job="${id}"]`),null);h.click('[data-view="applications"]');assert.ok(h.$(`[data-job="${id}"]`));
  h.click('#profile-open');h.fill('skills','Python, SQL, PostgreSQL','#profile-form');h.fill('refreshSkills','SQL','#profile-form');h.submit('#profile-form');
  await waitFor(()=>stored()?.profile.skills==='Python, SQL, PostgreSQL','profile did not sync');
  assert.deepEqual(h.errors,[]);
  h.dom.window.close();h=await mount();
  h.click('[data-view="applications"]');h.click(`[data-edit="${id}"]`);assert.equal(h.$('#job-form').elements.nextAction.value,'Follow up in a week');assert.equal(h.$('#job-form').elements.notes.value,'Keep note');
  h.click('[data-close="job-dialog"]');h.click('#profile-open');assert.equal(h.$('#profile-form').elements.skills.value,'Python, SQL, PostgreSQL');assert.deepEqual(h.errors,[]);
 }finally{h.dom.window.close()}
});
