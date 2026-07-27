# Cardiac Cycle & ECG Simulator

An interactive teaching simulator that links the cardiac cycle, the conduction system and the
electrocardiogram, built for prelicensure nursing and health-professional students (NR324 Adult
Health I context).

**Two modes.** *Basic* is a single rhythm lead for introductory students. *Advanced* adds the
synchronised 12-lead view, structural conditions, separate systemic and pulmonary loading, and the
QRS axis.

## Using it

The whole thing is one self-contained HTML file: `index.html`. No install, no server, no network
access after it loads.

- **Hosted:** `https://rcolinb.github.io/cardiac/`
- **Shared as a file:** send `index.html` to students. Double-clicking it works — it runs from
  `file://` as well as over HTTP.
- **Deep links:** `?mode=advanced&rhythm=af&condition=hyperkalemia&lead=V1&focus=conduction&seed=4182`
  — "Copy link to this view" in the About box builds one for whatever is on screen.
  `?fresh=1` ignores anything this machine has remembered, which is what you want on a lectern.

**Two display presets, not two modes.** `Study` keeps labels off (hover names a structure on demand)
and the teaching panel open. `Presenting` turns on classroom text size, pins the label set to
whatever the focus mode is showing, and collapses the panel. Both only write settings that already
existed as their own controls, so anything a preset sets can be changed afterwards and the change
holds. This is deliberately not a second mode axis — `Basic`/`Advanced` is a *learner level*, this is
a *context*, and crossing them would give four states to design and test instead of two of each.

Keyboard: space plays and pauses, arrow keys step event by event, `R` restarts at the teaching start
point, `1`–`5` switch focus modes, `L` toggles the 12-lead view.

**Click the heart.** Hovering a structure names it; clicking asks what it is and what it is doing at
the instant you paused on. The second half is generated from the frame rather than authored, so the
words cannot drift out of step with the drawing. Clicking a structure also highlights the stretch of
tracing its activity appears in — the reverse of clicking a wave and watching the heart light up.
Click the AV node and the PR segment lights: the causal claim is walkable in both directions.

The heart takes one tab stop and arrow keys move between structures, which is also the first
assistive-technology route into the illustration.

**Click the tracing.** Hovering the rhythm strip or the magnified complex outlines the wave under the
pointer; clicking it pauses there, spotlights what the heart is doing at that instant, and explains
the wave beside it. The clickable parts include the stretches *between* waves — clicking the flat ST
segment is how a student finds out it is when ejection happens, and clicking the PR segment is how
they find out the flat line is the AV delay the atrial kick fits into.

## What it remembers

Theme, text size and display preset, on that computer. Nothing else — no quiz answers, no challenge
scores, no lesson progress. Those last only while the page is open, which is the right call for a
tool that runs on shared classroom and library machines: inheriting the previous student's score is
a privacy problem and a confusion problem, and it buys nobody anything. Nothing is sent anywhere,
and "Reset saved settings" in the About box clears what little there is.

A shared link overrides the local preset for that session but never overwrites it, so following a
student's link on a lectern laptop does not silently undo the projection setup. Storage access is
guarded throughout: `localStorage` throws on a `file://` origin in some browsers, and this ships as
a file people open from disk.

## Starting from nothing

**Start here** in the top bar opens a three-part walkthrough written for someone who has never seen an
ECG and has never used this page. It teaches the tool first — what the three panels are, that time
only moves when you say so, that everything is clickable — and only then the beat. Five of its
nineteen steps will not let you continue until you have actually done the thing: found the P wave,
clicked the mitral valve, pressed the step button. Each of those has a **Show me where** button
available from the first frame, which unlocks the step and records that you were shown rather than
that you found it, because a student stuck in front of a class is a worse outcome than one who
accepted help.

`?tour=1` opens straight into step one, so a class can be handed a single link.

**Defined terms are linkified wherever they appear.** The glossary is written once and matched against
rendered prose, so adding an entry makes it clickable in every sequence retroactively — including the
five that existed before it. That mattered more than it sounds: `pump-consequences` opened on
*"Diastole shortens far more than systole as rate climbs"* and neither word was defined anywhere in
the product.

A definition is read as authoritative and read out of context, which makes the glossary the one place
where the framing that protects the honesty rules elsewhere is absent. So nothing electrical is
described in mechanical words, and "pulse" says it is *felt* — a beginner's default model is that a
line on the screen means alive, and that is the model the whole walkthrough exists to dismantle.

## What it teaches

Sixteen rhythms, ten conditions (potassium, calcium and magnesium patterns; LVH; RVH; HFrEF; HFpEF),
five guided sequences, thirty practice items, and a signal-detection drill.

The second teaching object is the **causal chain**. Every rhythm and condition is stored as an ordered set
of links running trigger → cell → conduction → ECG → pump → patient, so a student can answer *why*
hyperkalaemia produces peaked T waves rather than memorising that it does. Selecting a link
highlights the part of the tracing it explains.

