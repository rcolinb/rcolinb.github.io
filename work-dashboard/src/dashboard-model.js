export const DISPOSITIONS = {inbox: 'Needs sorting', tracked: 'Tracked work', reference: 'Reference'};

export function dispositionOf(task) {
  return Object.hasOwn(DISPOSITIONS, task?.disposition) ? task.disposition : task?.verifiedAt ? 'tracked' : 'inbox';
}

export function isOngoing(task) {
  return dispositionOf(task) === 'tracked' && ['active', 'waiting'].includes(task.status);
}

export function shortTitle(value, limit = 160) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

export function displayFields(task) {
  // Returning a previously reviewed item to the inbox must retain the wording
  // the person already chose, even when an older suggestion is still attached.
  const suggestion = dispositionOf(task) === 'inbox' && !task.verifiedAt ? task.suggestion : null;
  return {
    title: suggestion?.title || (dispositionOf(task) === 'inbox' ? shortTitle(task.title) : task.title) || 'Untitled item',
    project: suggestion?.project || task.project || '',
    recap: suggestion?.recap || task.recap || '',
    nextAction: suggestion?.nextAction || task.nextAction || '',
    suggested: Boolean(suggestion)
  };
}

export function sortingDraft(task) {
  const fields = displayFields(task);
  return {title: shortTitle(fields.title), project: fields.project.slice(0, 200), recap: fields.recap.slice(0, 1000), nextAction: fields.nextAction.slice(0, 2000)};
}

export function classificationChanges(draft, choice) {
  const fields = {title: draft.title.trim(), project: draft.project.trim(), recap: draft.recap.trim(), nextAction: draft.nextAction.trim()};
  if (choice === 'reference') return {...fields, disposition: 'reference', status: 'active', triage: 'later'};
  if (choice === 'idea') return {...fields, disposition: 'tracked', status: 'idea', triage: 'later'};
  if (choice === 'done') return {...fields, disposition: 'tracked', status: 'done', triage: 'later'};
  return {...fields, disposition: 'tracked', status: 'active', triage: 'ready'};
}

export function previousFields(task, changes) {
  return Object.fromEntries(Object.keys(changes).map(key => [key, key === 'disposition' ? dispositionOf(task) : task[key] ?? '']));
}

export function makeBatch(tasks, firstId) {
  const eligible = tasks.filter(task => dispositionOf(task) === 'inbox').map(task => task.id);
  if (firstId) return eligible.includes(firstId) ? [firstId] : [];
  return eligible.slice(0, 5);
}

export function matchesSearch(task, query, sourceMap = new Map()) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return true;
  return [task.title, task.project, task.domain, task.recap, task.nextAction, task.priorityReason,
    task.suggestion?.title, task.suggestion?.project, task.suggestion?.recap, task.suggestion?.nextAction,
    ...(task.sourceIds || []).map(id => sourceMap.get(id)?.title || '')
  ].some(value => typeof value === 'string' && value.toLocaleLowerCase().includes(term));
}

export function projectOverview(tasks) {
  const groups = new Map();
  for (const task of tasks.filter(isOngoing)) {
    const domain = task.domain || 'Unsorted';
    const project = task.project || '';
    const key = JSON.stringify([domain, project]);
    if (!groups.has(key)) groups.set(key, {key, domain, project, title: project || domain, tasks: [], waiting: 0, blocking: 0});
    const group = groups.get(key);
    group.tasks.push(task);
    if (task.status === 'waiting') group.waiting += 1;
    if (task.triage === 'blocking') group.blocking += 1;
  }
  return [...groups.values()];
}

// Only small task/source metadata belongs in the offline view. Never store tokens,
// source messages, or the evidence excerpts attached to suggested drafts.
export function metadataSnapshot(data, savedAt = new Date().toISOString()) {
  const taskKeys = ['id', 'title', 'project', 'domain', 'disposition', 'recap', 'status', 'triage', 'nextAction', 'owner', 'priorityReason', 'sourceIds', 'createdAt', 'updatedAt', 'verifiedAt', 'hasNewActivity', 'revision'];
  const sourceKeys = ['id', 'title', 'summary', 'updatedAt', 'source', 'sourceUrl', 'runtimeStatus', 'sourceStatusNote'];
  const suggestionKeys = ['title', 'project', 'recap', 'nextAction', 'sourceId', 'sourceUpdatedAt', 'generatedAt', 'method', 'stale'];
  const pick = (object, keys) => Object.fromEntries(keys.filter(key => object?.[key] !== undefined).map(key => [key, object[key]]));
  return {
    tasks: (data.tasks || []).map(task => ({...pick(task, taskKeys), disposition: dispositionOf(task), ...(task.suggestion ? {suggestion: pick(task.suggestion, suggestionKeys)} : {})})),
    sources: (data.sources || []).map(source => pick(source, sourceKeys)),
    sync: {...data.sync}, savedAt
  };
}
