// Deterministic worksheets. These functions make no network calls or judgments
// about clinical correctness, priority, permission, or completion.
export const TOOL_DEFINITIONS = {
  decision: {label: 'Choose a next step', action: 'Build decision note', sourceNote: 'Our decision prompt. PDSA supports a small test; it does not rank personal priorities.', sources: [['IHI: testing changes', 'https://www.ihi.org/library/model-for-improvement/testing-changes']]},
  communication: {label: 'Write with care', action: 'Shape draft', sourceNote: 'Leadership uses an SBAR adaptation; peer tension uses DESC; student clarification adapts teach-back. Social prompts are our own. Skip a structure when a simple message is enough.', sources: [['AHRQ: SBAR', 'https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/sbar.html'], ['AHRQ: DESC', 'https://www.ahrq.gov/teamstepps-program/curriculum/mutual/tools/desc.html'], ['AHRQ: teach-back', 'https://www.ahrq.gov/health-literacy/improve/precautions/tool5.html']]},
  presentation: {label: 'Shape a teaching moment', action: 'Build outline', sourceNote: 'Our planning adaptation of the CDC audience, main-message, and action guidance. The pacing is a starting point, not a required slide formula.', sources: [['CDC: main message', 'https://www.cdc.gov/ccindex/tool/page-1.html']]},
  question: {label: 'Review a question', action: 'Prepare review', sourceNote: 'NBME-informed prompts for one-best-answer items. Wording checks cannot certify accuracy, fairness, or difficulty. Use another format for observed performance.', sources: [['NBME: item-writing guide', 'https://www.nbme.org/institutions/nbme-item-writing-guide/']]},
  improvement: {label: 'Improve a recurring process', action: 'Build learning plan', sourceNote: 'PDSA plans a small learning cycle. DMAIC is for a recurring process with measurable performance; it is usually too much structure for a one-off task.', sources: [['IHI: PDSA', 'https://www.ihi.org/library/model-for-improvement/testing-changes'], ['ASQ: DMAIC', 'https://asq.org/quality-resources/dmaic']]},
};

export const AUDIENCES = {peer: 'Faculty peer', leadership: 'Dean / leadership', student: 'Student', friend: 'Friend', acquaintance: 'Acquaintance', networking: 'Professional connection'};
export const AUDIENCE_FIELDS = {
  peer: {purpose: 'Shared aim', facts: 'What happened, without assigning intent', view: 'Your concern or its effect', request: 'Proposed agreement', outcome: 'How that would help'},
  leadership: {purpose: 'Situation or decision needed', facts: 'Relevant background', view: 'Your assessment', request: 'Recommendation or request', outcome: 'Expected benefit or tradeoff'},
  student: {purpose: 'What you want to clarify', facts: 'Relevant feedback or example', view: 'Why this step matters', request: 'One next step', outcome: 'What a useful revision would show'},
  friend: {purpose: 'What you want to say', facts: 'A personal detail or shared moment', view: 'Anything else you want to share', request: 'Invitation, if any', outcome: 'Optional closing thought'},
  acquaintance: {purpose: 'Reason to reconnect', facts: 'Where you met or what you discussed', view: 'What stayed with you', request: 'Invitation, if any', outcome: 'Optional closing thought'},
  networking: {purpose: 'Why you are reaching out', facts: 'Specific connection to their work', view: 'Your relevant context', request: 'A small, clear request', outcome: 'Optional closing thought'},
};

const clean = value => typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
const join = (...parts) => parts.filter(Boolean).join('\n\n');
const line = (label, value, fallback = '') => clean(value) ? `${label}: ${clean(value)}` : fallback;
export function optionLines(value) { return clean(value).split(/\r?\n/).map(s => s.trim()).filter(Boolean); }