## How it is built

```
src/            numbered fragments, concatenated in lexical order
  00, 90        document shell
  05            stylesheet
  10            namespace, deterministic RNG, math helpers
  20-25         clinical content registries (data only, no logic)
  30-34         engine: lead geometry, rhythm scheduling, waveform synthesis, pump, frame snapshot
  26            what each wave and interval means, for the click-to-explain interaction
  40-43         heart geometry, layered SVG renderer, ECG canvas, two-track timeline
  24a           the zero-knowledge walkthrough (before 25, so it heads the index)
  28            glossary — one plain sentence per term
  50-53, 60     glossary UI, teaching panels, quiz, guided lessons, application shell
  _harness.js   verification; build.py skips anything starting with "_"
build.py        concatenates src/ into index.html
CONTRACT.md     module contract, content schemas, and the clinical-honesty rules
```

Rebuild after editing anything in `src/`:

```bash
python3 cardiac/build.py
```

Python 3 standard library only. There is no Node dependency and no bundler.

### The model

Electrical activity is one net cardiac dipole vector whose direction and magnitude change through the
beat. Every lead is that vector projected onto an axis: leads I and II are projected directly and
III, aVR, aVL and aVF are derived arithmetically, which makes Einthoven's law (II = I + III) hold
exactly and keeps all twelve leads synchronised by construction.

Conditions do not swap in a different picture. They change the parameters of the underlying currents
— conduction velocity, plateau duration, how synchronous repolarisation is, how much muscle is
generating current — and the twelve leads then change together, the way they do in a patient.

Filling is computed from the diastolic time the rhythm actually left available and from whether an
atrial contraction landed in it, so tachycardia, a dropped beat, a premature beat and an irregular
ventricular response all reduce stroke volume for the right reason.

Diastole is drawn as the two phases it has. Most of the ventricle fills *passively*, before the atria
contract — the atrial kick then closes the last fifth or so, and the timeline names both. The ordering
matters more than it looks: a learner who believes ventricular filling waits on atrial contraction
concludes that fibrillation stops filling altogether, when what it actually costs is that final
top-up. A stiff ventricle leans on the kick harder (about 27% in HFpEF against 20% normally), which is
why losing it matters more in some patients than others.

Atrial emptying is one-way. The atria squeeze, hand their contents to the ventricle and stay down,
refilling gradually from the great veins across ventricular systole. Modelling the squeeze as a
symmetric bump — down and straight back up — put the atrium back at full volume the instant it
stopped contracting, which read as though nothing had been transferred.

Volume can only rise while the outflow valve is shut, so end-diastolic volume is floored at the
previous beat's end-systolic volume. A very premature beat has almost no filling period, and without
that floor the chamber is drawn shrinking as it fills — which inverts the lesson, since a PVC ejects
little because it never filled, not because the ventricle emptied itself.

### The illustration

The heart is generated from parameters, not traced. That is a requirement rather than a preference:
a flattened drawing cannot morph, and contraction needs every structure to be an independently
controllable path that can be hidden, highlighted, labelled and animated.

What it draws: four chambers with a leaning long axis so the apex sits down and to the patient's
left; a fibrous atrioventricular junction the atria rest on and the ventricles hang from; both
auricles; trabeculae lining the ventricular cavities; papillary muscles that shorten with the wall
they spring from; and chordae tendineae running from each papillary tip to the leaflet it restrains.

Each chamber is drawn as an outlined cavity with blood that **fills to a level tracking its volume**,
rather than as a solid shape that quietly changes size. The ventricles read about 95% full at
end-diastole and about 22% at end-systole; the atria fill through ventricular systole and drop by
roughly a third when they contract. Wall motion still happens underneath — both signals point the
same way, and a level a learner can watch climb and fall is far easier to read than a silhouette.

The chordae are the best single illustration of contraction in the product. They hang slack while the
AV valve is open and snap taut the instant it shuts — which is exactly what stops the leaflets
inverting into the atrium once the ventricle starts generating pressure.

The conduction system follows the standard teaching diagrams: a sinus node with radiating fibres,
three internodal tracts rather than one wire, Bachmann's bundle carrying the impulse across to the
left atrium, the AV node and His bundle, a right bundle branch as a discrete cord and a left bundle
branch fanning into anterior and posterior fascicles, and a Purkinje network that branches to three
orders along the endocardium. A bright marker travels the pathway in real time, pausing at the AV
node during the PR segment and turning red at a block. The Purkinje network lights apex-first, each
fibre sampled at its own travel time along the tree — conduction delay is a delay in *time*, and
modelling it as a reduction in brightness compressed the whole sweep into about two milliseconds.
Fibres run subendocardially, down the septum and round the apex rather than across the cavity, and
arborise horizontally over each free wall. Atrial depolarisation lights the atrial wall
itself rather than drawing arcs through the cavity — the muscle changes state, and rings propagating
through space were clutter that added nothing the tracts and the marker did not already show.

