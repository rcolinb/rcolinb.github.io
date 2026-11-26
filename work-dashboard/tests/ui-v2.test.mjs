import {test, afterEach, after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

// DOM-only component tests. No browser process, external account, or live data.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url:'http://dashboard.test/', pretendToBeVisual:true,
});
for (const name of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLButtonElement','HTMLIFrameElement','Element','Node','NodeFilter','DocumentFragment','SVGElement','MutationObserver','Event','MouseEvent','PointerEvent','KeyboardEvent','FocusEvent','CustomEvent','DOMException','localStorage']) {
  Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true,writable:true});
}
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.CSS={escape:value=>String(value).replace(/[^a-zA-Z0-9_-]/g,char=>`\\${char}`)};
dom.window.CSS=globalThis.CSS;
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
dom.window.ResizeObserver=globalThis.ResizeObserver;
dom.window.matchMedia=query=>({media:query,matches:query.includes('min-width:761px'),addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
dom.window.HTMLElement.prototype.hasPointerCapture=function(){return false;};
dom.window.HTMLElement.prototype.setPointerCapture=function(){};
dom.window.HTMLElement.prototype.releasePointerCapture=function(){};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react');
const {render,screen,within,waitFor,cleanup,act}=await import('@testing-library/react');
const {default:userEvent}=await import('@testing-library/user-event');
const {default:App}=await import('../.preview/test-app/App.js');
const stamp='2026-11-23T10:00:00.000Z';
const clone=value=>JSON.parse(JSON.stringify(value));
let state, writes, offline;

function task(id,updates={}) {
  return {id,title:`Original conversation ${id}`,project:'',domain:'Teaching',status:'active',triage:'untriaged',nextAction:'',owner:'none',priorityReason:'',recap:'',disposition:'inbox',sourceIds:[`source-${id}`],createdAt:stamp,updatedAt:stamp,verifiedAt:null,hasNewActivity:true,revision:1,
    suggestion:{title:`Suggested ${id}`,project:'Course preparation',recap:'A draft example is available.',nextAction:'Review the draft example.',evidence:'EVIDENCE_NOT_FOR_OFFLINE_CACHE',sourceId:`source-${id}`,sourceUpdatedAt:stamp,generatedAt:stamp,method:'assistant-draft',stale:false},...updates};
}
function resetFixture() {
  const tasks=[...['a','b','c','d','e','f'].map(id=>task(id)),
    task('work',{title:'Prepare class',project:'Course preparation',disposition:'tracked',triage:'review',nextAction:'Review the class slides.',verifiedAt:stamp,owner:'you'}),
    task('reference',{title:'Book reference notes',disposition:'reference',verifiedAt:stamp}),
    task('done',{title:'Completed worksheet',disposition:'tracked',status:'done',verifiedAt:stamp}),
    task('idea',{title:'A future teaching idea',disposition:'tracked',status:'idea',verifiedAt:stamp})];
  state={tasks,sources:tasks.map(t=>({id:t.sourceIds[0],title:t.title,summary:'Short source summary.',updatedAt:stamp,source:'codex',sourceUrl:`codex://threads/${t.sourceIds[0]}`,runtimeStatus:'unknown',lastUserMessage:'FULL_USER_MESSAGE_PRIVATE',lastAssistantMessage:'FULL_ASSISTANT_MESSAGE_PRIVATE'})),csrfToken:'LIVE_CSRF_TOKEN_PRIVATE',sync:{lastSuccess:stamp,paused:false,error:null,inProgress:false,coverage:'Fixture local conversations.'}};
  writes=[];offline=false;localStorage.clear();
  globalThis.fetch=async(path,options={})=>{
    if(offline)throw new TypeError('Fixture Mac disconnected');
    const method=options.method||'GET';
    const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
    if(path==='/api/state')return respond(clone(state));
    if(path.startsWith('/api/sources/'))return respond(clone(state.sources.find(s=>s.id===path.split('/').at(-1))));
    if(path.startsWith('/api/tasks/')&&method==='PATCH'){
      const id=decodeURIComponent(path.split('/').at(-1));
      const item=state.tasks.find(t=>t.id===id), body=JSON.parse(options.body);
      if(body.revision!==item.revision)return respond({error:'This item changed.',code:'revision_conflict',task:clone(item)},409);
      assert.equal(options.headers['X-Dashboard-Token'],state.csrfToken);
      assert.ok(!('suggestion' in body),'Read-only suggestions must not be sent as editable fields');
      writes.push({id,body:clone(body)});
      Object.assign(item,body,{revision:item.revision+1,updatedAt:stamp});
      if(Object.keys(body).some(key=>!['revision','hasNewActivity'].includes(key)))item.verifiedAt=stamp;
      return respond(clone(item));
    }
    throw new Error(`Unexpected fixture request ${method} ${path}`);
  };
}
async function openWorkspace(){resetFixture();const user=userEvent.setup({document,delay:null});render(React.createElement(App));await screen.findByRole('button',{name:'Add item',exact:true});await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Add item',exact:true}).disabled,false));return user;}
afterEach(()=>cleanup());
after(()=>dom.window.close());

test('Home shows confirmed work while keeping imported conversations out of the queue',async()=>{
  await openWorkspace();
  assert.ok(screen.getByText('Prepare class'));
  assert.equal(screen.queryByText('Suggested a'),null);
  assert.equal(screen.queryByText('Book reference notes'),null);
  assert.ok(screen.getByRole('button',{name:'Sort a few',exact:true}));
});

async function startSorting(user){await user.click(screen.getByRole('button',{name:'Sort a few',exact:true}));return screen.findByRole('dialog');}
async function rename(user,value){const input=screen.getByRole('textbox',{name:'Short name'});await user.clear(input);await user.type(input,value);}

test('sorting saves chosen wording and distinguishes reference from finished, with Undo',async()=>{
  const user=await openWorkspace();
  await startSorting(user);
  assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,'Suggested a');
  await rename(user,'My chosen course task');
  await user.click(screen.getByRole('button',{name:/^Track this/}));
  await waitFor(()=>assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,'Suggested b'));
  assert.equal(state.tasks[0].title,'My chosen course task');
  assert.equal(state.tasks[0].disposition,'tracked');
  assert.equal(state.tasks[0].triage,'ready');
  await user.click(screen.getByRole('button',{name:/^Keep as reference/}));
  await waitFor(()=>assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,'Suggested c'));
  assert.equal(state.tasks[1].disposition,'reference');
  assert.equal(state.tasks[1].status,'active');
  await user.click(screen.getByRole('button',{name:'Undo last choice'}));
  await waitFor(()=>assert.equal(state.tasks[1].disposition,'inbox'));
  assert.equal(state.tasks[1].title,'Original conversation b');
  assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,'Suggested b');
  assert.ok(screen.getByText('Draft restored after Undo'));
  assert.equal(writes.length,3);
  assert.equal(writes[2].body.revision,2);
});

