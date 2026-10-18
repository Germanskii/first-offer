import {test} from 'node:test';
import assert from 'node:assert/strict';
import {combinedResume,projectChoices,applicationChecks,interviewPrep,textChanges} from '../dist/client/portfolio.js';
import worker from '../dist/server/index.js';
test('only approved facts enter CV and role-specific projects are ranked',()=>{
 const base={fullName:'Candidate',projects:'Backend API\nREST API and Docker tests.\n\nData loader\nPython SQL CSV validation and ETL.'};
 const p={facts:[{kind:'skills',text:'Kafka',approved:false},{kind:'skills',text:'SQL',approved:true},{kind:'projects',text:'Unapproved secret project',approved:false}],linkedinUrl:'javascript:alert(1)'};
 const result=combinedResume(base,p);assert.equal(result.skills,'SQL');assert.equal(result.links,'');assert.doesNotMatch(result.projects,/secret/);
 assert.match(projectChoices(result,{title:'Data Engineering Intern',requiredStack:'Python SQL ETL'})[0].title,/Data loader/);
 assert.match(projectChoices(result,{title:'Backend Intern',requiredStack:'REST API Docker'})[0].title,/Backend/);
});
test('checks detect missing contacts, wrong title, blocked remote and language requirements',()=>{
 const job={title:'Data Intern',company:'Example',format:'remote',remoteEligibility:'blocked',englishLevel:'C1',requiredStack:'Python SQL'};
 const draft={cvText:'Other role',missing:['SQL'],reviewed:false};
 const text=applicationChecks({},job,draft).map(x=>x.text).join('\n');assert.match(text,/email/);assert.match(text,/название позиции/);assert.match(text,/недоступна/);assert.match(text,/C1/);
 assert.ok(interviewPrep(job,draft).questions.some(q=>q.includes('JOIN')));assert.equal(interviewPrep(job,draft).plan.length,3);
 assert.deepEqual(textChanges('Old\nSame','New\nSame'),{added:['New'],removed:['Old']});
});
test('portfolio suggestions are private to owner',async()=>{
 const req=(id,email)=>worker.fetch(new Request('https://tracker.test/api/portfolio-baseline',{headers:id?{'oai-authenticated-user-id':id,'oai-authenticated-user-email':email}:{}}),{TRACKER_OWNER_EMAIL:'owner@test'});
 assert.equal((await req()).status,401);assert.deepEqual(await (await req('friend','friend@test')).json(),{portfolio:null});
 const data=await (await req('owner','owner@test')).json();assert.equal(data.portfolio.facts.length,2);assert.ok(data.portfolio.facts.every(f=>!f.approved));assert.equal(data.portfolio.linkedinUrl,'');
});