export function createWorksheet(tool, task = null) {
  const title = clean(task?.title), next = clean(task?.nextAction);
  const defaults = {
    decision: {question: title, options: '', matters: '', reversibility: 'unknown', nextStep: next, missing: '', review: ''},
    communication: {audience: 'peer', recipient: '', purpose: title, facts: '', view: '', request: next, outcome: '', uncertainty: '', tone: 'plain'},
    presentation: {title, audience: 'students', objective: '', message: '', evidence: '', practice: '', minutes: '35'},
    question: {title, objective: '', stem: '', leadIn: '', options: '', key: '', rationale: ''},
    improvement: {mode: 'pdsa', problem: title, change: next, measure: '', baseline: '', scope: 'One small batch', prediction: '', cause: '', review: ''},
  };
  if (!defaults[tool]) throw new Error('Unknown worksheet.');
  return {fields: defaults[tool], result: '', resultEdited: false, builtFields: null, sourceTitle: title};
}

// Opening or switching never replaces an existing worksheet, including its edits.
export function ensureWorksheet(worksheets, tool, task = null) {
  return worksheets[tool] ? worksheets : {...worksheets, [tool]: createWorksheet(tool, task)};
}
export function updateWorksheetField(sheet, name, value) {
  if (!Object.hasOwn(sheet.fields, name)) return sheet;
  return {...sheet, fields: {...sheet.fields, [name]: value}};
}
export function updateWorksheetResult(sheet, result) { return {...sheet, result, resultEdited: true}; }
export function resultNeedsRefresh(sheet) { return Boolean(sheet.result && sheet.builtFields && JSON.stringify(sheet.fields) !== sheet.builtFields); }

function required(fields, entries) {
  return Object.fromEntries(entries.filter(([name]) => !clean(fields[name])).map(([name, label]) => [name, `Add ${label}.`]));
}
export function validateWorksheet(tool, f) {
  let errors = {};
  if (tool === 'decision') {
    errors = required(f, [['question', 'the decision'], ['options', 'at least one option']]);
    if (!['easy', 'hard', 'unknown'].includes(f.reversibility)) errors.reversibility = 'Choose how reversible this is.';
  } else if (tool === 'communication') {
    errors = required(f, [['purpose', 'the purpose']]);
    if (!AUDIENCES[f.audience]) errors.audience = 'Choose a recipient type.';
    if (!['plain', 'warm'].includes(f.tone)) errors.tone = 'Choose a tone.';
  } else if (tool === 'presentation') {
    errors = required(f, [['objective', 'the learning or decision objective'], ['message', 'one main message']]);
    if (!Number.isInteger(Number(f.minutes)) || Number(f.minutes) < 5 || Number(f.minutes) > 240) errors.minutes = 'Use 5–240 whole minutes.';
    if (!['students', 'faculty', 'leadership'].includes(f.audience)) errors.audience = 'Choose an audience.';
  } else if (tool === 'question') {
    errors = required(f, [['objective', 'the objective'], ['stem', 'the scenario'], ['leadIn', 'the question'], ['rationale', 'the key rationale']]);
    const options = optionLines(f.options);
    if (options.length < 2 || options.length > 8) errors.options = 'Use 2–8 options, one per line.';
    const keyIndex = clean(f.key).toUpperCase().charCodeAt(0) - 65;
    if (clean(f.key).length !== 1 || !Number.isInteger(keyIndex) || keyIndex < 0 || keyIndex >= options.length) errors.key = 'Choose an answer from the current options.';
  } else if (tool === 'improvement') {
    errors = required(f, [['problem', 'the recurring problem'], ['measure', 'what you will observe']]);
    if (f.mode === 'pdsa') Object.assign(errors, required(f, [['change', 'one change to try']]));
    if (!['pdsa', 'dmaic'].includes(f.mode)) errors.mode = 'Choose a learning method.';
  } else errors.tool = 'Choose a worksheet.';
  return errors;
}

