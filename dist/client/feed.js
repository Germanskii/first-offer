// Merge shared opportunities without overwriting personal application data.
export function normalizeUrl(value){try{const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);return u.href.replace(/\/$/,'')}catch{return value}}
export function validateFeed(data){
 if(!data||data.version!==1||typeof data.checkedAt!=='string'||isNaN(Date.parse(data.checkedAt))||!Array.isArray(data.jobs)||data.jobs.length>2000)throw Error('Некорректный формат подборки');
 const ids=new Set(),urls=new Set();
 for(const j of data.jobs){
  if(!j||!j.id||ids.has(j.id)||typeof j.title!=='string'||typeof j.company!=='string'||!j.title.trim()||!j.company.trim()||!['open','closed','unverified','program'].includes(j.availability))throw Error('Некорректная вакансия в подборке');
  const u=new URL(j.url);if(!['https:','http:'].includes(u.protocol)||urls.has(normalizeUrl(j.url)))throw Error('Некорректная или повторяющаяся ссылка');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(j.verifiedAt)||isNaN(Date.parse(j.verifiedAt)))throw Error('Нет даты проверки');
  for(const field of ['notes','events','appliedAt','history','nextDate','cvVersion','cvUrl','applicationSource','responseAt','favorite','planDate','requirements','skillsMatch','skillsGap','hrQuestions','portfolioProjects','profile','coverLetter','recruiter','followUpDate','dismissedToday','applicationAssessment','applicationDraft','sentApplication','resumeProfile','portfolio','resumeProjectSelection','applicationRecipient'])if(j[field]&&(Array.isArray(j[field])?j[field].length:true))throw Error('Подборка содержит личные поля');
  ids.add(j.id);urls.add(normalizeUrl(j.url));
 }
 return data;
}
export function mergeFeed(state,feed){
 const next=structuredClone(state);let added=0;const removed=new Set(next.removedFeedIds||[]);const seen=new Set(next.seenFeedIds||[]);
 for(const item of feed.jobs){
  const existing=next.jobs.find(j=>j.id===item.id||normalizeUrl(j.url)===normalizeUrl(item.url));
  if(existing){if(item.lastSignificantChange)existing.lastSignificantChange=item.lastSignificantChange;existing.verifiedAt=item.verifiedAt;existing.availability=item.availability;existing.sourceSummary=item.sourceSummary;existing.feedId=item.id;existing.match=item.match;existing.deadline=item.deadline||existing.deadline;for(const f of ['positionCategory','positionType','city','source','requiredExperience','englishLevel','georgianRequirement','russianRequirement','requiredStack','remoteEligibility','publicationDate','companyCountry','russiaEmploymentRisk','remoteEvidence','requiresRussiaPresence'])if(!existing[f]&&typeof item[f]==='string')existing[f]=item[f];}
  else if(!removed.has(item.id)&&!seen.has(item.id)&&item.availability!=='closed'){
   next.jobs.unshift({...structuredClone(item),status:'saved',notes:'',nextAction:'',appliedAt:'',nextDate:'',events:[],history:[],feedId:item.id});added++;
  }
  seen.add(item.id);
 }
 next.seenFeedIds=[...seen];next.removedFeedIds=[...removed];next.feedCheckedAt=feed.checkedAt;
 return {state:next,added};
}
