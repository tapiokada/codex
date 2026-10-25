import sources from './content/sources.json' with { type: 'json' };
import officialScope from './content/official-scope.json' with { type: 'json' };
import { topics } from './content/scenarios.js';
import { expansion } from './content/expansion.js';
const pools=['practice','domain_boss','practice','practice','practice','domain_boss','final_boss','diagnostic'];
const legacyObjectives=[
 ['plan-02','plan-12','plan-07','plan-01','plan-02','plan-06','plan-02','plan-12'],
 ['gen-02','gen-13','gen-13','gen-13','gen-02','gen-05','gen-13','gen-13'],
 ['extract-02','extract-05','extract-05','extract-01','extract-01','extract-02','extract-05','extract-02'],
 ['gen-09','gen-09','gen-09','gen-08','gen-11','gen-07','gen-11','gen-08'],
 ['plan-13','plan-14','plan-13','plan-16','plan-14','plan-10','plan-16','plan-14'],
 ['plan-10','plan-14','plan-15','plan-09','plan-01','plan-14','plan-08','plan-09']
];
function build(row,{id,pool,index,revision=1,change_type='initial',objectives,topic}){
 const [objective,text,options,correctIndexes,sourceIds,takeaway]=row;
 const domainId=objectives[0].split('-')[0];
 const ordered=options.map((_,j)=>({item:options[(j+index)%4],original:(j+index)%4,id:String.fromCharCode(65+j)}));
 return {id,revision,change_type,pool,domain:officialScope.domains.find(d=>d.id===domainId).label,official_domain:domainId,exam_objectives:objectives,topic,objective,text,
  type:correctIndexes.length>1?'multiple':'single',difficulty:pool.includes('boss')||index%3===0?'advanced':'intermediate',
  choices:ordered.map(o=>({id:o.id,text:o.item[0]})),correct:ordered.filter(o=>correctIndexes.includes(o.original)).map(o=>o.id),
  choice_explanations:Object.fromEntries(ordered.map(o=>[o.id,o.item[1]])),explanation:correctIndexes.map(n=>options[n][1]).join('\n'),takeaway,
  hint:`判断の軸：${takeaway}`,sources:sourceIds.map(key=>{if(!sources[key])throw Error(`Unknown source: ${key}`);return sources[key];})};
}
const questions=topics.flatMap((topic,t)=>topic.questions.map((row,i)=>build(row,{id:`LEARN-${String(t+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,pool:pools[i],index:t+i,revision:2,change_type:'typographic',objectives:[legacyObjectives[t][i]],topic:topic.domain})));
const counters={};
for(const row of expansion){
 const objectiveId=row[0],domain=objectiveId.split('-')[0];const no=counters[domain]=(counters[domain]??0)+1;
 questions.push(build([officialScope.domains.flatMap(d=>d.objectives).find(o=>o.id===objectiveId).text,...row.slice(1)],{id:`P150-${domain}-${String(no).padStart(3,'0')}`,pool:'practice',index:questions.length,objectives:[objectiveId],topic:domain}));
}
// Each practice question belongs to exactly one 50-question set.
// Per-set weights fit the official ranges; these are authored study sets, not actual exam forms.
const quotas={plan:[14,14,14],gen:[16,16,16],vision:[7,7,6],text:[7,6,7],extract:[6,7,7]};
for(const [domain,counts]of Object.entries(quotas)){
 const qs=questions.filter(q=>q.pool==='practice'&&q.official_domain===domain);
 if(qs.length!==counts.reduce((a,b)=>a+b,0))throw Error(`Invalid practice count: ${domain}`);
 let offset=0;for(let i=0;i<3;i++){for(const q of qs.slice(offset,offset+counts[i]))q.practice_set=String(i+1);offset+=counts[i];}
}
export const studyPack={version:'LEARN-PRACTICE-150-2026-10-26-1',schema_version:1,app_version:1,sample:false,title:'AI-103 公式範囲対応・通常戦150問',authorship:'original_practice',exam_scope:officialScope,questions};
