import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet,ensureWorksheet,updateWorksheetField,updateWorksheetResult,applyBuiltWorksheet,resultNeedsRefresh,buildWorksheet,allocateMinutes,AUDIENCES} from '../src/workspace-tools.js';

function build(tool,changes) {
  const result=buildWorksheet(tool,{...createWorksheet(tool).fields,...changes});
  assert.deepEqual(result.errors,{});
  return result.result;
}

test('opening another task or tool preserves the current worksheet and edited result',()=>{
  let state=ensureWorksheet({},'decision',{title:'Original',nextAction:'First step',lastAssistantMessage:'PRIVATE_SOURCE'});
  state.decision=updateWorksheetField(state.decision,'question','My chosen wording');
  state.decision=updateWorksheetResult(state.decision,'My hand-edited result');
  state=ensureWorksheet(state,'communication',{title:'Second task'});
  state=ensureWorksheet(state,'decision',{title:'Replacement',nextAction:'Different step'});
  assert.equal(state.decision.fields.question,'My chosen wording');
  assert.equal(state.decision.result,'My hand-edited result');
  assert.equal(state.communication.fields.purpose,'Second task');
  assert.ok(!JSON.stringify(state).includes('PRIVATE_SOURCE'));
});

test('changed fields flag an old result while keeping hand edits until an explicit rebuild',()=>{
  let sheet=createWorksheet('decision');
  sheet=applyBuiltWorksheet(sheet,'Initial result');
  sheet=updateWorksheetResult(sheet,'Hand-edited result');
  sheet=updateWorksheetField(sheet,'question','A different decision');
  assert.equal(resultNeedsRefresh(sheet),true);
  assert.equal(sheet.result,'Hand-edited result');
  assert.equal(sheet.resultEdited,true);
  sheet=applyBuiltWorksheet(sheet,'Explicit replacement');
  assert.equal(resultNeedsRefresh(sheet),false);
  assert.equal(sheet.resultEdited,false);
});

test('decision support preserves user order and never picks or ranks an option',()=>{
  const fields={question:'Which revision first?',options:'Revise the opening\nWait for feedback\nLeave it alone',matters:'Preserve my voice',missing:'Reviewer priorities',review:'After the meeting'};
  for(const reversibility of ['easy','hard','unknown']){
    const result=build('decision',{...fields,reversibility});
    for(const expected of [fields.question,fields.matters,fields.missing,fields.review,'1. Revise the opening','2. Wait for feedback','3. Leave it alone','No next step chosen'])assert.ok(result.includes(expected));
    assert.ok(!/best option|recommended option|priority score/i.test(result));
  }
  assert.match(build('decision',{...fields,reversibility:'hard',nextStep:'Ask the course lead'}),/Proposed next step, pending review: Ask the course lead/);
  assert.match(build('decision',{...fields,reversibility:'unknown'}),/Clarify what is missing/);
});

test('communication includes entered facts and distinguishes relationship-specific structures',()=>{
  const common={recipient:'Alex',purpose:'Discuss the next session.',facts:'Two rooms are available.',view:'The smaller room supports discussion.',request:'Compare them on Friday.',outcome:'We can keep the session focused.',uncertainty:'Final attendance'};
  const results={};
  for(const audience of Object.keys(AUDIENCES)){
    results[audience]=build('communication',{...common,audience});
    for(const value of Object.values(common))assert.ok(results[audience].includes(value),`${audience}: ${value}`);
  }
  assert.match(results.leadership,/My assessment:/);
  assert.match(results.peer,/My concern:/);
  assert.match(results.student,/in your own words/);
  assert.ok(!results.friend.includes('My assessment:'));
  assert.ok(!results.networking.includes('in your own words'));
  assert.ok(!/deadline|urgent/i.test(results.acquaintance));
  assert.equal(new Set(Object.values(results)).size,Object.keys(AUDIENCES).length);
});

test('social writing permits connection without manufacturing a request',()=>{
  const result=build('communication',{audience:'friend',purpose:'Your story stayed with me.',facts:'I saw the photographs this morning.'});
  assert.ok(result.includes('Your story stayed with me.'));
  assert.ok(!result.includes('Requested decision'));
  assert.ok(!result.includes('Could we agree'));
  assert.notEqual(result,build('communication',{audience:'friend',purpose:'Your story stayed with me.',facts:'I saw the photographs this morning.',tone:'warm'}));
});

test('presentation uses objective, message, supporting material and audience activity; minutes sum exactly',()=>{
  for(const minutes of [5,10,11,35,60,240]){
    const result=build('presentation',{title:'Faculty mentoring',audience:'faculty',objective:'Compare two mentoring approaches',message:'Feedback needs a clear next action',evidence:'Our agreed example',practice:'Rewrite one comment together',minutes:String(minutes)});
    for(const text of ['Faculty mentoring','Compare two mentoring approaches','Feedback needs a clear next action','Our agreed example','Rewrite one comment together'])assert.ok(result.includes(text));
    const allocated=[...result.matchAll(/^(\d+) min ·/gm)].reduce((sum,match)=>sum+Number(match[1]),0);
    assert.equal(allocated,minutes);
  }
  assert.deepEqual(allocateMinutes(5,[2,5,3]),[1,3,1]);
  const leader=build('presentation',{audience:'leadership',objective:'Choose a trial',message:'Start with one cohort',minutes:'35'});
  assert.match(leader,/Discuss the choice/);
  assert.ok(!leader.includes('Practice\n'));
});

test('item review reproduces the proposed item and flags wording without certifying clinical quality',()=>{
  const result=build('question',{objective:'Identify missing information',stem:'A handoff omits the timing of a reported observation.',leadIn:'Which question is NOT useful?',options:'When was it observed?\nWhen was it observed?\nNone of the above',key:'C',rationale:'This proposed rationale needs review.'});
  for(const text of ['Identify missing information','A handoff omits','Which question is NOT useful?','Proposed key: C','This proposed rationale needs review.','negative wording','repeat the same wording','all/none of the above','response data'])assert.ok(result.includes(text));
  assert.ok(!/item passes|clinically correct|difficulty:/.test(result));
});

test('invalid item keys and incomplete worksheets cannot produce a misleading result',()=>{
  const q={...createWorksheet('question').fields,objective:'Objective',stem:'Stem',leadIn:'Question?',options:'First\nSecond',key:'C',rationale:'Reason'};
  assert.ok(buildWorksheet('question',q).errors.key);
  assert.equal(buildWorksheet('question',q).result,'');
  assert.ok(buildWorksheet('presentation',{...createWorksheet('presentation').fields,objective:'Aim',message:'Point',minutes:'0'}).errors.minutes);
  assert.ok(buildWorksheet('decision',createWorksheet('decision').fields).errors.options);
});

test('PDSA and DMAIC use actual process inputs and distinguish hypotheses from established results',()=>{
  const f={problem:'Feedback is scattered',change:'Draft in one place',measure:'Minutes and corrections per batch',baseline:'Forty minutes last week',scope:'One faculty pair',prediction:'Less duplicate work',cause:'Unclear handoff',review:'Friday with the pair'};
  for(const mode of ['pdsa','dmaic']){
    const result=build('improvement',{...f,mode});
    for(const text of Object.values(f))assert.ok(result.includes(text),`${mode}: ${text}`);
    assert.ok(!/test completed|improvement achieved/i.test(result));
  }
  assert.match(build('improvement',{...f,mode:'dmaic'}),/Hypothesis, not established cause/);
  assert.match(build('improvement',{...f,mode:'pdsa'}),/Results and improvement have not been established/);
});