function decisionResult(f) {
  const modes = {
    easy: 'A small trial may be appropriate. Choose it yourself; the options below are not ranked.',
    hard: 'Pause before committing. Review the consequences, evidence, and people affected; reversibility alone does not establish safety.',
    unknown: 'Clarify what is missing before treating this as a reversible choice. Waiting remains an option.',
  };
  const nextLabel = f.reversibility === 'hard' ? 'Proposed next step, pending review' : f.reversibility === 'unknown' ? 'Interim step you entered' : 'Next step you entered';
  return join(`Decision: ${clean(f.question)}`, line('What matters', f.matters), `Options, in your order:\n${optionLines(f.options).map((s,i) => `${i+1}. ${s}`).join('\n')}`, modes[f.reversibility], line('Still unknown', f.missing, 'Still unknown: [record what could change the choice]'), line(nextLabel, f.nextStep, 'No next step chosen. Select one, gather information, or leave this for later.'), line('Return to this', f.review, 'Review point: [choose a useful moment, if needed]'));
}

function communicationResult(f) {
  const greeting = clean(f.recipient) ? `${f.tone === 'warm' || f.audience === 'friend' ? 'Hi' : 'Hello'} ${clean(f.recipient)},` : '';
  const purpose = clean(f.purpose), facts = clean(f.facts), view = clean(f.view), request = clean(f.request), outcome = clean(f.outcome);
  let body;
  if (f.audience === 'leadership') {
    body = join(purpose, facts, view && `My assessment: ${view}`, line('Still to confirm', f.uncertainty), request ? `Requested next step: ${request}` : 'Requested decision: [add what you need, and when if relevant]', outcome);
  } else if (f.audience === 'peer') {
    body = join(purpose, facts, view && `My concern: ${view}`, request ? `Could we agree on this next step? ${request}` : '', outcome, line('Still to confirm', f.uncertainty));
  } else if (f.audience === 'student') {
    body = join(purpose, facts, view, request && `For now: ${request}`, outcome, line('Still to clarify', f.uncertainty), request ? 'To check that my directions are clear, how will you approach that next step in your own words?' : 'What part would be most useful for us to clarify together?');
  } else if (f.audience === 'acquaintance') {
    // Shared context comes first when the recipient may need a reminder.
    body = join(facts, purpose, view, request, outcome, line('One thing I am still unsure about', f.uncertainty));
  } else if (f.audience === 'networking') {
    // Keep relevance beside a bounded ask, without inventing familiarity.
    body = join(purpose, join(facts, view).replace(/\n\n/g,'\n'), request, outcome, line('Still to confirm', f.uncertainty));
  } else {
    body = join(purpose, facts, view, request, outcome, line('One thing I am still unsure about', f.uncertainty));
  }
  const closing = f.tone === 'warm' ? (['friend','acquaintance'].includes(f.audience) ? 'It would be good to hear from you when you have some space.' : 'Thank you for taking a look.') : '';
  return join(greeting, body, closing);
}

export function allocateMinutes(total, weights) {
  const raw = weights.map(weight => total * weight / weights.reduce((a,b) => a+b, 0));
  const result = raw.map(Math.floor);
  const order = raw.map((n,i) => ({i,remainder:n-result[i]})).sort((a,b) => b.remainder-a.remainder || a.i-b.i);
  for (let left=total-result.reduce((a,b)=>a+b,0), i=0; i<left; i++) result[order[i%order.length].i]++;
  return result;
}

function presentationResult(f) {
  const total=Number(f.minutes), leadership=f.audience==='leadership';
  const audience={students:'Students',faculty:'Faculty',leadership:'Leadership'}[f.audience];
  const evidence=clean(f.evidence)||'[add one example, visual, or supporting source]';
  const practice=clean(f.practice)||(leadership?'Ask which option fits the objective and what remains uncertain.':'Ask the audience to apply the main message to a second example.');
  const stages=total<=10 ? [['Open',`Name the aim: ${clean(f.objective)}`], [leadership?'Compare':'Explain',`${clean(f.message)}\n   Support: ${evidence}`], [leadership?'Decide':'Apply',practice]] : [['Orient',`Name the aim: ${clean(f.objective)}`], ['Explain',clean(f.message)], [leadership?'Examine the evidence':'Work through an example',evidence], [leadership?'Discuss the choice':'Practice',practice], ['Close',`Return to: ${clean(f.message)}`]];
  const times=allocateMinutes(total,total<=10?[2,5,3]:[15,25,25,25,10]);
  return join(clean(f.title), `${audience} · ${total} minutes`, `Aim: ${clean(f.objective)}`, `Main message: ${clean(f.message)}`, stages.map(([name,content],i)=>`${times[i]} min · ${name}\n${content}`).join('\n\n'), 'Before presenting: verify the evidence, choose a readable visual, and leave room for a response.');
}

