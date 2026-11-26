import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dispositionOf,isOngoing,displayFields,classificationChanges,previousFields,makeBatch,matchesSearch,projectOverview,metadataSnapshot,attentionOrder,currentEntries,sortingDraft} from '../src/dashboard-model.js';

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

test('Home attention respects chosen triage and excludes waiting, later, and unconfirmed work',()=>{
  const base={disposition:'tracked',status:'active',triage:'ready'};
  const tasks=[{...base,id:'ready'},{...base,id:'waiting',status:'waiting',triage:'blocking'},{...base,id:'later',triage:'later'},{...base,id:'import',disposition:'inbox',triage:'blocking'},{...base,id:'review',triage:'review'},{...base,id:'blocking',triage:'blocking'},{...base,id:'next-blocking',triage:'blocking'}];
  assert.deepEqual(attentionOrder(tasks).map(t=>t.id),['blocking','next-blocking','review','ready']);
});

test('Current uses the latest task or source activity without inventing events or mutating statuses',()=>{
  const tasks=[{id:'older',disposition:'tracked',status:'active',updatedAt:'2026-11-20',sourceIds:['s']},{id:'newer',disposition:'tracked',status:'done',updatedAt:'2026-11-25'},{id:'invalid',disposition:'tracked',updatedAt:'invalid'}];
  const before=JSON.stringify(tasks);
  assert.deepEqual(currentEntries(tasks,[{id:'s',updatedAt:1795651200}]).map(e=>e.task.id),['older','newer','invalid']);
  assert.equal(JSON.stringify(tasks),before);
});

test('Current keeps Library opt-in and attention filtering excludes finished work',()=>{
  const tasks=[{id:'work',disposition:'tracked',status:'active',triage:'review'},{id:'done',disposition:'tracked',status:'done',triage:'review'},{id:'inbox',disposition:'inbox',status:'active',triage:'review'}];
  assert.deepEqual(currentEntries(tasks,[]).map(e=>e.task.id),['work','done']);
  assert.equal(currentEntries(tasks,[],{includeLibrary:true}).length,3);
  assert.deepEqual(currentEntries(tasks,[],{includeLibrary:true,attentionOnly:true}).map(e=>e.task.id),['work']);
});


test('reconsidering a confirmed long title preserves the complete chosen wording',()=>{
  const title='A deliberately detailed confirmed title '.repeat(12).trim();
  const task={title,disposition:'inbox',verifiedAt:'2026-11-26',project:'',recap:'',nextAction:''};
  assert.equal(sortingDraft(task).title,title);
  assert.equal(classificationChanges(sortingDraft(task),'reference').title,title);
});
