// Deterministic adaptation: reorder supplied facts, never invent qualifications.
import {skillsIn} from './strategy.js';
export const resumeFields={fullName:'Имя и фамилия',email:'Email для ответов',phone:'Телефон',location:'Город / страна',links:'GitHub / LinkedIn / портфолио',education:'Образование',experience:'Опыт работы',projects:'Проекты — отдельные блоки через пустую строку',skills:'Подтверждённые навыки — через запятую',languages:'Реальные уровни языков'};
export function cleanResume(value={}){return Object.fromEntries(Object.keys(resumeFields).map(k=>[k,typeof value[k]==='string'?value[k].trim().slice(0,['experience','projects','education'].includes(k)?12000:4000):'']))}
const terms=s=>new Set(String(s||'').toLowerCase().match(/[\p{L}\p{N}+#.]+/gu)||[]);
const oneLine=s=>String(s||'').replace(/[\r\n\t]+/g,' ').trim();
export const requirementsText=j=>[j.title,j.requiredStack,j.requirements,j.sourceSummary,(j.tags||[]).join(' ')].filter(Boolean).join('\n');
export function fingerprint(base,job){const s=JSON.stringify([cleanResume(base),job.title,job.company,requirementsText(job)]);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
export function adaptResume(input,job){
 const base=cleanResume(input);if(!base.fullName||(!base.education&&!base.experience&&!base.projects))throw Error('Заполни имя и хотя бы образование, опыт или проект в базовом CV.');
 const requirement=requirementsText(job),wanted=terms(requirement),required=skillsIn(requirement);
 const score=text=>{const tokens=terms(text);return [...tokens].filter(t=>t.length>2&&wanted.has(t)).length+skillsIn(text).filter(s=>required.includes(s)).length*4};
 const allSkills=[...new Set(base.skills.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean))];
 const relevant=allSkills.filter(x=>skillsIn(x).some(s=>required.includes(s))||String(requirement).toLowerCase().includes(x.toLowerCase())).sort((a,b)=>score(b)-score(a));
 const rest=allSkills.filter(x=>!relevant.includes(x));
 const projects=base.projects.split(/\n\s*\n/).filter(Boolean).sort((a,b)=>score(b)-score(a));
 const known=skillsIn([base.skills,base.projects,base.experience].join(' '));
 const missing=required.filter(s=>!known.includes(s));
 const target=oneLine(job.title),company=oneLine(job.company);
 const sections=[base.fullName,[base.email,base.phone,base.location].filter(Boolean).join(' | '),base.links,`Application: ${target} | ${company}`];
 if(relevant.length)sections.push('RELEVANT SKILLS',relevant.join(' | '));
 if(projects.length)sections.push('PROJECTS',projects.join('\n\n'));
 if(base.education)sections.push('EDUCATION',base.education);
 if(base.experience)sections.push('EXPERIENCE',base.experience);
 if(rest.length)sections.push(relevant.length?'ADDITIONAL SKILLS':'SKILLS',rest.join(' | '));
 if(base.languages)sections.push('LANGUAGES',base.languages);
 const cvText=sections.filter(Boolean).join('\n\n');
 const letter=[`Dear ${company} hiring team,`,`I am applying for the ${target} position.`,relevant.length?`My skills relevant to the role include ${relevant.slice(0,6).join(', ')}.`:'Please find my CV attached for your consideration.',projects.length?`One of my projects:\n${projects[0]}`:base.education?`My education:\n${base.education}`:'',`I would welcome the opportunity to discuss how my background could contribute to your team. Thank you for your consideration.`,`Kind regards,\n${base.fullName}\n${[base.email,base.phone].filter(Boolean).join(' | ')}`].filter(Boolean).join('\n\n');
 return{cvText,coverText:letter,subject:`Application: ${target} - ${base.fullName}`,matched:relevant,missing,fingerprint:fingerprint(base,job),generatedAt:new Date().toISOString(),version:'',reviewed:false,method:'fact-based-template'};
}
export function safeFilename(text){return String(text||'application').normalize('NFKC').replace(/[^\p{L}\p{N}_.-]+/gu,'_').slice(0,100)||'application'}