function questionResult(f) {
  const options=optionLines(f.options), key=clean(f.key).toUpperCase(), flags=[];
  if (/\b(except|not|least|incorrect|false)\b/i.test(f.leadIn)) flags.push('Review the negative wording in the lead-in; can the decision be asked positively?');
  if (options.some(x=>/\b(all|none) of the above\b/i.test(x))) flags.push('Review “all/none of the above”; explicit alternatives make the decision clearer.');
  if (new Set(options.map(s=>s.toLowerCase())).size!==options.length) flags.push('Two options repeat the same wording. Make each alternative distinct.');
  const lengths=options.map(s=>s.length).sort((a,b)=>a-b), median=lengths[Math.floor(lengths.length/2)];
  if (options[key.charCodeAt(0)-65].length>Math.max(80,median*1.8)) flags.push('The keyed option is much longer than typical alternatives; check for a length cue.');
  const review=flags.length?flags.map(s=>`• ${s}`).join('\n'):'No selected wording flags detected. This is not a quality or accuracy judgment.';
  return join(clean(f.title), `Objective: ${clean(f.objective)}`, clean(f.stem), clean(f.leadIn), options.map((text,i)=>`${String.fromCharCode(65+i)}. ${text}`).join('\n'), `Proposed key: ${key}\nYour rationale: ${clean(f.rationale)}`, `Wording review\n${review}`, 'Human review\n• Cover the options: is the applied decision clear?\n• Is one answer best, with plausible alternatives of the same kind?\n• Verify the key and rationale against current subject-matter evidence.\n• Check relevance, accessibility, and stereotypes in the scenario.\nDifficulty and discrimination require learner response data.');
}

function improvementResult(f) {
  const problem=clean(f.problem), measure=clean(f.measure), baseline=clean(f.baseline)||'[record before testing]', scope=clean(f.scope)||'[choose a bounded setting]', review=clean(f.review)||'[choose a review point]';
  const change=clean(f.change), prediction=clean(f.prediction), cause=clean(f.cause);
  if(f.mode==='dmaic') return join('DMAIC · proposed improvement work', `Define\nProblem: ${problem}\nScope: ${scope}`, `Measure\nObserve: ${measure}\nBaseline: ${baseline}`, `Analyze\nHypothesis, not established cause: ${cause||'[investigate before selecting a solution]'}`, `Improve\nCandidate change: ${change||'[choose after analysis]'}${prediction?`\nPrediction to test: ${prediction}`:''}`, `Control\nReview: ${review}\nMonitor ${measure}; agree who responds if performance changes.`, 'This plan records no completed test or proven improvement.');
  return join('PDSA · one planned learning cycle', `Plan\nProblem: ${problem}\nChange: ${change}\nScope: ${scope}\nPrediction: ${prediction||'[state what you expect to observe]'}\nObserve: ${measure}\nBaseline: ${baseline}${cause?`\nWorking hypothesis: ${cause}`:''}`, `Do\nTry ${change}\nRecord what happened, including unexpected effects.`, `Study\nCompare ${measure} with the baseline and prediction. Record effects on quality as well as effort.`, `Act\nReview: ${review}\nUse the observations to keep, adapt, or stop the change.`, 'This is a test plan. Results and improvement have not been established.');
}

export function buildWorksheet(tool, fields) {
  const errors=validateWorksheet(tool,fields);
  if(Object.keys(errors).length) return {errors, result:''};
  const builders={decision:decisionResult,communication:communicationResult,presentation:presentationResult,question:questionResult,improvement:improvementResult};
  return {errors:{},result:builders[tool](fields)};
}

export function applyBuiltWorksheet(sheet, result) {
  return {...sheet,result,resultEdited:false,builtFields:JSON.stringify(sheet.fields)};
}
