import React, {useEffect, useMemo, useState} from 'react';
import {Button} from 'react-aria-components';
import {currentEntries, displayFields, dispositionOf, isOngoing} from './dashboard-model.js';

const dateLabel = value => value ? new Intl.DateTimeFormat(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value)) : 'No date recorded';
const states = {active:'Active',waiting:'Waiting',idea:'Idea',done:'Finished'};
const attention = {blocking:'Blocking',review:'Review',ready:'Ready',later:'Later',untriaged:'Choose a next step'};

export function CurrentStream({tasks,sources,onOpen,onSort,onTool,onAcknowledge,canWrite,busy}) {
  const [includeLibrary,setIncludeLibrary]=useState(false),[attentionOnly,setAttentionOnly]=useState(false),[selectedId,setSelectedId]=useState(null),[limit,setLimit]=useState(30);
  const entries=useMemo(()=>currentEntries(tasks,sources,{includeLibrary,attentionOnly}),[tasks,sources,includeLibrary,attentionOnly]);
  useEffect(()=>setSelectedId(previous=>entries.some(entry=>entry.task.id===previous)?previous:entries[0]?.task.id||null),[entries]);
  const selected=entries.find(entry=>entry.task.id===selectedId)||entries[0];
  const fields=selected?displayFields(selected.task):null;
  const task=selected?.task;
  const disposition=task?dispositionOf(task):null;
  return <section aria-label="Current activity stream">
    <div className="stream-toolbar"><p className="subtle">Latest activity per item</p><div className="actions"><label><input type="checkbox" checked={attentionOnly} onChange={e=>setAttentionOnly(e.target.checked)}/> Review / blocking</label><label><input type="checkbox" checked={includeLibrary} onChange={e=>setIncludeLibrary(e.target.checked)}/> Include Library</label></div></div>
    {selected?<div className="current-layout"><a className="stream-jump" href="#current-context">Skip to selected item</a>
      <div className="current-feed" role="group" aria-label="Recent work" tabIndex={0}>
        {entries.slice(0,limit).map(({task:item,time})=><Button key={item.id} className="stream-entry" aria-pressed={item.id===task.id} aria-label={`Show activity: ${displayFields(item).title}`} onPress={()=>setSelectedId(item.id)}>
          <span className="stream-time">{dateLabel(time)}</span><span className="stream-title">{displayFields(item).title}</span><span className="stream-meta">{item.domain||'Unsorted'} · {dispositionOf(item)==='inbox'?'Needs sorting':dispositionOf(item)==='reference'?'Reference':states[item.status]||'Unspecified'}{item.hasNewActivity?' · Conversation updated':''}</span>
        </Button>)}
        {entries.length>limit&&<Button className="button quiet" onPress={()=>setLimit(value=>value+30)}>Show more</Button>}
      </div>
      <aside id="current-context" className="current-context" aria-label="Selected activity context" tabIndex={-1}>
        <div aria-live="polite"><p className="context-label">{disposition==='tracked'?states[task.status]:disposition==='inbox'?'Needs sorting':'Reference'}{isOngoing(task)?` · ${attention[task.triage]||'Unsorted'}`:''}</p><h2>{fields.title}</h2></div>
        <dl className="context-facts"><dt>{fields.suggested?'Suggested recap':'Context'}</dt><dd>{fields.recap||'No recap recorded.'}</dd>{task.priorityReason&&<><dt>Why here</dt><dd>{task.priorityReason}</dd></>}<dt>{fields.suggested?'Suggested next step':'Next step'}</dt><dd>{fields.nextAction||'No next step recorded.'}</dd><dt>Last activity</dt><dd>{dateLabel(selected.time)}</dd></dl>
        {fields.suggested&&<p className="subtle">Unconfirmed suggestion{task.suggestion?.stale?' · source has changed':''}.</p>}
        <div className="actions"><Button className="button primary" onPress={()=>onOpen(task.id)}>Open context</Button>{disposition==='inbox'?<Button className="button" isDisabled={!canWrite||busy} onPress={()=>onSort(task.id)}>Sort this</Button>:<Button className="button quiet" onPress={()=>onTool('decision',task)}>Think it through</Button>}</div>
        {task.hasNewActivity&&disposition==='tracked'&&<Button className="button quiet" isDisabled={!canWrite||busy} onPress={()=>onAcknowledge(task)}>Mark update reviewed</Button>}
        <p className="stream-footnote">Activity does not establish completion.</p>
      </aside>
    </div>:<div className="stream-empty"><h2>No items in this view</h2><p>Include Library or clear the attention filter.</p></div>}
  </section>;
}

export function Fieldnotes({task,onTool}) {
  return <details className="fieldnotes"><summary>A way in</summary><p>What would help?</p><div className="fieldnotes-actions"><Button className="button quiet" onPress={()=>onTool('decision',task)}>Clarify a decision</Button><Button className="button quiet" onPress={()=>onTool('communication',task)}>Find the words</Button><Button className="button quiet" onPress={()=>onTool('presentation',task)}>Shape a lesson</Button></div></details>;
}

const reflections=[
  {text:'Drop by drop is the water pot filled.',author:'Dhammapada 122',credit:'Buddharakkhita, trans.',url:'https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.09.budd.html'},
  {text:'The world is renewed every moment',author:'Rumi, Masnavi I:1144',credit:'Gamard, trans.; excerpt',url:'https://www.dar-al-masnavi.org/n.a-I-1121.html'},
  {text:'Pay attention to what is important, not just what is quantifiable.',author:'Donella Meadows',credit:'Dancing With Systems, §8',url:'https://donellameadows.org/archives/dancing-with-systems/'}
];
export function DailyReflection() {
  // Stable during a visit. No rotating text or animation while someone is reading.
  const [reflection]=useState(()=>{const day=new Date();return reflections[Math.floor(Date.UTC(day.getFullYear(),day.getMonth(),day.getDate())/86400000)%reflections.length];});
  return <figure className="daily-reflection"><blockquote>{reflection.text}</blockquote><figcaption><a href={reflection.url} target="_blank" rel="noopener noreferrer">{reflection.author}</a><span> · {reflection.credit}</span></figcaption></figure>;
}
