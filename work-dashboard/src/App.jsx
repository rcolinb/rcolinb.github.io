import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Button, TextField, Label, Input, ModalOverlay, Modal, Dialog, Heading} from 'react-aria-components';
import {DISPOSITIONS, dispositionOf, isOngoing, displayFields, sortingDraft, classificationChanges, previousFields, makeBatch, matchesSearch, projectOverview, metadataSnapshot, attentionOrder, shortTitle} from './dashboard-model.js';
import {CurrentStream, Fieldnotes, DailyReflection} from './WorkspaceViews.jsx';
import WorkspaceTools from './WorkspaceTools.jsx';

const SNAPSHOT_KEY = 'work-dashboard.snapshot.v1';
const PREFERENCES_KEY = 'work-dashboard.preferences.v1';
const TRIAGE = {blocking:'Blocking progress', review:'Review next', ready:'Ready to continue', untriaged:'Needs sorting', later:'Later'};
const STATUS = {active:'Active', waiting:'Waiting', idea:'Idea', done:'Finished'};
const OWNER = {you:'You', assistant:'Assistant', other:'Someone else', none:'Not assigned'};
const VIEWS = {home:'Home', stream:'Stream', projects:'Projects', ideas:'Ideas', finished:'Finished', library:'Library'};
const EMPTY = {tasks:[], sources:[], sync:{lastAttempt:null,lastSuccess:null,error:null,inProgress:false,paused:false,coverage:''}, csrfToken:null};

