import React, {useEffect, useId, useRef, useState} from 'react';
import {Button, ModalOverlay, Modal, Dialog, Heading} from 'react-aria-components';
import {TOOL_DEFINITIONS, AUDIENCES, AUDIENCE_FIELDS, createWorksheet, ensureWorksheet, updateWorksheetField, updateWorksheetResult, resultNeedsRefresh, optionLines, buildWorksheet, applyBuiltWorksheet} from './workspace-tools.js';
import './workspace-tools.css';

function Field({name,label,value,onChange,error,multiline=false,options,type='text',min,max,maxLength=4000}) {
  const id=useId();
  const props={id,name,value,onChange:event=>onChange(name,event.target.value),'aria-invalid':Boolean(error),'aria-describedby':error?`${id}-error`:undefined};
  return <div className="wt-field"><label htmlFor={id}>{label}</label>{options?<select {...props}>{Object.entries(options).map(([key,text])=><option key={key} value={key}>{text}</option>)}</select>:multiline?<textarea {...props} maxLength={maxLength} rows={3}/>:<input {...props} type={type} min={min} max={max} maxLength={maxLength}/>} {error&&<span id={`${id}-error`} className="wt-error">{error}</span>}</div>;
}

export default function WorkspaceTools({isOpen,onClose,initialTool='decision',task=null,online=true}) {
  const initial=TOOL_DEFINITIONS[initialTool]?initialTool:'decision';
  const [tool,setTool]=useState(initial);
  const [worksheets,setWorksheets]=useState(()=>isOpen?ensureWorksheet({},initial,task):{});
  const [errors,setErrors]=useState({});
  const [notice,setNotice]=useState('');
  const [confirmation,setConfirmation]=useState(null);
  const wasOpen=useRef(false), formRef=useRef(null), resultRef=useRef(null), headingId=useId();
  useEffect(()=>{
    if(isOpen&&!wasOpen.current){setTool(initial);setWorksheets(old=>ensureWorksheet(old,initial,task));setErrors({});setNotice('');setConfirmation(null);}
    wasOpen.current=isOpen;
  },[isOpen,initial,task]);
  const sheet=worksheets[tool]||createWorksheet(tool,task), fields=sheet.fields, definition=TOOL_DEFINITIONS[tool];
  const change=(name,value)=>{
    setWorksheets(old=>({...old,[tool]:updateWorksheetField(old[tool]||sheet,name,value)}));
    setErrors(old=>{const next={...old};delete next[name];return next;});setNotice('');
  };
  const field=(name,label,extra={})=><Field key={name} name={name} label={label} value={fields[name]??''} onChange={change} error={errors[name]} {...extra}/>;
  const switchTool=next=>{
    setWorksheets(old=>ensureWorksheet(old,next,task));setTool(next);setErrors({});setNotice('Your worksheet is kept when you switch tools.');setConfirmation(null);
  };
  const generate=()=>{
    const built=buildWorksheet(tool,fields);
    if(Object.keys(built.errors).length){setErrors(built.errors);setNotice('Complete the marked fields.');requestAnimationFrame(()=>formRef.current?.querySelector('[aria-invalid="true"]')?.focus());return;}
    setWorksheets(old=>({...old,[tool]:applyBuiltWorksheet(old[tool]||sheet,built.result)}));
    setErrors({});setConfirmation(null);setNotice('Structured draft ready. Review and edit it below.');
    requestAnimationFrame(()=>resultRef.current?.focus());
  };
  const requestGenerate=event=>{event.preventDefault();if(sheet.resultEdited){setConfirmation('replace');return;}generate();};
  const reset=()=>{setWorksheets(old=>({...old,[tool]:createWorksheet(tool,task)}));setErrors({});setConfirmation(null);setNotice('New worksheet started.');requestAnimationFrame(()=>formRef.current?.querySelector('input,textarea,select')?.focus());};
  const copy=async()=>{
    try{
      if(!globalThis.navigator?.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(sheet.result);setNotice('Copied. Nothing was sent.');
    }catch{resultRef.current?.focus();resultRef.current?.select();setNotice('Copy is unavailable here. The result is selected so you can copy it yourself.');}
  };
  const close=()=>{setConfirmation(null);onClose();};
  const a=AUDIENCE_FIELDS[fields.audience]||AUDIENCE_FIELDS.peer;
  let inputs;
  if(tool==='decision') inputs=<>{field('question','Decision',{multiline:true})}{field('options','Options · one per line',{multiline:true})}{field('reversibility','How reversible?',{options:{easy:'Easy to change after a trial',hard:'Hard to reverse or consequential',unknown:'Not sure yet'}})}{field('nextStep','Your proposed next step',{multiline:true})}<details className="wt-details"><summary>What matters & what is missing</summary>{field('matters','What matters most',{multiline:true})}{field('missing','Still unknown',{multiline:true})}{field('review','When to return to this')}</details></>;
  else if(tool==='communication') inputs=<>{field('audience','Who is this for?',{options:AUDIENCES})}{field('purpose',a.purpose,{multiline:true})}{field('facts',a.facts,{multiline:true})}{field('request',a.request,{multiline:true})}<details className="wt-details"><summary>Tone & supporting details</summary>{field('recipient','Name, if useful',{maxLength:200})}{field('tone','Tone',{options:{plain:'Plain',warm:'Warm'}})}{field('view',a.view,{multiline:true})}{field('outcome',a.outcome,{multiline:true})}{field('uncertainty','What is not yet confirmed',{multiline:true})}</details></>;
  else if(tool==='presentation') inputs=<>{field('title','Working title')}{field('audience','Audience',{options:{students:'Students',faculty:'Faculty',leadership:'Leadership'}})}{field('objective','What should they be able to do?',{multiline:true})}{field('message','One main message',{multiline:true})}{field('minutes','Minutes',{type:'number',min:5,max:240})}<details className="wt-details"><summary>Example & participation</summary>{field('evidence','Example, visual, or supporting evidence',{multiline:true})}{field('practice','What will the audience do?',{multiline:true})}</details></>;
  else if(tool==='question') inputs=<>{field('objective','Learning objective',{multiline:true})}{field('stem','Scenario',{multiline:true})}{field('leadIn','Question / lead-in',{multiline:true})}{field('options','Answer options · one per line, without letters',{multiline:true})}{field('key','Proposed key',{options:{'':'Choose an answer',...Object.fromEntries(optionLines(fields.options).slice(0,8).map((text,i)=>[String.fromCharCode(65+i),`${String.fromCharCode(65+i)} · ${text.slice(0,65)}${text.length>65?'…':''}`]))}})}{field('rationale','Why is that answer best?',{multiline:true})}{fields.title&&<p className="wt-note">Working title: {fields.title}</p>}</>;
  else inputs=<>{field('mode','Method',{options:{pdsa:'PDSA · a small test',dmaic:'DMAIC · a recurring measured problem'}})}{field('problem','What keeps happening?',{multiline:true})}{field('change',fields.mode==='pdsa'?'One change to try':'Candidate change, if known',{multiline:true})}{field('measure','What will you observe?',{multiline:true})}<details className="wt-details"><summary>Prediction, baseline & review</summary>{field('scope','Where or with whom?')}{field('baseline','What happens now?')}{field('prediction','What do you expect?')}{field('cause','Suspected cause · not yet established')}{field('review','When and with whom will you review?')}</details></>;

  return <ModalOverlay className="wt-overlay" isOpen={isOpen} onOpenChange={open=>{if(!open)close();}} isDismissable><Modal className="wt-modal"><Dialog className="wt-dialog" aria-labelledby={headingId}>
    <header className="wt-header"><div><Heading id={headingId} slot="title">Tools</Heading></div><Button className="wt-close" onPress={close} aria-label="Close workspace tools">Close</Button></header>
    <div className="wt-toolbar"><label>Worksheet <select value={tool} onChange={event=>switchTool(event.target.value)}>{Object.entries(TOOL_DEFINITIONS).map(([id,entry])=><option key={id} value={id}>{entry.label}</option>)}</select></label><Button className="wt-text-button" onPress={()=>setConfirmation('reset')}>Start new</Button></div>
    <p className="wt-note">Worksheets stay in this tab. Copy what you want to keep.{!online?' These tools also work offline.':''}</p>
    {sheet.sourceTitle&&<p className="wt-note">Started from: {sheet.sourceTitle}{task?.title&&task.title!==sheet.sourceTitle?' · Start new to use the current item.':''}</p>}
    {confirmation&&<div className="wt-confirm" role="alert"><p>{confirmation==='reset'?'Start over with a new worksheet? Your current fields and result will be replaced.':'Replace your edited result with a new structured draft?'}</p><div><Button className="wt-button" onPress={()=>setConfirmation(null)} autoFocus>Keep current</Button><Button className="wt-button" onPress={confirmation==='reset'?reset:generate}>{confirmation==='reset'?'Start new':'Replace result'}</Button></div></div>}
    <div className="wt-layout"><form ref={formRef} onSubmit={requestGenerate} noValidate className="wt-form">{inputs}<Button type="submit" className="wt-button wt-primary">{definition.action}</Button></form><section className="wt-result-section" aria-label="Structured draft"><div className="wt-result-heading"><h3>Structured draft</h3><Button className="wt-text-button" onPress={copy} isDisabled={!sheet.result}>Copy result</Button></div><label className="wt-result-label" htmlFor={`${headingId}-result`}>Review and edit</label><textarea ref={resultRef} id={`${headingId}-result`} className="wt-result" value={sheet.result} onChange={event=>{setWorksheets(old=>({...old,[tool]:updateWorksheetResult(old[tool]||sheet,event.target.value)}));setNotice('');}} placeholder="Your outline or draft will appear here." rows={14}/><p className="wt-note">Built from your entries. Review before using.</p>{resultNeedsRefresh(sheet)&&<p className="wt-note wt-stale">Fields changed. The result still reflects your earlier entries.</p>}</section></div>
    <p role="status" aria-live="polite" className="wt-status">{notice}</p>
    <details className="wt-sources"><summary>About this structure</summary><p>{definition.sourceNote}</p><ul>{definition.sources.map(([label,url])=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{label}<span className="wt-sr-only"> (opens in a new tab)</span></a></li>)}</ul></details>
  </Dialog></Modal></ModalOverlay>;
}
