import sources from '../content/sources.json' with { type: 'json' };
import { topics } from '../content/scenarios.js';
// Stable, disjoint pools. Moving/rewording a question requires a new pack revision.
const pools=['practice','domain_boss','practice','practice','practice','domain_boss','final_boss','diagnostic'];
export const previousPack = {
 version:'LEARN-SCENARIOS-2026-10-26-1',schema_version:1,app_version:1,sample:false,
 title:'Microsoft Learn 実務シナリオ集',authorship:'original_practice',
 exam_scope:{exam:'AI-103',status:'not_verified',checked_at:'2026-10-26',note:'Microsoft Learnの公式教材を確認した独自問題です。AI-103の最新の評価スキル・配点との照合は未完了です。実際の試験問題の転載ではありません。'},
 questions:topics.flatMap((topic,t)=>topic.questions.map((row,i)=>{
  const [objective,text,options,correctIndexes,sourceIds,takeaway]=row;
  // Distribute correct answers across A-D without duplicating question content.
  const rotation=(t+i)%4;
  const ordered=options.map((_,j)=>({item:options[(j+rotation)%4],original:(j+rotation)%4,id:String.fromCharCode(65+j)}));
  const pool=pools[i];
  return {id:`LEARN-${String(t+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,revision:1,change_type:'initial',pool,domain:topic.domain,objective,text,
   type:correctIndexes.length>1?'multiple':'single',difficulty:pool.includes('boss')?'advanced':'intermediate',
   choices:ordered.map(o=>({id:o.id,text:o.item[0]})),correct:ordered.filter(o=>correctIndexes.includes(o.original)).map(o=>o.id),
   choice_explanations:Object.fromEntries(ordered.map(o=>[o.id,o.item[1]])),
   explanation:correctIndexes.map(n=>options[n][1]).join('\n'),takeaway,
   hint:`判断の軸：${takeaway}`,sources:sourceIds.map(id=>sources[id])};
 }))
};