test('a five-item sorting session stops and Skip leaves every record unchanged',async()=>{
  const user=await openWorkspace();
  await startSorting(user);
  for(const id of ['a','b','c','d','e']){
    assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,`Suggested ${id}`);
    await user.click(screen.getByRole('button',{name:'Skip for now'}));
  }
  assert.ok(await screen.findByRole('button',{name:'Back to my work'}));
  assert.equal(screen.queryByRole('textbox',{name:'Short name'}),null);
  assert.equal(writes.length,0);
  assert.equal(state.tasks.filter(t=>t.disposition==='inbox').length,6);
});

test('a conflicting edit keeps the draft and requires an explicit decision before retrying',async()=>{
  const user=await openWorkspace();
  await startSorting(user);
  await rename(user,'My unsaved wording');
  Object.assign(state.tasks[0],{title:'Saved on another device',revision:2,verifiedAt:stamp});
  await user.click(screen.getByRole('button',{name:/^Track this/}));
  assert.ok(await screen.findByText(/This item changed elsewhere/));
  assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,'My unsaved wording');
  assert.equal(writes.length,0);
  await user.click(screen.getByText('Compare the latest saved fields'));
  assert.ok(screen.getByText('Saved on another device'));
  await user.click(screen.getByRole('button',{name:'Load latest fields instead'}));
  assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,'Saved on another device');
  await user.click(screen.getByRole('button',{name:/^Track this/}));
  await waitFor(()=>assert.equal(writes.length,1));
  assert.equal(writes[0].body.revision,2);
  assert.equal(state.tasks[0].title,'Saved on another device');
});