Both ventricles have a visible **outflow tract** — a tapering channel of the same blood as the
ventricle, running from inside the cavity up to the semilunar valve. Without it the great arteries
merely start somewhere near the top of the heart and a learner cannot tell which chamber they drain;
the pulmonary trunk in particular reads as though it comes off an atrium. Both semilunar valves sit
on top of their own ventricle for the same reason, and the pulmonary trunk carries a drop shadow
where it passes anterior to the right atrium, so the crossing reads as depth rather than as a merge.

Counts are the naming, so the drawing states them: the tricuspid has three leaflets, the mitral is
the exception with two, and both semilunar valves have three cusps.

Not everything true is worth drawing. Two pulmonary veins are shown where a real heart has four, and
the coronary arteries are described in the text but not drawn at all — both were added, looked at,
and taken back out. They put lines on a already-dense picture without changing what a learner of this
material can work out from it, and the cost of extraneous detail is paid on every single frame a
student looks at.

**Every label anchor is computed from the geometry it names** — vessels by measuring along the drawn
path, chambers from the current cavity bounds, valves from the annulus, conduction structures from
the generated pathway. Hand-typed anchors drift the moment the geometry moves, which is how
"Pulmonary artery" once ended up pointing at the aorta.

Blood flow is drawn as **arrows rather than moving dots**. A dot only conveys direction if you watch
it travel; an arrow states it in a single frame, which matters in a product designed to be paused
constantly. The arrows still move, so the motion cue survives — and under `prefers-reduced-motion`
they park at fixed stations rather than disappearing, because direction is the information and it
does not require animation. They remain gated on valve state: an arrow drawn across a shut valve
would assert flow that is not happening. Watch the isovolumetric period, where all four valves are
shut and only the venous return arrows keep moving.

A label summoned by hovering sits **beside** the structure rather than out in the gutter. The first
attempt widened the crop to make room for the gutter text, which fixed the clipping and introduced
something worse: the whole illustration rescaled every time the pointer moved on or off a structure.
The crop is now fixed, and a name next to the thing it names reads better than one at the end of a
long leader line anyway.

**Nothing in the chrome may resize with its own content.** The stage is `1fr` between a fixed topbar
and transport bar, so anything that changes the transport's height resizes the drawing. The event chip
had `flex: 1 1 auto` — an `auto` basis sizes from the text, so a longer event label grew the chip,
tipped the flex row into wrapping, and doubled the bar's height. The heart jumped 52px several times a
beat, which read as a stutter during playback. Basis `0` makes the width depend only on the space
left over. Below 1100px the longest labels need two lines, so the second line is reserved
unconditionally — a one-line and a two-line label occupy identical height — and below 900px, where the
layout already stacks and scrolls, the chip takes its own row rather than competing with eight
controls for one strip.

### Things that must move together

Anything drawn on a structure that moves has to move with it. The valve plane descends during
systole, so the AV node, the internodal tracts that terminate on it, the His bundle and the bundle
branches all descend with it — pinning the node at a fixed y left it visibly floating off the heart
at peak contraction, and left the three tracts ending in mid-air.

Depth ordering is load-bearing too. The pulmonary trunk is anterior to the aortic root and stays on
top; both its branches pass behind the arch, because drawn the other way the left branch lay across
the aorta and read as deoxygenated blood running through it.

### Scales

The rhythm strip and the 12-lead grid are standard: 25 mm/s, 10 mm/mV, isotropic, so a small square
is 0.04 s by 0.1 mV and counting squares works. The magnified single complex runs at 50 mm/s with an
independent vertical scale chosen to hold the whole complex — a small square still means 0.04 s by
0.1 mV, it is simply not square on screen, and the view says so. The 12-lead grid shares one gain
across all twelve leads so they stay comparable, dropping to half gain and labelling it when the
tallest lead will not fit, exactly as a machine does.

### Editing the clinical content

Content lives in `src/2*-content-*.js` as plain data. Wording, rationales, sources and scenario text
can be changed without touching engine or renderer code. `CONTRACT.md` gives the exact schemas and
the eight rules that content must not break.

## Limits

This is an educational model, not a diagnostic instrument.

- Waveforms are generated, not recorded from a patient.
- The ECG shows electrical activity. It does not measure contraction, pulse, cardiac output or
  perfusion, and the product never lets a tracing stand in for the patient.
- Hypertrophy, ischaemia and axis are never read from a single rhythm lead.
- No waveform establishes a serum concentration, and no fixed severity sequence is claimed.
- No dosing, prescribing or patient-specific advice anywhere.

Clinical content was drafted and then reviewed against published guidance; it has not been through
formal institutional clinical sign-off. Review it before classroom use.
