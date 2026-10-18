import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateFeed} from '../dist/client/feed.js';
const data=validateFeed(JSON.parse(fs.readFileSync(new URL('../dist/client/feed.json',import.meta.url),'utf8')));
assert.ok(Date.parse(data.checkedAt)<=Date.now()+300000,'Future check timestamp');
const roles=['Backend / Software','Data Engineering','Data Analytics','QA / Testing','Frontend','DevOps','IT Support','Другое'];
for(const j of data.jobs){assert.ok(roles.includes(j.role));assert.ok(['Удалённо','Гибрид','Офис','Уточнить'].includes(j.format));assert.ok(['high','medium','low'].includes(j.priority));assert.ok(j.sourceSummary&&j.country&&j.sourceType);}
console.log(`Feed valid: ${data.jobs.length} entries; checked ${data.checkedAt}`);
