import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dispositionOf,isOngoing,displayFields,classificationChanges,previousFields,makeBatch,matchesSearch,projectOverview,metadataSnapshot} from '../src/dashboard-model.js';

test('unconfirmed imports and references never inflate ongoing project counts',()=>{
  const candidate={id:'inbox',verifiedAt:null,status:'active',project:'Shared project',domain:'Teaching'};
  const confirmed={...candidate,id:'tracked',verifiedAt:'2026-11-23',disposition:'tracked',title:'Chosen title'};
  const reference={...confirmed,id:'reference',disposition:'reference'};
  assert.equal(dispositionOf(candidate),'inbox');
  assert.equal(isOngoing(candidate),false);
  assert.equal(isOngoing(reference),false);
  const groups=projectOverview([candidate,confirmed,reference]);
  assert.equal(groups.length,1);
  assert.deepEqual(groups[0].tasks.map(t=>t.id),['tracked']);
});

test('suggestions help recognition while preserving confirmed wording and exact source search',()=>{
  const task={id:'one',disposition:'inbox',title:'Exact original transcript title',sourceIds:['source'],suggestion:{title:'Short draft name',project:'Suggested project',recap:'A proposed recap'}};
  assert.equal(displayFields(task).title,'Short draft name');
  assert.equal(task.title,'Exact original transcript title');
  assert.ok(matchesSearch(task,'original transcript'));
  assert.ok(matchesSearch(task,'Short draft'));
  const confirmed={...task,disposition:'tracked',title:'My chosen title',project:'My project',recap:'My recap'};
  assert.equal(displayFields(confirmed).title,'My chosen title');
  assert.equal(displayFields(confirmed).project,'My project');
  assert.equal(displayFields(confirmed).recap,'My recap');
  const reconsidered={...confirmed,disposition:'inbox',verifiedAt:'2026-11-23T10:00:00Z'};
  assert.equal(displayFields(reconsidered).title,'My chosen title');
  assert.equal(displayFields(reconsidered).project,'My project');
});

test('reference is distinct from finished and classification fields can be reversed',()=>{
  const original={title:'Original',project:'',recap:'',nextAction:'',disposition:'inbox',status:'active',triage:'untriaged'};
  const changes=classificationChanges({title:'Short name',project:'Teaching',recap:'A recap',nextAction:'Review'},'reference');
  assert.equal(changes.disposition,'reference');
  assert.notEqual(changes.status,'done');
  assert.deepEqual({...original,...changes,...previousFields(original,changes)},original);
  assert.equal(classificationChanges({title:'Done',project:'',recap:'',nextAction:''},'done').status,'done');
});

test('a sorting session has a stable five-item maximum',()=>{
  const tasks=Array.from({length:9},(_,i)=>({id:String(i),disposition:'inbox'}));
  const batch=makeBatch(tasks);
  assert.deepEqual(batch,['0','1','2','3','4']);
  tasks.unshift({id:'new-arrival',disposition:'inbox'});
  assert.deepEqual(batch,['0','1','2','3','4']);
  assert.deepEqual(makeBatch(tasks,'6'),['6']);
  assert.deepEqual(makeBatch(tasks,'missing'),[]);
});

test('offline metadata keeps useful drafts but excludes credentials and source evidence',()=>{
  const snapshot=metadataSnapshot({csrfToken:'SECRET_CSRF',tasks:[{id:'one',disposition:'inbox',suggestion:{title:'Draft',evidence:'PRIVATE_EVIDENCE',lastUserMessage:'PRIVATE_USER',stale:true,method:'assistant-draft'}}],sources:[{id:'source',title:'Source',summary:'Short summary',lastUserMessage:'PRIVATE_USER',lastAssistantMessage:'PRIVATE_ASSISTANT'}],sync:{paused:false}},'test-time');
  const json=JSON.stringify(snapshot);
  for(const secret of ['SECRET_CSRF','PRIVATE_EVIDENCE','PRIVATE_USER','PRIVATE_ASSISTANT'])assert.ok(!json.includes(secret));
  assert.equal(snapshot.tasks[0].suggestion.title,'Draft');
  assert.equal(snapshot.tasks[0].suggestion.stale,true);
});
