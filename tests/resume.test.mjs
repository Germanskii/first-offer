import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptResume,fingerprint} from '../dist/client/resume.js';
import {createResumePDF} from '../scripts/pdf-entry.js';
import {PDFDocument} from 'pdf-lib';
import worker from '../dist/server/index.js';
const base={fullName:'Test Candidate',education:'Software Engineering graduate',skills:'Python, pandas, radio engineering',projects:'Analysis project using Python',languages:'English: B1 speaking, B2 reading'};
const job={title:'Data Engineering Intern',company:'Fixture',requiredStack:'Python, SQL, Docker'};
test('adaptation keeps verified facts and does not claim missing qualifications',()=>{
 const d=adaptResume(base,job);assert.deepEqual(d.matched,['Python']);assert.ok(d.missing.includes('SQL'));assert.ok(d.missing.includes('Docker'));
 assert.doesNotMatch(d.cvText,/Docker|SQL|C1/);assert.match(d.cvText,/B1 speaking/);assert.doesNotMatch(d.coverText,/Docker|SQL/);
 assert.notEqual(fingerprint(base,job),fingerprint({...base,skills:'Python, SQL'},job));
 assert.notEqual(fingerprint(base,job),fingerprint(base,{...job,requiredStack:'Python'}));
});
test('private baseline requires identity and is not given to invited accounts',async()=>{
 const request=headers=>worker.fetch(new Request('https://tracker.test/api/resume-baseline',{headers}),{TRACKER_OWNER_EMAIL:'owner@test'});
 assert.equal((await request({})).status,401);
 assert.deepEqual(await (await request({'oai-authenticated-user-id':'friend','oai-authenticated-user-email':'friend@test'})).json(),{resume:null});
 const own=await request({'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@test'});assert.match(own.headers.get('cache-control'),/no-store/);assert.equal((await own.json()).resume.fullName,'Demo Candidate');
});
test('local PDF embeds multilingual text and paginates long documents',async()=>{
 const font=readFileSync(new URL('../dist/client/fonts/DejaVuSans.ttf',import.meta.url));
 const bytes=await createResumePDF('Test Candidate\nРусский ქართული\n'+('Python project with verified facts.\n'.repeat(150)),font);
 const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=3);
 await assert.rejects(createResumePDF('Unsupported 🧑',font),/неподдерживаемые/);
});