function readStored(key) {try {return JSON.parse(localStorage.getItem(key));} catch {return null;}}
function writeStored(key,value) {try {localStorage.setItem(key,JSON.stringify(value));} catch { /* Storage may be disabled. */ }}
function dateValue(value) {
  if (!value) return null;
  const d = new Date(typeof value === 'number' && value < 1e12 ? value*1000 : value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function dateLabel(value, short=false) {
  const d=dateValue(value); if(!d) return 'Not yet recorded';
  return new Intl.DateTimeFormat(undefined, short ? {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'} : {dateStyle:'medium',timeStyle:'short'}).format(d);
}
function asString(value) {return typeof value==='string' ? value : '';}
const cleanSnapshot = metadataSnapshot;
function normalize(data) {
  return {...EMPTY,...data,tasks:Array.isArray(data?.tasks)?data.tasks:[],sources:Array.isArray(data?.sources)?data.sources:[],sync:{...EMPTY.sync,...data?.sync}};
}
function stableOrder(oldTasks,newTasks) {
  const incoming=new Map(newTasks.map(t=>[t.id,t]));
  const ordered=oldTasks.filter(t=>incoming.has(t.id)).map(t=>{const next=incoming.get(t.id);incoming.delete(t.id);return next;});
  return [...ordered,...incoming.values()];
}
class ApiError extends Error {constructor(message,status,payload,availability){super(message);this.status=status;this.payload=payload;this.availability=availability;}}
function unavailableState(error) {return error?.availability||(error instanceof TypeError||error?.name==='AbortError'?'offline':null);}
function SignInLink() {return <a className="button" href="/?sign-in=1" target="_blank" rel="noopener noreferrer">Sign in again <span className="sr-only">in a new tab</span></a>;}
async function api(path,{method='GET',body,token,signal}={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),method==='GET'?12000:45000);
  const abort=()=>controller.abort(); signal?.addEventListener('abort',abort,{once:true});
  try {
    const res=await fetch(path,{method,signal:controller.signal,cache:'no-store',redirect:'manual',headers:{Accept:'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{'X-Dashboard-Token':token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    if(res.type==='opaqueredirect'||res.redirected||(res.status>=300&&res.status<400)||res.status===401||res.status===403)throw new ApiError('Sign in again to refresh this dashboard. Your saved view and unsaved edits are still here.',res.status,null,'auth');
    const type=res.headers.get('Content-Type')||'';
    if(!/\bapplication\/(?:[\w.+-]*\+)?json\b/i.test(type)){
      if(res.status>=500)throw new ApiError('The dashboard on your Mac is unavailable. Your saved view has not changed.',res.status,null,'offline');
      const text=await res.text();
      const access=/cloudflare\s*access|cloudflareaccess\.com|\/cdn-cgi\/access\//i.test(text);
      throw new ApiError(access?'Sign in again to refresh this dashboard.':'The dashboard returned an unexpected page. Your saved view has not changed.',res.status,null,access?'auth':'offline');
    }
    let result=null;try{result=await res.json();}catch{throw new ApiError('The dashboard returned unreadable data. Your saved view has not changed.',res.status,null,'offline');}
    if(res.status>=500)throw new ApiError(result?.code==='access_unavailable'?'Access verification is temporarily unavailable. Your saved view has not changed.':'The dashboard on your Mac is unavailable. Your saved view has not changed.',res.status,result,result?.code==='access_unavailable'?'verification':'offline');
    if(!res.ok)throw new ApiError(asString(result?.error)||asString(result?.message)||`The request could not be completed (${res.status}).`,res.status,result);
    return result;
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
function friendlyError(error) {return error?.name==='AbortError'?'The request took too long. Your changes have not been discarded.':error?.message||'Something interrupted the request. Please try again.';}

function Icon({name,...props}) {
  const paths={
    home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></>,
    folders:<><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M7 3h5l2 2h7"/></>,
    idea:<><path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 .8-1 2-1 2H9s0-1.2-1-2Z"/></>,
    check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/></>,
    close:<path d="m6 6 12 12M18 6 6 18"/>,
    arrow:<><path d="M4 12h16m-6-6 6 6-6 6"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
    plus:<path d="M12 4v16M4 12h16"/>,
    link:<><path d="m9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 7l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9 1)"/></>,
    pause:<><path d="M8 5v14M16 5v14"/></>,
    play:<path d="m8 4 12 8-12 8Z"/>,
    layers:<><path d="m3 8 9-5 9 5-9 5Zm0 5 9 5 9-5M3 18l9 5 9-5" transform="translate(0 -1)"/></>,
    offline:<><path d="m3 3 18 18M8 5a8 8 0 0 1 12 9M4 9a8 8 0 0 0 10 11M7 7l10 10"/><path d="M19 4h2v2"/></>,
    settings:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]||paths.layers}</svg>;
}
function ActionButton({children,kind='',className='',...props}) {return <Button className={`button ${kind} ${className}`} {...props}>{children}</Button>;}
function StatusBadge({task}) {
  const disposition=dispositionOf(task);
  if(disposition!=='tracked')return <span className={`status-badge ${disposition}`}>{DISPOSITIONS[disposition]}</span>;
  if(task.status==='idea'||task.status==='done')return <span className={`status-badge ${task.status}`}><Icon name={task.status==='idea'?'idea':'check'}/>{STATUS[task.status]}</span>;
  if(task.status==='waiting')return <span className="status-badge review">Waiting</span>;
  return <span className={`status-badge ${task.triage||'untriaged'}`}>{task.triage==='later'&&<Icon name="clock"/>}{TRIAGE[task.triage]||'Needs sorting'}</span>;
}
function EmptyState({title,children,action}) {return <div className="empty-state"><h3>{title}</h3><p>{children}</p>{action&&<div className="actions">{action}</div>}</div>;}
function TaskCard({task,onOpen,onTriage,onSort,onReturn,canWrite,busy,compact=false}) {
  const fields=displayFields(task),disposition=dispositionOf(task);
  return <article className={`task-card ${compact?'compact-task':''} ${isOngoing(task)&&task.triage==='blocking'?'is-blocking':''}`}>
    <div className="card-meta"><span className="domain-label">{task.domain||task.project||'Unsorted'}</span><StatusBadge task={task}/></div>
    <h3 className="task-title"><Button className="title-button" onPress={()=>onOpen(task.id)} aria-label={`Open item: ${fields.title}`}>{fields.title}</Button></h3>
    {!compact&&fields.project&&fields.project!==task.domain&&<p className="project-label">{fields.suggested?'Suggested project: ':''}{fields.project}</p>}
    {!compact&&fields.recap&&<p className="card-recap">{fields.recap}</p>}
    {fields.nextAction&&disposition!=='reference'&&<p className="next-action"><span className="next-label">{fields.suggested?'Suggested next step':'Next step'}</span>{compact?shortTitle(fields.nextAction,180):fields.nextAction}</p>}
    {!fields.recap&&!fields.nextAction&&<p className="card-note">{disposition==='inbox'?'Open the conversation context to decide what to keep.':disposition==='reference'?'Saved for reference. No work is expected.':'Open to add a next step when you need one.'}</p>}
    {!compact&&disposition==='tracked'&&task.priorityReason&&task.triage!=='later'&&<p className="priority-reason"><span>Why here:</span> {task.priorityReason}</p>}
    <div className="card-footnote">{disposition==='inbox'&&fields.suggested?<span>{task.suggestion.stale?'Draft may be out of date':'Suggested draft · not yet confirmed'}</span>:task.hasNewActivity&&disposition==='tracked'?<span className="new-activity">Conversation updated</span>:null}</div>
    <div className="actions">
      {disposition==='inbox'?<ActionButton kind="primary" onPress={()=>onSort(task.id)} isDisabled={!canWrite||busy} aria-label={`Sort item: ${fields.title}`}>Sort this</ActionButton>:<ActionButton onPress={()=>onOpen(task.id)} aria-label={`See context for ${fields.title}`}>See context</ActionButton>}
      {disposition==='inbox'&&<ActionButton kind="quiet" onPress={()=>onOpen(task.id)}>See context</ActionButton>}
      {disposition==='reference'&&<ActionButton kind="quiet" isDisabled={!canWrite||busy} onPress={()=>onReturn(task)} aria-label={`Return to inbox: ${fields.title}`}>Reconsider</ActionButton>}
      {isOngoing(task)&&<ActionButton kind="quiet" isDisabled={!canWrite||busy} onPress={()=>onTriage(task,task.triage==='later'?'ready':'later')} aria-label={`${task.triage==='later'?'Bring back':'Set aside for later'}: ${fields.title}`}><Icon name="clock"/>{task.triage==='later'?'Bring back':'Later'}</ActionButton>}
    </div>
  </article>;
}
function TaskGroup({title,description,tasks,initialLimit=6,...cardProps}) {
  const [limit,setLimit]=useState(initialLimit);
  useEffect(()=>setLimit(initialLimit),[title,initialLimit]);
  if(!tasks.length)return null;
  return <section className="task-group" aria-label={title}>
    <div className="section-heading"><div><h2>{title} <span className="count">{tasks.length}</span></h2>{description&&<p>{description}</p>}</div></div>
    <div className="task-grid">{tasks.slice(0,limit).map(task=><TaskCard key={task.id} task={task} {...cardProps}/>)}</div>
    {tasks.length>limit&&<ActionButton className="show-more" onPress={()=>setLimit(n=>n+12)}>Show {Math.min(12,tasks.length-limit)} more</ActionButton>}
  </section>;
}

function validSourceLink(raw) {
  if(typeof raw!=='string')return null;
  try {const url=new URL(raw);if(url.protocol==='codex:'&&url.hostname==='threads')return {url:raw,desktop:true};if(url.protocol==='https:'&&['chatgpt.com','chat.openai.com'].includes(url.hostname))return {url:raw,desktop:false};}catch{}
  return null;
}
function SourcePanel({source,online,onUnavailable}) {
  const [opened,setOpened]=useState(false),[detail,setDetail]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!opened||!online||detail)return;
    const controller=new AbortController();setLoading(true);setError('');
    api(`/api/sources/${encodeURIComponent(source.id)}`,{signal:controller.signal}).then(data=>setDetail(data?.source&&typeof data.source==='object'?data.source:data)).catch(e=>{if(!controller.signal.aborted){setError(friendlyError(e));onUnavailable?.(e);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[opened,online,source.id,detail,attempt,onUnavailable]);
  const link=validSourceLink(source.sourceUrl);
  const canOpenDesktop=typeof navigator!=='undefined'&&!/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const runtime={active:'Chat running',idle:'Chat idle',notLoaded:'Chat not loaded',systemError:'Chat reported an error'}[source.runtimeStatus]||source.runtimeStatus;
  return <details className="source-panel" onToggle={e=>setOpened(e.currentTarget.open)}>
    <summary><span><span className="source-kind">{source.source==='codex'?'Codex conversation':source.source||'Conversation'}</span><span className="source-title">{source.title||'Untitled conversation'}</span></span></summary>
    <div className="source-content">
      {source.summary&&<p>{source.summary}</p>}
      <div className="source-metadata"><span>Last activity: {dateLabel(source.updatedAt)}</span>{runtime&&<span>{runtime} · activity does not confirm task completion</span>}</div>
      {source.sourceStatusNote&&<p className="subtle">{source.sourceStatusNote}</p>}
      {!online&&<p className="notice-inline">Recent messages need a live, signed-in connection. This saved view contains metadata only.</p>}
      {loading&&<p role="status">Loading recent context…</p>}
      {error&&<div className="error-inline" role="alert"><p>Recent context is unavailable. {error}</p><ActionButton onPress={()=>setAttempt(n=>n+1)}>Try again</ActionButton></div>}
      {detail&&<div className="message-excerpts">
        {asString(detail.lastUserMessage)&&<section><h4>Your recent message</h4><p className="plain-excerpt">{detail.lastUserMessage}</p></section>}
        {asString(detail.lastAssistantMessage)&&<section><h4>Assistant’s recent response</h4><p className="plain-excerpt">{detail.lastAssistantMessage}</p></section>}
        {!asString(detail.lastUserMessage)&&!asString(detail.lastAssistantMessage)&&<p className="subtle">No recent message excerpt is available for this conversation.</p>}
      </div>}
      {link&&(!link.desktop||canOpenDesktop)?<a className="button" href={link.url} {...(!link.desktop?{target:'_blank',rel:'noopener noreferrer'}:{})}><Icon name="link"/>{link.desktop?'Open in desktop app':'Open conversation'}</a>:link?.desktop?<p className="subtle">The desktop app link is available on your Mac. Recent context can be read here on your phone.</p>:<p className="subtle">No direct conversation link is available.</p>}
    </div>
  </details>;
}

const blankDraft=()=>({title:'',domain:'',project:'',disposition:'tracked',recap:'',status:'active',triage:'ready',nextAction:'',owner:'none',priorityReason:'',sourceIds:[]});
function draftFor(task) {return {...blankDraft(),...Object.fromEntries(Object.keys(blankDraft()).map(key=>[key,task?.[key]??blankDraft()[key]])),disposition:task?dispositionOf(task):'tracked',sourceIds:Array.isArray(task?.sourceIds)?[...task.sourceIds]:[]};}
function SelectField({label,id,value,onChange,children,disabled=false}) {return <div className="field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>{children}</select></div>;}
function FormText({label,value,onChange,multiline=false,required=false,maxLength,inputRef,...props}) {
  if(multiline)return <div className="field"><label htmlFor={props.id}>{label}</label><textarea {...props} value={value} onChange={e=>onChange(e.target.value)} required={required} maxLength={maxLength}/></div>;
  return <TextField className="field" value={value} onChange={onChange} isRequired={required}><Label>{label}</Label><Input {...props} ref={inputRef} maxLength={maxLength}/></TextField>;
}

function TaskDialog({task,isNew,sources,online,canWrite,onClose,onSave,onEditingChange,onAcknowledge,onQuickChange,onSort,connection,onUnavailable}) {
  const [editing,setEditing]=useState(isNew),[draft,setDraft]=useState(()=>draftFor(task)),[baseline,setBaseline]=useState(()=>draftFor(task)),[revision,setRevision]=useState(task?.revision),[saving,setSaving]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(null),[discard,setDiscard]=useState(false),[sourceQuery,setSourceQuery]=useState('');
  const dirty=JSON.stringify(draft)!==JSON.stringify(baseline);
  const titleRef=useRef(null);
  useEffect(()=>{onEditingChange(editing);return ()=>onEditingChange(false);},[editing,onEditingChange]);
  const change=(key,value)=>setDraft(old=>({...old,[key]:value}));
  const close=()=>{if(saving)return;if(editing&&dirty)setDiscard(true);else onClose();};
  const beginEdit=()=>{setDraft(draftFor(task));setBaseline(draftFor(task));setRevision(task.revision);setError('');setConflict(null);setEditing(true);};
  const cancelEdit=()=>{if(dirty){setDiscard(true);return;}if(isNew)onClose();else setEditing(false);};
  const save=async event=>{
    event.preventDefault();if(!canWrite||saving)return;
    if(!draft.title.trim()){setError('Give this item a title.');titleRef.current?.focus();return;}
    setSaving(true);setError('');setConflict(null);
    try {await onSave({...draft,title:draft.title.trim()},isNew?null:task.id,revision);setEditing(false);onClose();}
    catch(e){setError(e.status===409?'This item changed while you were editing. Your edits are still here. Review them before saving again.':friendlyError(e));if(e.status===409){const latest=e.payload?.latest||e.payload?.task;setConflict(latest||true);if(latest?.revision!==undefined)setRevision(latest.revision);}}
    finally{setSaving(false);}
  };
  const related=sources.filter(s=>(task?.sourceIds||[]).includes(s.id));
  const missing=(task?.sourceIds||[]).filter(id=>!sources.some(s=>s.id===id));
  const filteredSources=sources.filter(s=>draft.sourceIds.includes(s.id)||`${s.title} ${s.summary||''}`.toLowerCase().includes(sourceQuery.toLowerCase())).slice(0,30);
  return <ModalOverlay className="dialog-overlay" isOpen isDismissable={!editing&&!saving} isKeyboardDismissDisabled={saving} onOpenChange={open=>{if(!open)close();}}><Modal className="task-modal"><Dialog aria-labelledby="task-dialog-title" className="task-dialog">
    <header className="dialog-header"><div><p className="eyebrow">{isNew?'New item':editing?'Edit item':'Context & next step'}</p><Heading slot="title" id="task-dialog-title">{isNew?'Add a task or idea':editing?'Make the next step clear':displayFields(task).title}</Heading></div><ActionButton kind="icon-button quiet" aria-label="Close task details" onPress={close} isDisabled={saving}><Icon name="close"/></ActionButton></header>
    {discard&&<div className="discard-prompt" role="alert"><p>Discard your unsaved edits?</p><div className="actions"><ActionButton kind="primary" onPress={()=>setDiscard(false)}>Keep editing</ActionButton><ActionButton onPress={()=>{setDiscard(false);if(isNew)onClose();else{setDraft(baseline);setEditing(false);}}}>Discard edits</ActionButton></div></div>}
    {!online&&<div className="notice-banner"><p>{connection==='auth'?'Sign in to refresh. Your draft remains here while you sign in in a new tab.':'Updates are unavailable. You can read saved metadata; changes need a connection.'}</p>{connection==='auth'&&<SignInLink/>}</div>}
    {editing?<form className="task-form" onSubmit={save}>
      <FormText label="Title" value={draft.title} onChange={v=>change('title',v)} required maxLength={8000} inputRef={titleRef}/>
      <div className="form-grid"><FormText label="Domain" value={draft.domain} onChange={v=>change('domain',v)} maxLength={120}/><FormText label="Project" value={draft.project} onChange={v=>change('project',v)} maxLength={200}/></div>
      <FormText label="Recap" id="edit-recap" value={draft.recap} onChange={v=>change('recap',v)} multiline maxLength={1000} placeholder="A little context for your future self"/>
      <FormText label="Next action" id="edit-next-action" value={draft.nextAction} onChange={v=>change('nextAction',v)} multiline maxLength={2000} placeholder="One concrete step that can move this forward"/>
      <SelectField label="Keep this in" id="edit-disposition" value={draft.disposition} onChange={v=>change('disposition',v)}>{Object.entries(DISPOSITIONS).map(([v,label])=><option key={v} value={v}>{label}</option>)}</SelectField>
      <div className="form-grid"><SelectField label="Status" id="edit-status" value={draft.status} onChange={v=>change('status',v)}>{Object.entries(STATUS).map(([v,label])=><option key={v} value={v}>{label}</option>)}</SelectField><SelectField label="Next actor" id="edit-owner" value={draft.owner} onChange={v=>change('owner',v)}>{Object.entries(OWNER).map(([v,label])=><option key={v} value={v}>{label}</option>)}</SelectField></div>
      <SelectField label="Attention group" id="edit-triage" value={draft.triage} onChange={v=>change('triage',v)}>{Object.entries(TRIAGE).map(([v,label])=><option key={v} value={v}>{label}</option>)}</SelectField>
      <FormText label="Why this belongs in that group" id="edit-priority-reason" value={draft.priorityReason} onChange={v=>change('priorityReason',v)} multiline maxLength={2000} placeholder="The decision, dependency, or reason for this priority"/>
      <details className="source-picker"><summary>Related conversations <span className="count">{draft.sourceIds.length}</span></summary><TextField className="field" value={sourceQuery} onChange={setSourceQuery}><Label>Find a conversation to attach</Label><Input type="search"/></TextField><fieldset><legend className="sr-only">Conversations linked to this item</legend>{filteredSources.map(source=><label className="source-option" key={source.id}><input type="checkbox" checked={draft.sourceIds.includes(source.id)} onChange={e=>change('sourceIds',e.target.checked?[...draft.sourceIds,source.id]:draft.sourceIds.filter(id=>id!==source.id))}/><span>{source.title||'Untitled conversation'}</span></label>)}</fieldset>{filteredSources.length===30&&<p className="subtle">Showing up to 30 matches. Search to narrow the list.</p>}{!filteredSources.length&&<p className="subtle">No matching conversations.</p>}</details>
      {error&&<div className="error-inline" role="alert"><p>{error}</p>{conflict&&<><p>Saving again applies your fields to the latest version. You can also discard your draft and load that version.</p><ActionButton onPress={()=>{const latest=typeof conflict==='object'?conflict:null;if(latest){setDraft(draftFor(latest));setBaseline(draftFor(latest));setRevision(latest.revision);setConflict(null);setError('');}}} isDisabled={typeof conflict!=='object'}>Load latest fields instead</ActionButton></>}</div>}
      <div className="form-actions"><ActionButton type="submit" kind="primary" isDisabled={!canWrite||saving}>{saving?'Saving…':'Save changes'}</ActionButton><ActionButton onPress={cancelEdit} isDisabled={saving}>Cancel</ActionButton></div>
    </form>:<div className="task-detail-body">
      <div className="detail-meta"><StatusBadge task={task}/><span>{task.domain||'Unsorted'}{task.project?` · ${task.project}`:''}</span></div>
      {task.recap&&<p className="detail-recap">{task.recap}</p>}
      {dispositionOf(task)==='inbox'?<div className="notice-inline"><p>This saved conversation is waiting for your decision. Sort it when you are ready.</p><ActionButton kind="primary" isDisabled={!canWrite} onPress={()=>onSort(task.id)}>Sort this item</ActionButton></div>:dispositionOf(task)==='reference'?<p className="notice-inline">Saved for reference. It stays outside your ongoing and finished work.</p>:<><section className="detail-next"><h3>Next action</h3><p>{task.nextAction||'No next action has been recorded.'}</p></section><dl className="detail-facts"><dt>Next actor</dt><dd>{OWNER[task.owner]||'Not assigned'}</dd><dt>Status</dt><dd>{STATUS[task.status]||task.status}</dd><dt>Why here</dt><dd>{task.priorityReason||'No priority reason recorded.'}</dd><dt>Last reviewed</dt><dd>{dateLabel(task.verifiedAt)}</dd></dl></>}
      {task.hasNewActivity&&dispositionOf(task)==='tracked'&&<div className="notice-inline"><p>A linked conversation changed. Reading its context and acknowledging the update leaves the task status as it is.</p><ActionButton isDisabled={!canWrite||saving} onPress={async()=>{setSaving(true);setError('');try{await onAcknowledge(task);}catch(e){setError(friendlyError(e));}finally{setSaving(false);}}}>Mark update reviewed</ActionButton></div>}
      {error&&<p className="error-inline" role="alert">{error}</p>}
      <div className="actions"><ActionButton kind={dispositionOf(task)==='inbox'?'':'primary'} isDisabled={!canWrite||saving} onPress={beginEdit}>Edit item</ActionButton>{isOngoing(task)&&<ActionButton isDisabled={!canWrite||saving} onPress={async()=>{setSaving(true);setError('');try{await onQuickChange(task,task.status==='waiting'?{status:'active'}:{status:'waiting'},task.status==='waiting'?'Ready to continue.':'Marked as waiting.');}catch(e){setError(friendlyError(e));}finally{setSaving(false);}}}>{task.status==='waiting'?'Resume work':'Mark waiting'}</ActionButton>}{isOngoing(task)&&<ActionButton isDisabled={!canWrite||saving} onPress={async()=>{setSaving(true);setError('');try{await onQuickChange(task,{status:'done'},'Marked finished.');}catch(e){setError(friendlyError(e));}finally{setSaving(false);}}}>Mark finished</ActionButton>}</div>
      <section className="related-sources"><h3>Supporting conversations</h3>{related.map(source=><SourcePanel key={source.id} source={source} online={online} onUnavailable={onUnavailable}/>)}{missing.length>0&&<p className="notice-inline">{missing.length} linked {missing.length===1?'conversation is':'conversations are'} unavailable in this snapshot.</p>}{!related.length&&!missing.length&&<p className="subtle">No conversations are linked yet. You can attach one when editing this item.</p>}</section>
    </div>}
  </Dialog></Modal></ModalOverlay>;
}

const SORT_CHOICES={track:'Tracked as ongoing work.',reference:'Kept as reference.',idea:'Saved as an idea.',done:'Marked as already finished.'};

function SortingStep({task,sources,online,canWrite,onClassify,onAdvance,onDirtyChange,onSavingChange,restoredDraft,onUnavailable}) {
  const [draft,setDraft]=useState(()=>restoredDraft||sortingDraft(task));
  const [baseline]=useState(()=>restoredDraft||sortingDraft(task));
  const [revision,setRevision]=useState(task.revision);
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(null);
  const titleRef=useRef(null);
  const dirty=JSON.stringify(draft)!==JSON.stringify(baseline);
  useEffect(()=>{onDirtyChange(dirty);},[dirty,onDirtyChange]);
  const suggestion=task.verifiedAt?null:task.suggestion;
  const related=sources.filter(source=>(task.sourceIds||[]).includes(source.id)||source.id===suggestion?.sourceId);
  const change=(key,value)=>setDraft(previous=>({...previous,[key]:value}));
  const classify=async choice=>{
    if(saving||!canWrite)return;
    if(!draft.title.trim()){setError('Add a short name before choosing where to keep this.');titleRef.current?.focus();return;}
    setSaving(true);onSavingChange(true);setError('');setConflict(null);
    try{
      const changeRecord=await onClassify(task,classificationChanges(draft,choice),revision,SORT_CHOICES[choice]);
      onAdvance(choice,changeRecord);
    }catch(e){
      const latest=e.status===409&&(e.payload?.latest||e.payload?.task);
      if(latest?.revision!==undefined)setRevision(latest.revision);
      setConflict(latest||null);
      setError(e.status===409?'This item changed elsewhere. Your draft is still here. Review it, then choose an action again to apply it to the latest version.':friendlyError(e));
    }finally{setSaving(false);onSavingChange(false);}
  };
  return <div className="sorting-step">
    <div className={`draft-notice ${suggestion?.stale?'is-stale':''}`}><strong>{restoredDraft?'Draft restored after Undo':task.verifiedAt?'Your saved fields':suggestion?.method==='assistant-draft'?'Suggested draft':'Starter draft'}</strong><p>{restoredDraft?'The saved item was restored. These are the fields you were reviewing; choose again to save them.':task.verifiedAt?'You have reviewed this item before. Your chosen wording is retained; decide where it belongs now.':suggestion?.stale?'The conversation changed after this draft was prepared. Check the source context before accepting it.':suggestion?.method==='assistant-draft'?'Prepared from the conversation. Adjust anything, then choose where it belongs.':'These are starting fields, not a confirmed summary. Check the conversation and adjust them.'}</p></div>
    <div className="sorting-fields">
      <FormText label="Short name" value={draft.title} onChange={v=>change('title',v)} maxLength={task.verifiedAt?8000:160} required inputRef={titleRef}/>
      {draft.recap&&<div className="sorting-recap"><p>{draft.recap}</p></div>}
      <FormText label="Project (optional)" value={draft.project} onChange={v=>change('project',v)} maxLength={200} placeholder="A project you recognize"/>
      <FormText label="Next step (optional)" id="sort-next-step" value={draft.nextAction} onChange={v=>change('nextAction',v)} multiline maxLength={2000} placeholder="One useful thing to do next"/>
      <details className="recap-editor"><summary>Edit the recap</summary><FormText label="Recap" id="sort-recap" value={draft.recap} onChange={v=>change('recap',v)} multiline maxLength={1000}/></details>
    </div>
    <details className="sorting-context"><summary>Check conversation context <span className="count">{related.length||''}</span></summary><div>
      {suggestion?.evidence&&<p className="draft-evidence"><strong>Draft based on:</strong> {suggestion.evidence}</p>}
      {suggestion?.sourceUpdatedAt&&<p className="subtle">Draft source last updated {dateLabel(suggestion.sourceUpdatedAt)}.</p>}
      {related.map(source=><SourcePanel key={source.id} source={source} online={online} onUnavailable={onUnavailable}/>)}
      {!related.length&&<p className="subtle">No linked conversation is available for this item. Use the saved fields to make your decision.</p>}
    </div></details>
    {error&&<div className="error-inline" role="alert"><p>{error}</p>{conflict&&<><details className="conflict-comparison"><summary>Compare the latest saved fields</summary><dl><dt>Title</dt><dd>{conflict.title}</dd><dt>Project</dt><dd>{conflict.project||'None'}</dd><dt>Recap</dt><dd>{conflict.recap||'None'}</dd><dt>Next step</dt><dd>{conflict.nextAction||'None'}</dd><dt>Kept in</dt><dd>{DISPOSITIONS[dispositionOf(conflict)]}</dd></dl></details><ActionButton onPress={()=>{setDraft(sortingDraft({...conflict,suggestion:null}));setRevision(conflict.revision);setConflict(null);setError('');}}>Load latest fields instead</ActionButton></>}</div>}
    <div className="classification-choices" aria-label="Choose where to keep this item">
      <ActionButton kind="primary" isDisabled={!canWrite||saving} onPress={()=>classify('track')}><span>Track this<span className="choice-description">Add to ongoing work</span></span></ActionButton>
      <ActionButton isDisabled={!canWrite||saving} onPress={()=>classify('reference')}><span>Keep as reference<span className="choice-description">Save it without a task</span></span></ActionButton>
      <ActionButton isDisabled={!canWrite||saving} onPress={()=>classify('idea')}>Save as idea</ActionButton>
      <ActionButton isDisabled={!canWrite||saving} onPress={()=>classify('done')}>Already finished</ActionButton>
    </div>
    <div className="sorting-skip"><ActionButton kind="quiet" isDisabled={saving} onPress={()=>onAdvance('skip',null)}>Skip for now</ActionButton><p>Skip leaves this item unchanged.</p></div>
    {saving&&<p className="sr-only" role="status">Saving your choice…</p>}
  </div>;
}

function SortingDialog({ids,tasks,sources,online,canWrite,onClose,onClassify,onUndo,onEditingChange,connection,onUnavailable}) {
  const [position,setPosition]=useState(0),[outcomes,setOutcomes]=useState([]),[lastChange,setLastChange]=useState(null);
  const [restoredStep,setRestoredStep]=useState(null);
  const [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[discard,setDiscard]=useState(false),[undoError,setUndoError]=useState(''),[progressMessage,setProgressMessage]=useState('');
  const headingRef=useRef(null),stepFocusRef=useRef(false);
  const task=tasks.find(item=>item.id===ids[position]);
  const complete=position>=ids.length;
  useEffect(()=>{onEditingChange(true);return()=>onEditingChange(false);},[onEditingChange]);
  useEffect(()=>{if(stepFocusRef.current)headingRef.current?.focus();else stepFocusRef.current=true;},[position]);
  const close=()=>{if(saving)return;if(dirty&&!complete)setDiscard(true);else onClose();};
  const advance=(choice,change)=>{
    setOutcomes(previous=>[...previous.filter(result=>result.position!==position),{position,choice}]);
    if(change)setLastChange({...change,position});
    setRestoredStep(null);
    setPosition(index=>index+1);setDirty(false);setUndoError('');
    setProgressMessage(choice==='skip'?'Left in Needs sorting.':SORT_CHOICES[choice]);
  };
  const undo=async()=>{
    if(!lastChange||!canWrite||saving)return;
    setSaving(true);setUndoError('');
    try{await onUndo(lastChange);setRestoredStep({id:lastChange.id,position:lastChange.position,draft:lastChange.reviewDraft});setPosition(lastChange.position);setOutcomes(previous=>previous.filter(result=>result.position<lastChange.position));setLastChange(null);setDirty(false);setProgressMessage('Choice undone. This item is back in Needs sorting.');}
    catch(e){setUndoError(e.status===409?'This item changed again. Undo was not applied; your saved choice remains.':friendlyError(e));}
    finally{setSaving(false);}
  };
  const savedCount=outcomes.filter(result=>result.choice!=='skip').length;
  return <ModalOverlay className="dialog-overlay" isOpen isDismissable={false} isKeyboardDismissDisabled={saving} onOpenChange={open=>{if(!open)close();}}><Modal className="task-modal sorting-modal"><Dialog className="task-dialog" aria-labelledby="sort-dialog-title">
    <header className="dialog-header"><div><p className="eyebrow">{complete?'Sorting complete':`Sort a few · ${position+1} of ${ids.length}`}</p><Heading slot="title" id="sort-dialog-title" ref={headingRef} tabIndex={-1}>{complete?'A good place to pause.':'What would you like to keep?'}</Heading></div><ActionButton kind="icon-button quiet" aria-label="Close sorting" onPress={close} isDisabled={saving}><Icon name="close"/></ActionButton></header>
    {discard&&<div className="discard-prompt" role="alert"><p>Leave without saving these field edits?</p><div className="actions"><ActionButton kind="primary" onPress={()=>setDiscard(false)}>Keep editing</ActionButton><ActionButton onPress={onClose}>Leave sorting</ActionButton></div></div>}
    {!online&&<div className="notice-banner"><p>{connection==='auth'?'Sign in to refresh. Your draft remains here while you sign in in a new tab.':connection==='verification'?'Access verification is temporarily unavailable. Your draft is still here; try again before saving a choice.':'Your Mac is disconnected. Your draft is still here; reconnect before saving a choice.'}</p>{connection==='auth'&&<SignInLink/>}</div>}
    {lastChange&&<div className="sorting-undo"><p>{lastChange.label}</p><ActionButton kind="quiet" onPress={undo} isDisabled={!canWrite||saving||dirty}>Undo last choice</ActionButton>{dirty&&<p className="subtle">Finish or skip this edited draft before undoing the previous choice.</p>}</div>}
    {undoError&&<p className="error-inline" role="alert">{undoError}</p>}
    {complete?<div className="sorting-complete"><Icon name="check"/><h3>{savedCount} {savedCount===1?'item':'items'} sorted.</h3><p>{outcomes.length-savedCount?`${outcomes.length-savedCount} left in Needs sorting. `:''}{savedCount?'Your choices are saved. ':'No records were changed. '}You can return to the rest whenever it is useful.</p><ActionButton kind="primary" onPress={onClose}>Back to my work</ActionButton></div>:task?<SortingStep key={`${task.id}-${position}`} task={task} sources={sources} online={online} canWrite={canWrite&&!saving} onClassify={onClassify} onAdvance={advance} onDirtyChange={setDirty} onSavingChange={setSaving} onUnavailable={onUnavailable} restoredDraft={restoredStep?.id===task.id&&restoredStep.position===position?restoredStep.draft:undefined}/>:<EmptyState title="This item is no longer available" action={<ActionButton onPress={()=>advance('skip',null)}>Continue</ActionButton>}>It may have been removed since this batch began. The rest of your batch is still here.</EmptyState>}
    <div className="sr-only" role="status" aria-live="polite">{progressMessage}</div>
  </Dialog></Modal></ModalOverlay>;
}

export default function App() {
  const initialCache=useRef(readStored(SNAPSHOT_KEY));
  const [data,setData]=useState(()=>normalize(initialCache.current||EMPTY));
  const dataRef=useRef(data);dataRef.current=data;
  const [connection,setConnection]=useState('checking'),[connectionError,setConnectionError]=useState(''),[snapshotAt,setSnapshotAt]=useState(initialCache.current?.savedAt||null);
  const [view,setView]=useState('home'),[query,setQuery]=useState(''),[domain,setDomain]=useState('all'),[projectStatus,setProjectStatus]=useState('all'),[projectKey,setProjectKey]=useState(null),[libraryFilter,setLibraryFilter]=useState('inbox');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [selectedId,setSelectedId]=useState(null),[adding,setAdding]=useState(false),[editing,setEditing]=useState(false),[pendingAvailable,setPendingAvailable]=useState(false),[sortBatch,setSortBatch]=useState(null);
  const editingRef=useRef(false),pendingRef=useRef(null),fetchingRef=useRef(false),mutationEpoch=useRef(0),viewRef=useRef(view),toolsRef=useRef(false);
  viewRef.current=view;
  const [announcement,setAnnouncement]=useState(''),[toast,setToast]=useState(null),[undo,setUndo]=useState(null),[actionError,setActionError]=useState(''),[busyIds,setBusyIds]=useState(new Set()),[syncBusy,setSyncBusy]=useState(false),[settingsBusy,setSettingsBusy]=useState(false);
  const [ideaTitle,setIdeaTitle]=useState(''),[ideaBusy,setIdeaBusy]=useState(false);
  const [preferences,setPreferences]=useState(()=>{const saved=readStored(PREFERENCES_KEY)||{};return {readingSize:'100',showReflection:true,...saved,theme:saved.designVersion===3?saved.theme:saved.theme==='dark'?'dark':'light',designVersion:3};});
  const [toolRequest,setToolRequest]=useState({isOpen:false,tool:'decision',task:null});
  const undoRef=useRef(null),mainRef=useRef(null),openedFromRef=useRef(null);
  const online=connection==='online',canWrite=online&&Boolean(data.csrfToken);
  const handleUnavailable=useCallback(error=>{const next=unavailableState(error);if(!next)return;setConnection(next);setConnectionError(friendlyError(error));setData(previous=>({...previous,csrfToken:null}));},[]);
  useEffect(()=>{document.documentElement.dataset.theme=preferences.theme;document.documentElement.style.fontSize=`${preferences.readingSize}%`;writeStored(PREFERENCES_KEY,preferences);},[preferences]);
  const persistSnapshot=useCallback(next=>{const snapshot=cleanSnapshot(next);writeStored(SNAPSHOT_KEY,snapshot);setSnapshotAt(snapshot.savedAt);},[]);
  const applyState=useCallback(next=>{
    const normalized=normalize(next),ordered={...normalized,tasks:stableOrder(dataRef.current.tasks,normalized.tasks)};
    dataRef.current=ordered;setData(ordered);persistSnapshot(ordered);
    pendingRef.current=null;setPendingAvailable(false);
  },[persistSnapshot]);
  const refresh=useCallback(async({force=false,announce=false}={})=>{
    if(fetchingRef.current)return null;fetchingRef.current=true;
    const epoch=mutationEpoch.current;
    try {
      const next=await api('/api/state');
      if(!next||!Array.isArray(next.tasks)||!Array.isArray(next.sources)||typeof next.csrfToken!=='string'||!next.csrfToken)throw new ApiError('The dashboard returned incomplete data. Your saved view has not changed.',200,null,'offline');
      if(epoch!==mutationEpoch.current)return null;
      setConnection('online');setConnectionError('');
      if((editingRef.current||toolsRef.current||viewRef.current==='stream')&&!force){
        const changed=JSON.stringify([stableOrder(dataRef.current.tasks,next.tasks),next.sources])!==JSON.stringify([dataRef.current.tasks,dataRef.current.sources]);
        if(changed){pendingRef.current=next;setPendingAvailable(true);}else{pendingRef.current=null;setPendingAvailable(false);}
        setData(old=>({...old,csrfToken:next.csrfToken,sync:{...old.sync,...next.sync}}));
      }else applyState(next);
      if(announce)setAnnouncement('Dashboard updated.');
      return normalize(next);
    }catch(error){handleUnavailable(error);if(!unavailableState(error)){setConnection('offline');setConnectionError(friendlyError(error));}if(announce)setAnnouncement(error.availability==='auth'?'Sign in again to refresh. Your saved view is still available.':'Updates are unavailable. The last saved view is still available.');return null;}
    finally{fetchingRef.current=false;}
  },[applyState,handleUnavailable]);
  useEffect(()=>{refresh();const id=setInterval(()=>refresh(),30000);const reconnect=()=>refresh();const disconnect=()=>{setConnection('offline');setConnectionError('This device is offline.');};window.addEventListener('online',reconnect);window.addEventListener('focus',reconnect);window.addEventListener('offline',disconnect);return()=>{clearInterval(id);window.removeEventListener('online',reconnect);window.removeEventListener('focus',reconnect);window.removeEventListener('offline',disconnect);};},[refresh]);
  const editChanged=useCallback(value=>{editingRef.current=value;setEditing(value);if(!value&&pendingRef.current&&viewRef.current!=='stream'&&!toolsRef.current)applyState(pendingRef.current);},[applyState]);
  const selected=data.tasks.find(task=>task.id===selectedId);
  useEffect(()=>{if(selectedId&&!selected&&!editing){setSelectedId(null);setAnnouncement('This item is no longer available.');}},[selectedId,selected,editing]);
  const restoreFocus=()=>requestAnimationFrame(()=>{if(openedFromRef.current?.isConnected)openedFromRef.current.focus();else mainRef.current?.focus();});
  const openTask=id=>{openedFromRef.current=document.activeElement;setSelectedId(id);setAdding(false);};
  const closeDialog=()=>{setSelectedId(null);setAdding(false);editChanged(false);restoreFocus();};
  const startSorting=firstId=>{
    const ids=makeBatch(dataRef.current.tasks,firstId);
    if(!ids.length){setAnnouncement('There are no items waiting to be sorted.');return;}
    if(!selectedId)openedFromRef.current=document.activeElement;
    setSelectedId(null);setAdding(false);setSortBatch(ids);setActionError('');
  };
  const closeSorting=()=>{setSortBatch(null);editChanged(false);restoreFocus();};
  const setBusy=(id,value)=>setBusyIds(previous=>{const next=new Set(previous);if(value)next.add(id);else next.delete(id);return next;});
  const mergeTask=updated=>{
    if(!updated)return;
    const exists=dataRef.current.tasks.some(task=>task.id===updated.id);
    const next={...dataRef.current,tasks:exists?dataRef.current.tasks.map(task=>task.id===updated.id?updated:task):[...dataRef.current.tasks,updated]};
    dataRef.current=next;setData(next);persistSnapshot(next);
  };
  const clearPending=()=>{pendingRef.current=null;setPendingAvailable(false);};
  const patchTask=async(id,changes,revision)=>{
    if(!canWrite)throw new Error('Reconnect to your Mac before saving. Your draft is still here.');
    mutationEpoch.current+=1;clearPending();
    try {
      const result=await api(`/api/tasks/${encodeURIComponent(id)}`,{method:'PATCH',body:{...changes,revision},token:dataRef.current.csrfToken});
      mutationEpoch.current+=1;clearPending();
      const updated=result?.task||(result?.id?result:null);
      mergeTask(updated);return updated;
    }catch(error){
      mutationEpoch.current+=1;clearPending();
      const latest=error.status===409&&(error.payload?.latest||error.payload?.task);
      if(latest&&typeof latest==='object')mergeTask(latest);
      handleUnavailable(error);
      throw error;
    }
  };
  const changeWithUndo=async(task,changes,revision,label)=>{
    setBusy(task.id,true);setActionError('');
    try{
      const before={...previousFields(task,changes),hasNewActivity:Boolean(task.hasNewActivity)};
      const updated=await patchTask(task.id,changes,revision);
      if(!updated)throw new Error('Your choice may have saved, but its updated record was not returned. Refresh before making another change.');
      const priorDraft=sortingDraft(task);
      const reviewDraft=Object.fromEntries(Object.keys(priorDraft).map(key=>[key,changes[key]??priorDraft[key]]));
      const record={id:task.id,title:displayFields(task).title,changes:before,revision:updated.revision,label,reviewDraft};
      setUndo(record);setToast(label);setAnnouncement(`${label} Undo is available.`);return record;
    }finally{setBusy(task.id,false);}
  };
  const reportActionError=error=>{handleUnavailable(error);setActionError(error.status===409?'This item changed before your action was saved. Open it to review its latest state and try again.':friendlyError(error));};
  const quickChange=(task,changes,label)=>changeWithUndo(task,changes,task.revision,label);
  const onTriage=(task,triage)=>quickChange(task,{triage},triage==='later'?'Set aside for later. You can bring it back from Home or Projects.':'Brought back to Ready to continue.').catch(reportActionError);
  const onReturn=task=>quickChange(task,{disposition:'inbox'},'Returned to Needs sorting in Library.').catch(reportActionError);
  const undoChange=async record=>{
    if(!record||!canWrite)return;
    setBusy(record.id,true);setActionError('');
    try{await patchTask(record.id,record.changes,record.revision);setUndo(null);setToast('Your last change was undone.');setAnnouncement('Your last change was undone.');}
    finally{setBusy(record.id,false);}
  };
  const acknowledge=task=>quickChange(task,{hasNewActivity:false},'Conversation update reviewed. Task status is unchanged.');
  const saveTask=async(draft,id,revision)=>{
    if(!canWrite)throw new Error('Reconnect to your Mac before saving.');
    if(id)await patchTask(id,draft,revision);
    else{mutationEpoch.current+=1;clearPending();try{const result=await api('/api/tasks',{method:'POST',body:draft,token:dataRef.current.csrfToken});mutationEpoch.current+=1;clearPending();mergeTask(result?.task||(result?.id?result:null));await refresh({force:true});}catch(error){handleUnavailable(error);throw error;}}
    setAnnouncement(id?'Your changes were saved.':'Your item was created.');setToast(id?'Changes saved.':'Item added.');setUndo(null);
  };
  const saveIdea=async event=>{
    event.preventDefault();if(!ideaTitle.trim()||!canWrite||ideaBusy)return;setIdeaBusy(true);setActionError('');
    try{await saveTask({...blankDraft(),title:ideaTitle.trim(),status:'idea',triage:'later'},null);setIdeaTitle('');setAnnouncement('Idea saved without a deadline.');}
    catch(error){reportActionError(error);}finally{setIdeaBusy(false);}
  };
  const manualSync=async()=>{
    if(!online){await refresh({announce:true});return;}if(syncBusy)return;setSyncBusy(true);setActionError('');
    try{await api('/api/sync',{method:'POST',body:{},token:dataRef.current.csrfToken});await refresh({announce:true});}
    catch(error){reportActionError(error);}finally{setSyncBusy(false);}
  };
  const togglePause=async()=>{
    if(!canWrite)return;setSettingsBusy(true);setActionError('');const wasPaused=data.sync.paused;
    try{await api('/api/settings',{method:'POST',body:{paused:!wasPaused},token:dataRef.current.csrfToken});await refresh();setAnnouncement(wasPaused?'Conversation updates resumed.':'Conversation updates paused.');}
    catch(error){reportActionError(error);}finally{setSettingsBusy(false);}
  };
  const changeView=(next,selectedDomain='all')=>{if(next!=='stream'&&pendingRef.current&&!editingRef.current&&!toolsRef.current)applyState(pendingRef.current);setView(next);setQuery('');setDomain(selectedDomain);setProjectStatus('all');setProjectKey(null);setAnnouncement(`${VIEWS[next]} view.`);};
  const openTool=(tool='decision',task=null)=>{toolsRef.current=true;setToolRequest({isOpen:true,tool,task});};
  const closeTools=()=>{toolsRef.current=false;setToolRequest(previous=>({...previous,isOpen:false}));if(pendingRef.current&&viewRef.current!=='stream'&&!editingRef.current)applyState(pendingRef.current);};
  const showProject=group=>{changeView('projects',group.domain);setProjectKey(group.key);};
  const showLibrary=filter=>{changeView('library');setLibraryFilter(filter);};
  const sourceMap=useMemo(()=>new Map(data.sources.map(source=>[source.id,source])),[data.sources]);
  const searched=useMemo(()=>data.tasks.filter(task=>(domain==='all'||(task.domain||'Unsorted')===domain)&&matchesSearch(task,query,sourceMap)),[data.tasks,query,domain,sourceMap]);
  const globalSearch=Boolean(query.trim());
  const tracked=searched.filter(task=>dispositionOf(task)==='tracked');
  const active=tracked.filter(isOngoing);
  const focusTask=attentionOrder(active)[0];
  const remaining=active.filter(task=>task.id!==focusTask?.id&&task.status!=='waiting');
  const allOngoing=data.tasks.filter(isOngoing);
  const inbox=data.tasks.filter(task=>dispositionOf(task)==='inbox');
  const reference=data.tasks.filter(task=>dispositionOf(task)==='reference');
  const relevant=globalSearch?searched:view==='library'?searched.filter(task=>libraryFilter==='all'||dispositionOf(task)===libraryFilter):view==='ideas'?tracked.filter(task=>task.status==='idea'):view==='finished'?tracked.filter(task=>task.status==='done'):view==='projects'?active.filter(task=>(projectStatus==='all'||task.status===projectStatus)&&(!projectKey||JSON.stringify([task.domain||'Unsorted',task.project||''])===projectKey)):active;
  const domains=useMemo(()=>[...new Set(data.tasks.map(task=>task.domain||'Unsorted'))].sort((a,b)=>a.localeCompare(b)),[data.tasks]);
  const overview=useMemo(()=>projectOverview(data.tasks),[data.tasks]);
  const projectGroups=useMemo(()=>projectOverview(relevant),[relevant]);
  const groupProps={onOpen:openTask,onTriage,onSort:startSorting,onReturn,canWrite,busy:busyIds.size>0};
  const headings={home:'What matters today',stream:'Current',projects:'Projects',ideas:'Ideas',finished:'Finished',library:'Library'};
  useEffect(()=>{if(!globalSearch)return;const timer=setTimeout(()=>setAnnouncement(`${relevant.length} matching ${relevant.length===1?'item':'items'} across your saved work.`),350);return()=>clearTimeout(timer);},[globalSearch,query,relevant.length]);
  const connectionLabel=connection==='checking'?'Connecting…':online?'Mac connected':connection==='auth'?'Sign-in required':connection==='verification'?'Access check unavailable':'Mac disconnected';
  const syncDetails=<><div className="sync-description"><span className={`connection-indicator ${online?'online':'offline'}`}><Icon name={online?'check':'offline'}/>{connectionLabel}</span><span>{data.sync.inProgress?'Checking conversations…':data.sync.lastSuccess?`Conversations checked ${dateLabel(data.sync.lastSuccess,true)}`:'Conversations have not been checked yet.'}{data.sync.paused?' · updates paused':''}</span></div><div className="sync-actions"><ActionButton kind="quiet" onPress={manualSync} isDisabled={syncBusy||data.sync.inProgress}><Icon name="refresh"/>{syncBusy||data.sync.inProgress?'Refreshing…':online?'Refresh now':'Reconnect'}</ActionButton><ActionButton kind="quiet" onPress={togglePause} isDisabled={!canWrite||settingsBusy} aria-pressed={Boolean(data.sync.paused)}><Icon name={data.sync.paused?'play':'pause'}/>{data.sync.paused?'Resume updates':'Pause updates'}</ActionButton></div></>;
  const sortingInvite=<section className="sorting-invite" aria-label="Saved conversations to sort"><div><strong>{inbox.length?`${inbox.length} saved ${inbox.length===1?'conversation':'conversations'} to sort`:'Your inbox is clear'}</strong>{view!=='home'&&<p>{inbox.length?'Choose what to track or keep.':'New conversations will wait here.'}</p>}</div><div className="actions">{inbox.length>0&&<ActionButton kind="primary" onPress={()=>startSorting()} isDisabled={!canWrite||busyIds.size>0}>Sort a few</ActionButton>}{view!=='library'&&<ActionButton kind="quiet" onPress={()=>showLibrary('inbox')}>Open Library</ActionButton>}</div></section>;
  const overviewPanel=<section className="work-overview" aria-labelledby="work-overview-title"><div className="overview-heading"><div><h2 id="work-overview-title">Across your work</h2><p>{allOngoing.length} ongoing · {allOngoing.filter(task=>task.status==='waiting').length} waiting</p></div><ActionButton kind="quiet" onPress={()=>changeView('projects')}>View projects</ActionButton></div>{overview.length?<><ul className="overview-projects">{overview.slice(0,4).map(group=><li key={group.key}><Button onPress={()=>showProject(group)} aria-label={`View ${group.tasks.length} ongoing items in ${group.title}${group.project?`, ${group.domain}`:''}`}><span>{group.title}</span><span className="count">{group.tasks.length}</span></Button></li>)}</ul>{overview.length>4&&<details className="more-overview"><summary>{overview.length-4} more groups</summary><ul className="overview-projects">{overview.slice(4).map(group=><li key={group.key}><Button onPress={()=>showProject(group)}><span>{group.title}</span><span className="count">{group.tasks.length}</span></Button></li>)}</ul></details>}</>:<p className="overview-empty">Projects appear here as you choose work to track.</p>}</section>;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to your work</a>
    <header className="app-header"><div className="brand"><strong>Stillwater</strong></div><div className="header-actions"><details className="preferences"><summary aria-label="Display preferences"><Icon name="settings"/><span className="desktop-label">Display</span></summary><div className="preferences-panel"><SelectField label="Appearance" id="theme-preference" value={preferences.theme} onChange={theme=>setPreferences(previous=>({...previous,theme}))}><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></SelectField><SelectField label="Reading size" id="size-preference" value={preferences.readingSize} onChange={readingSize=>setPreferences(previous=>({...previous,readingSize}))}><option value="100">Standard</option><option value="112.5">Larger</option><option value="125">Largest</option></SelectField><label className="reflection-preference"><input type="checkbox" checked={preferences.showReflection!==false} onChange={event=>setPreferences(previous=>({...previous,showReflection:event.target.checked}))}/> Show a daily reflection</label></div></details><ActionButton aria-label="Add item" onPress={()=>{openedFromRef.current=document.activeElement;setAdding(true);setSelectedId(null);}} isDisabled={!canWrite}><Icon name="plus"/><span className="desktop-label">Add item</span><span className="mobile-label">Add</span></ActionButton></div></header>
    <nav className="main-nav" aria-label="Workspace views">{Object.entries(VIEWS).map(([id,label])=><Button key={id} className={`nav-button ${view===id?'selected':''}`} aria-pressed={view===id} onPress={()=>changeView(id)}><Icon name={{home:'home',stream:'layers',projects:'folders',ideas:'idea',finished:'check',library:'folders'}[id]}/>{label}</Button>)}<Button className="nav-button view-tools" onPress={()=>openTool()}><Icon name="settings"/>Tools</Button></nav>
    <div className="connection-bar desktop-sync">{syncDetails}</div>
    <details className="mobile-sync"><summary><span className="connection-indicator"><Icon name={online?'check':'offline'}/>{connectionLabel}</span><span>Connection & updates</span></summary><div className="mobile-sync-body">{syncDetails}</div></details>
    <main id="main-content" className="main-content" ref={mainRef} tabIndex={-1}>
      {!online&&(connection!=='checking'||snapshotAt)&&<div className="notice-banner" role="status"><strong>{connection==='auth'?'Sign in to refresh your workspace.':connection==='verification'?'Access verification is temporarily unavailable.':connection==='checking'?'Showing your last saved view.':'Your Mac is unavailable.'}</strong><p>{snapshotAt?<><span>Read-only view saved </span><time dateTime={snapshotAt}>{dateLabel(snapshotAt)}</time>. {connection==='checking'?'Checking for live updates.':connection==='auth'?'Sign in, then check the connection to load updates.':connection==='verification'?'Your Mac may still be online. Try again when the access check is available.':'Reconnect to save changes or read recent messages.'}</>:'No saved view is available on this device yet. Open the dashboard while signed in and your Mac is online to save one.'}</p>{connection==='auth'&&<div className="actions"><SignInLink/><ActionButton onPress={()=>refresh({announce:true})}>Check connection</ActionButton></div>}{connection!=='checking'&&<details><summary>Connection details</summary><p>{connectionError}</p></details>}</div>}
      {online&&data.sync.error&&<div className="notice-banner" role="status"><strong>Conversation updates need attention.</strong><p>{asString(data.sync.error)||'The last conversation check did not finish successfully.'}</p><p>Your saved task records remain available. Last successful check: {dateLabel(data.sync.lastSuccess)}.</p></div>}
      {pendingAvailable&&<div className="notice-inline" role="status">{view==='stream'&&!editing&&!toolRequest.isOpen?<ActionButton onPress={()=>{if(pendingRef.current)applyState(pendingRef.current);setAnnouncement('Stream updated.');}}>Show new updates</ActionButton>:<span>Updates will appear after you finish editing.</span>}</div>}
      {actionError&&<div className="error-banner" role="alert"><p>{actionError}</p><ActionButton kind="quiet" onPress={()=>setActionError('')}>Dismiss</ActionButton></div>}
      {toast&&!sortBatch&&<div className="toast"><p>{toast}</p><div className="actions">{undo&&<ActionButton ref={undoRef} kind="quiet" onPress={()=>undoChange(undo).catch(error=>setActionError(error.status===409?'This item changed again, so Undo was not applied. Open it to review the current state.':friendlyError(error)))} isDisabled={!canWrite||busyIds.has(undo.id)}>Undo</ActionButton>}<ActionButton kind="icon-button quiet" aria-label="Dismiss update message" onPress={()=>{setToast(null);setUndo(null);}}><Icon name="close"/></ActionButton></div></div>}
      <div className="page-heading"><div><h1>{globalSearch?'Search results':headings[view]}</h1></div><details className="filters-disclosure" open={filtersOpen} onToggle={event=>setFiltersOpen(event.currentTarget.open)}><summary>Search & filters <span>{globalSearch||domain!=='all'||projectStatus!=='all'?'Filters active':''}</span></summary><div className="filters"><TextField className="field search-field" value={query} onChange={setQuery}><Label>Search all saved work</Label><Input type="search" placeholder="Project, conversation, or next step"/></TextField><div className="filter-row"><SelectField label="Domain" id="domain-filter" value={domain} onChange={value=>{setDomain(value);setProjectKey(null);}}><option value="all">All domains</option>{domains.map(name=><option key={name} value={name}>{name}</option>)}</SelectField>{view==='projects'&&!globalSearch&&<SelectField label="Status" id="project-status-filter" value={projectStatus} onChange={setProjectStatus}><option value="all">All ongoing work</option><option value="active">Active</option><option value="waiting">Waiting</option></SelectField>}</div>{globalSearch&&<ActionButton kind="quiet" onPress={()=>setQuery('')}>Clear search</ActionButton>}</div></details></div>
      {connection==='checking'&&!data.tasks.length?<EmptyState title="Opening your workspace…">Connecting to the dashboard on your Mac.</EmptyState>:<>
        {view==='home'&&!globalSearch&&<>
          <div className="stillwater-layout"><div className="today-column">
            {focusTask?<section className="focus-item" aria-label="Next item for your attention"><TaskCard task={focusTask} compact {...groupProps}/><Fieldnotes task={focusTask} onTool={openTool}/></section>:<EmptyState title={domain!=='all'?'No work in this domain':'No decision waiting'}>{domain!=='all'?'Choose another domain to see more.':'Choose work from Library when you are ready.'}</EmptyState>}
            <TaskGroup title="Blocking progress" tasks={remaining.filter(task=>task.triage==='blocking')} compact {...groupProps}/>
            <TaskGroup title="Review next" tasks={remaining.filter(task=>task.triage==='review')} compact {...groupProps}/>
            <TaskGroup title="Ready to continue" tasks={remaining.filter(task=>task.triage==='ready')} compact {...groupProps}/>
            <TaskGroup title="Choose a next step" tasks={remaining.filter(task=>!['blocking','review','ready','later'].includes(task.triage))} compact {...groupProps}/>
            {active.some(task=>task.status==='waiting')&&<details className="later-section"><summary>Waiting <span className="count">{active.filter(task=>task.status==='waiting').length}</span></summary><TaskGroup title="Waiting" tasks={active.filter(task=>task.status==='waiting')} compact {...groupProps}/></details>}
            {remaining.some(task=>task.triage==='later')&&<details className="later-section"><summary>Set aside for later <span className="count">{remaining.filter(task=>task.triage==='later').length}</span></summary><TaskGroup title="Later" tasks={remaining.filter(task=>task.triage==='later')} compact {...groupProps}/></details>}
          </div><aside className="day-aside" aria-label="Your work at a glance">{overviewPanel}{sortingInvite}</aside></div>
          {preferences.showReflection!==false&&<DailyReflection/>}
        </>}
        {view==='stream'&&!globalSearch&&<CurrentStream tasks={searched} sources={data.sources} onOpen={openTask} onSort={startSorting} onTool={openTool} onAcknowledge={task=>acknowledge(task).catch(reportActionError)} canWrite={canWrite} busy={busyIds.size>0}/>}
        {view==='library'&&!globalSearch&&<>{sortingInvite}<div className="library-filters" role="group" aria-label="Library filters">{[['inbox','Needs sorting',inbox.length],['reference','Reference',reference.length],['all','All saved',data.tasks.length]].map(([value,label,count])=><Button key={value} className={`library-filter ${libraryFilter===value?'selected':''}`} aria-pressed={libraryFilter===value} onPress={()=>setLibraryFilter(value)}>{label} <span className="count">{count}</span></Button>)}</div><p className="library-description">{libraryFilter==='inbox'?'These conversations are saved, but their status and next steps have not been confirmed.':libraryFilter==='reference'?'Useful context you chose to keep without adding it to ongoing work.':'All retained records, including the work you track in other views.'}</p></>}
        {view==='ideas'&&!globalSearch&&<form className="capture-form" onSubmit={saveIdea}><TextField className="field" value={ideaTitle} onChange={setIdeaTitle} isDisabled={!canWrite} isRequired><Label>Capture an idea</Label><Input maxLength={8000} placeholder="Something to come back to"/></TextField><ActionButton type="submit" kind="primary" isDisabled={!canWrite||ideaBusy||!ideaTitle.trim()}><Icon name="plus"/>{ideaBusy?'Saving…':'Save idea'}</ActionButton></form>}
        {view==='projects'&&!globalSearch&&<><div className="project-overview-grid">{projectOverview(active).map(group=><Button key={group.key} className={`project-overview-card ${projectKey===group.key?'selected':''}`} onPress={()=>setProjectKey(projectKey===group.key?null:group.key)} aria-pressed={projectKey===group.key}><span className="domain-label">{group.project?group.domain:'Domain'}</span><strong>{group.title}</strong><span>{group.tasks.length} ongoing{group.waiting?` · ${group.waiting} waiting`:''}{group.blocking?` · ${group.blocking} blocking`:''}</span></Button>)}</div>{projectKey&&<div className="selected-project"><p>Showing one group.</p><ActionButton kind="quiet" onPress={()=>setProjectKey(null)}>Show all groups</ActionButton></div>}</>}
        {(globalSearch||!['home','stream'].includes(view))&&(!relevant.length?<EmptyState title={globalSearch||domain!=='all'?'No matching items':view==='finished'?'No finished items yet':view==='ideas'?'Space for your next idea':view==='library'&&libraryFilter==='reference'?'A place for useful context':view==='library'&&libraryFilter==='inbox'?'Nothing waiting to be sorted':'No ongoing work in this view'}>{globalSearch||domain!=='all'?'Try another search or domain.':view==='finished'?'Work you mark finished stays here.':view==='ideas'?'Capture an idea above without a deadline.':view==='library'&&libraryFilter==='reference'?'Keep useful context as reference when sorting.':view==='library'&&libraryFilter==='inbox'?'New conversations will wait here.':'Track an item from Library or add one.'}</EmptyState>:globalSearch?<TaskGroup title={`${relevant.length} matching ${relevant.length===1?'item':'items'}`} tasks={relevant} initialLimit={12} compact {...groupProps}/>:view==='projects'?projectGroups.map(group=><TaskGroup key={group.key} title={group.title} description={group.project?group.domain:undefined} tasks={group.tasks} initialLimit={6} compact {...groupProps}/>):<TaskGroup title={view==='ideas'?'Saved ideas':view==='finished'?'Completed work':libraryFilter==='inbox'?'Needs sorting':libraryFilter==='reference'?'Reference':'All saved items'} tasks={relevant} initialLimit={12} compact {...groupProps}/>)}</>}
    </main>
    <footer className="app-footer"><span>Stillwater · Stored on your Mac</span><details><summary>Sources & connection</summary><p>{typeof data.sync.coverage==='string'&&data.sync.coverage?data.sync.coverage:'Conversation coverage appears after synchronization.'}</p></details></footer>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {(adding||selected)&&<TaskDialog key={adding?'new':selected.id} task={selected} isNew={adding} sources={data.sources} online={online} canWrite={canWrite} onClose={closeDialog} onSave={saveTask} onEditingChange={editChanged} onAcknowledge={acknowledge} onQuickChange={quickChange} onSort={startSorting} connection={connection} onUnavailable={handleUnavailable}/>}
    <WorkspaceTools isOpen={toolRequest.isOpen} onClose={closeTools} initialTool={toolRequest.tool} task={toolRequest.task} online={online}/>
    {sortBatch&&<SortingDialog key={sortBatch.join(',')} ids={sortBatch} tasks={data.tasks} sources={data.sources} online={online} canWrite={canWrite} onClose={closeSorting} onClassify={changeWithUndo} onUndo={undoChange} onEditingChange={editChanged} connection={connection} onUnavailable={handleUnavailable}/>}
  </div>;
}