test('a disconnected saved view disables mutations and omits private source excerpts and tokens',async()=>{
  await openWorkspace();
  const saved=Object.values(localStorage).join(' ');
  for(const value of ['LIVE_CSRF_TOKEN_PRIVATE','FULL_USER_MESSAGE_PRIVATE','FULL_ASSISTANT_MESSAGE_PRIVATE','EVIDENCE_NOT_FOR_OFFLINE_CACHE'])assert.ok(!saved.includes(value));
  cleanup();offline=true;
  render(React.createElement(App));
  await screen.findAllByText('Mac disconnected');
  assert.ok(screen.getByText('Prepare class'));
  assert.equal(screen.getByRole('button',{name:'Add item',exact:true}).disabled,true);
  assert.equal(screen.getByRole('button',{name:'Sort a few',exact:true}).disabled,true);
  assert.equal(writes.length,0);
});

test('global search finds reference material from Home without treating it as ongoing work',async()=>{
  const user=await openWorkspace();
  const input=screen.getByRole('searchbox');
  await user.type(input,'Book reference');
  assert.ok(await screen.findByText('Book reference notes'));
  assert.equal(screen.queryByText('Prepare class'),null);
  assert.equal(writes.length,0);
});

test('reviewing a conversation update does not complete or reclassify the task',async()=>{
  const user=await openWorkspace();
  await user.click(screen.getByRole('button',{name:'Open item: Prepare class'}));
  await user.click(await screen.findByRole('button',{name:'Mark update reviewed'}));
  await waitFor(()=>assert.equal(writes.length,1));
  assert.deepEqual(writes[0].body,{hasNewActivity:false,revision:1});
  const item=state.tasks.find(t=>t.id==='work');
  assert.equal(item.status,'active');
  assert.equal(item.disposition,'tracked');
  assert.equal(item.triage,'review');
});

test('Escape preserves unsaved sorting edits until the person chooses to leave',async()=>{
  const user=await openWorkspace();
  await startSorting(user);
  await rename(user,'Unfinished edit');
  await user.keyboard('{Escape}');
  assert.ok(await screen.findByText('Leave without saving these field edits?'));
  await user.click(screen.getByRole('button',{name:'Keep editing'}));
  assert.equal(screen.getByRole('textbox',{name:'Short name'}).value,'Unfinished edit');
  assert.equal(writes.length,0);
});

const snapshotKey='work-dashboard.snapshot.v1';
const accessRedirect=()=>{
  const result=new Response(null,{status:200});
  Object.defineProperty(result,'type',{value:'opaqueredirect'});
  return result;
};
async function reopenSaved(responseFactory){
  cleanup();
  const saved=JSON.parse(localStorage.getItem(snapshotKey));
  saved.savedAt='2026-11-25T12:34:00.000Z';
  localStorage.setItem(snapshotKey,JSON.stringify(saved));
  const before=localStorage.getItem(snapshotKey);
  globalThis.fetch=async path=>{
    assert.equal(path,'/api/state','a read-only reopening must not request source messages or submit changes');
    return responseFactory();
  };
  render(React.createElement(App));
  return before;
}

test('a tunnel 502 reopens saved work with its exact saved time and disables every mutation',async()=>{
  await openWorkspace();
  const before=await reopenSaved(()=>new Response('<html>Cloudflare tunnel unavailable</html>',{status:502,headers:{'Content-Type':'text/html'}}));
  assert.ok(await screen.findByText('Your Mac is unavailable.'));
  assert.ok(screen.getByText('Prepare class'));
  assert.equal(document.querySelector('time').dateTime,'2026-11-25T12:34:00.000Z');
  assert.equal(screen.getByRole('button',{name:'Add item',exact:true}).disabled,true);
  assert.equal(screen.getByRole('button',{name:'Sort a few',exact:true}).disabled,true);
  assert.equal(localStorage.getItem(snapshotKey),before,'failed refresh does not erase the view or change its saved time');
  assert.equal(writes.length,0);
});

