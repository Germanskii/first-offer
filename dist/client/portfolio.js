import {cleanResume,requirementsText} from './resume.js';
import {skillsIn,classifyProfession,russiaPolicy} from './strategy.js';
export const factKinds={projects:'Проект',skills:'Навык',experience:'Опыт',education:'Образование'};
export function safeWeb(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}}
export function combinedResume(base,portfolio={}){
 const result=cleanResume(base);
 for(const fact of portfolio.facts||[]){if(fact.approved!==true||!factKinds[fact.kind]||!fact.text?.trim())continue;const text=fact.text.trim();const block=fact.kind==='projects'&&safeWeb(fact.source)?text+'\n'+safeWeb(fact.source):text;if(!result[fact.kind].includes(text))result[fact.kind]+=(result[fact.kind]?(fact.kind==='skills'?', ':'\n\n'):'')+block;}
 for(const link of [portfolio.githubUrl,portfolio.linkedinUrl]){const url=safeWeb(link);if(url&&!result.links.includes(url))result.links+=(result.links?'\n':'')+url;}
 return result;
}
export function projectChoices(base,job){
 const req=requirementsText(job).toLowerCase(),wanted=skillsIn(req),role=classifyProfession(job);
 const roleWords={'Analytics Engineering':/dbt|sql|model|elt|data/gi,BI:/dashboard|power bi|tableau|metrics/gi,'Data Focus Engineering':/data|python|tests|cli|validation/gi,'Data Engineering':/csv|data|pipeline|etl|sql|validation/gi,'Software Engineering':/parser|engine|tests|cli|python/gi,Python:/python|cli|tests/gi,Backend:/api|backend|database|validation|tests/gi,ML:/model|pytorch|classification|learning|benchmark/gi,'Data Analyst':/analysis|metrics|csv|plot|dashboard/gi};
 return String(base.projects||'').split(/\n\s*\n/).filter(Boolean).map(text=>{const matches=skillsIn(text).filter(s=>wanted.includes(s));const topic=(text.match(roleWords[role]||/project/gi)||[]).length;return{text,title:text.split('\n')[0].slice(0,160),matches,score:matches.length*5+Math.min(topic,5),reason:matches.length?'Совпадения: '+matches.join(', '):topic?'Близок к направлению '+role:'Пример учебной работы; прямых совпадений мало'};}).sort((a,b)=>b.score-a.score);
}
export function applicationChecks(base,job,draft){
 const checks=[];const add=(level,text)=>checks.push({level,text});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(base.email||''))add('warn','Укажи корректный email для ответов в базовом CV.');
 if(!base.fullName)add('warn','В базовом CV нет имени.');
 if(!safeWeb(job.url))add('warn','Нет корректной ссылки на вакансию.');
 if(!draft.cvText?.includes(job.title||'')||!draft.cvText?.includes(job.company||''))add('warn','Проверь название позиции и компании в резюме.');
 if(base.email&&!draft.cvText?.includes(base.email))add('warn','В тексте резюме отсутствует контактный email из базы.');
 if(job.remoteEligibility==='blocked')add('warn','В карточке указано: работа из Грузии недоступна. Уточни до отклика.');
 else if(['remote','Удалённо'].includes(job.format)&&job.remoteEligibility!=='allowed')add('warn','Удалённая работа из Грузии не подтверждена. Уточни допустимые страны.');
 const policy=russiaPolicy(job);if(policy.relevant)add('warn',policy.risk);if(policy.excluded)add('warn','Вакансия требует работы или присутствия в РФ и исключена из поиска.');
 const language=[job.englishLevel,job.georgianRequirement,job.russianRequirement].filter(Boolean).join(' · ');
 add(/C1|C2|advanced|fluent|technical/i.test(language)?'warn':'info','Языки вакансии: '+(language||'не указаны')+'. Сопоставь с фактическими уровнями в CV: '+(base.languages||'не заполнены'));
 if((draft.missing||[]).length)add('warn','Не подтверждены в CV: '+draft.missing.join(', ')+'. Не добавляй их как освоенные без проверки.');
 if(job.deadline&&new Date(job.deadline+'T23:59:59+04:00')<new Date())add('warn','Указанный дедлайн уже прошёл. Проверь, принимают ли отклики.');
 if(job.availability==='closed'||job.status==='closed')add('warn','Вакансия отмечена закрытой.');
 if(!draft.reviewed)add('info','Текст ещё не отмечен как проверенный.');
 if(!checks.some(c=>c.level==='warn'))add('ok','Явных проблем по заполненным полям не найдено. Это не проверка требований на сайте работодателя.');
 return checks;
}
export function interviewPrep(job,draft){
 const skills=skillsIn(requirementsText(job));
 const questions=['За 60 секунд расскажи о себе и почему выбрал эту позицию.'];
 const bank={Python:'Как обработать ошибки и проверить Python-функцию тестами?',SQL:'Чем LEFT JOIN отличается от INNER JOIN? Как найти дубликаты и обработать NULL?',PostgreSQL:'Когда индекс ускоряет запрос и как проверить план через EXPLAIN?',ETL:'Как сделать повторный запуск загрузки безопасным и обнаружить плохие данные?',Docker:'Чем образ отличается от контейнера и как передать конфигурацию?',PyTorch:'Как разделить train/validation/test и избежать утечки данных?',Git:'Как создать ветку, разрешить конфликт и объяснить свой pull request?'};
 for(const s of skills)if(bank[s])questions.push(bank[s]);
 questions.push('Выбери проект из CV: какую задачу он решает, что сделал ты, какие ограничения и что улучшишь?');
 questions.push('На английском: Explain one project and one technical challenge you faced.');
 return{questions:questions.slice(0,6),plan:['10 минут: разобрать компанию, требования и вопросы по географии/языкам.','15 минут: повторить '+((draft.missing||[]).slice(0,2).join(' и ')||skills.slice(0,2).join(' и ')||'ключевой проект')+' на одном небольшом примере.','10 минут: проговорить проект и самопрезентацию. Затем вернуться к откликам.']};
}
export function textChanges(before='',after=''){const old=new Set(before.split('\n').filter(Boolean)),next=new Set(after.split('\n').filter(Boolean));return{added:[...next].filter(x=>!old.has(x)),removed:[...old].filter(x=>!next.has(x))}}