test('an Access redirect retains saved work and offers sign-in instead of claiming the Mac is off',async()=>{
  await openWorkspace();const before=await reopenSaved(accessRedirect);
  assert.ok(await screen.findByText('Sign in to refresh your workspace.'));
  assert.equal(screen.queryByText('Your Mac is unavailable.'),null);
  const signIn=screen.getByRole('link',{name:/Sign in again/});
  assert.equal(signIn.getAttribute('target'),'_blank');
  assert.equal(signIn.getAttribute('href'),'/?sign-in=1');
  assert.equal(screen.getByRole('button',{name:'Add item',exact:true}).disabled,true);
  assert.equal(localStorage.getItem(snapshotKey),before);
});

test('a 200 Access login page is authentication failure and cannot replace the saved metadata',async()=>{
  await openWorkspace();const before=await reopenSaved(()=>new Response('<html><title>Cloudflare Access</title>Sign in</html>',{headers:{'Content-Type':'text/html'}}));
  await screen.findByText('Sign in to refresh your workspace.');
  assert.ok(screen.getByText('Prepare class'));
  assert.equal(localStorage.getItem(snapshotKey),before);
});

test('a failed access-verification service keeps a read-only view without a false Mac-off or sign-in claim',async()=>{
  await openWorkspace();const before=await reopenSaved(()=>new Response(JSON.stringify({error:'Identity verification is temporarily unavailable.',code:'access_unavailable'}),{status:503,headers:{'Content-Type':'application/json'}}));
  assert.ok(await screen.findByText('Access verification is temporarily unavailable.'));
  assert.equal(screen.queryByText('Your Mac is unavailable.'),null);
  assert.equal(screen.queryByRole('link',{name:/Sign in again/}),null);
  assert.equal(screen.getByRole('button',{name:'Add item',exact:true}).disabled,true);
  assert.equal(localStorage.getItem(snapshotKey),before);
});

test('unexpected HTML or incomplete JSON cannot silently turn a saved workspace into an empty one',async()=>{
  for(const create of [()=>new Response('<html>Unexpected proxy page</html>',{headers:{'Content-Type':'text/html'}}),()=>new Response('{}',{headers:{'Content-Type':'application/json'}})]){
    await openWorkspace();const before=await reopenSaved(create);
    await screen.findByText('Your Mac is unavailable.');
    assert.ok(screen.getByText('Prepare class'));
    assert.equal(localStorage.getItem(snapshotKey),before);
    cleanup();
  }
});

test('sign-in expiry preserves an edited sorting draft and returning from sign-in refreshes access',async()=>{
  const user=await openWorkspace();await startSorting(user);await rename(user,'Keep this unsaved wording');
  const connectedFetch=globalThis.fetch;
  globalThis.fetch=async(path,options)=>options?.method==='PATCH'?accessRedirect():connectedFetch(path,options);
  await user.click(screen.getByRole('button',{name:/^Track this/}));
  const dialog=screen.getByRole('dialog');
  assert.ok(await within(dialog).findByRole('link',{name:/Sign in again/}));
  assert.equal(within(dialog).getByRole('textbox',{name:'Short name'}).value,'Keep this unsaved wording');
  assert.equal(within(dialog).getByRole('button',{name:/^Track this/}).disabled,true);
  assert.equal(writes.length,0);
  globalThis.fetch=connectedFetch;
  await act(async()=>window.dispatchEvent(new Event('focus')));
  await waitFor(()=>assert.equal(within(dialog).getByRole('button',{name:/^Track this/}).disabled,false));
  assert.equal(within(dialog).getByRole('textbox',{name:'Short name'}).value,'Keep this unsaved wording');
  assert.equal(writes.length,0);
});
