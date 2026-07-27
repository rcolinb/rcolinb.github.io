/* 24a-content-tour.js — the zero-knowledge walkthrough.
 *
 * Loads before 25-content-lessons.js so these three sit at the head of the index.
 *
 * Written for a student who has never seen an ECG and has never used this page.
 * That audience has no prior knowledge to catch an error with, so the honesty
 * rules bite harder here than anywhere else in the product:
 *
 *   - A wave is always the muscle RECEIVING THE SIGNAL, never the muscle
 *     "beating", "pumping" or "squeezing". The single sentence a beginner most
 *     wants to hear — "this spike is the heart beating" — is the one that must
 *     never appear.
 *   - No numeric intervals. The existing sequences quote 0.12-0.20 s quite
 *     legitimately, but a beginner cannot tell a conventional interval from a
 *     measurement of this generated tracing, and the readouts panel is on screen
 *     the whole time looking like an instrument.
 *   - No arrest rhythms. "Line on the screen means alive" is the default model
 *     this tutorial has to dismantle, and showing VF to someone on step three is
 *     not how to do it.
 *
 * Three short sequences rather than one long one, chained with `next`. Progress
 * is not stored anywhere (see 11-store.js), so a single nineteen-step walkthrough
 * would lose everything on a reload; three units cap the loss at one.
 */

[].push.apply(CARDIAC.content.lessons, [

  /* ============================================================ A. the tool */
  {
    id: "tour-basics",
    label: "Start here: what you're looking at",
    level: "basic",
    next: "tour-beat",
    blurb: "No cardiology yet — just what the three panels are and how to drive them.",
    steps: [
      {
        id: "tour-basics-1",
        rhythm: "nsr", condition: "normal",
        title: "Three panels, one heartbeat",
        text: "On the left is a drawing of a heart, in the middle is the tracing a monitor would draw, and on the right is this panel — all three are showing the same instant of the same beat.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: []
      },
      {
        id: "tour-basics-2",
        title: "Nothing moves until you say so",
        text: "The buttons along the bottom control time, and stepping one event at a time is the main way to study this — it is easier to read a moment than to watch it go by.",
        focus: "integrated",
        seek: { kind: "start" },
        point: "#nextBtn",
        gate: {
          kind: "control", value: "step",
          prompt: "Press the ▶▶ button at the bottom to move forward one event.",
          hint: "It is the fourth button along the bottom bar. The right arrow key does the same thing.",
          wrong: "That moved something else. Look for ▶▶ along the bottom."
        }
      },
      {
        id: "tour-basics-3",
        title: "The tracing is a picture of time",
        text: "The tracing runs left to right like a strip of paper coming out of a machine, and the moving line marks the moment the heart drawing is showing.",
        focus: "integrated",
        seek: { kind: "event", eventType: "pacemaker-fire", occurrence: 1 },
        point: "#stripWrap"
      },
      {
        id: "tour-basics-4",
        title: "Everything here is clickable",
        text: "Every structure in the drawing will tell you what it is and what it is doing at the moment you have paused on.",
        focus: "anatomy",
        labelSet: "chambers",
        seek: { kind: "start" },
        point: "#heartHolder",
        gate: {
          kind: "part", value: "*",
          prompt: "Click any part of the heart drawing.",
          hint: "The four big chambers are the easiest targets — try one of the large open areas."
        }
      },
      {
        id: "tour-basics-5",
        title: "Click a wave, the heart answers",
        text: "It works the other way round too: click a bump on the tracing and the drawing shows you which part of the heart that bump came from.",
        focus: "integrated",
        labelSet: "none",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        point: "#detailWrap",
        gate: {
          kind: "wave", value: "qrs",
          prompt: "Click the tall narrow spike on the magnified tracing.",
          hint: "It is the tallest thing on the trace — the one labelled QRS above it.",
          wrong: "Close. Try the tall narrow spike, not the rounder bumps either side of it."
        }
      },
      {
        id: "tour-basics-6",
        title: "This panel has five sections",
        text: "Rhythm describes what you are looking at, Why explains the cause behind it, Set up changes the conditions, Quiz tests you, and Learn is where you are now.",
        focus: "integrated",
        seek: { kind: "start" },
        point: ".rail-tabs"
      },
      {
        id: "tour-basics-7",
        title: "Two controls, and one promise",
        text: "Focus fades everything except one story at a time, Labels names the parts — and everything on this page is generated by a model, so none of it is a recording of a real person.",
        focus: "integrated",
        seek: { kind: "start" },
        point: "#focusSelect",
        predict: {
          q: "So what is this page showing you?",
          options: ["A model that generates a beat", "A recording of a real patient", "A video of a real heart"],
          correct: 0,
          reveal: "Everything here is worked out from a model of how a heart behaves. That is what makes it safe to break on purpose — and it is why no number on this page is a measurement of anyone."
        }
      }
    ]
  },

  /* ======================================================== B. the physiology */
  {
    id: "tour-beat",
    label: "The beat, in plain words",
    level: "basic",
    next: "tour-limits",
    blurb: "One beat from start to finish, with nothing assumed.",
    steps: [
      {
        id: "tour-beat-1",
        rhythm: "nsr", condition: "normal",
        title: "Two things happen every beat",
        text: "First an electrical signal travels through the heart, and then the muscle it reached squeezes — two separate events, and the second always follows the first.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: ["right-atrium", "left-atrium", "right-ventricle", "left-ventricle"]
      },
      {
        id: "tour-beat-2",
        title: "Where the beat starts",
        text: "A small patch of tissue at the top of the heart starts each beat on its own, without being told to by anything else.",
        focus: "conduction",
        labelSet: "conduction",
        inspect: "sa-node",
        seek: { kind: "event", eventType: "pacemaker-fire", occurrence: 1 },
        highlight: ["sa-node"]
      },
      {
        id: "tour-beat-3",
        title: "The first bump",
        text: "As the signal spreads across the two upper chambers, the tracing draws a small rounded bump called the P wave.",
        focus: "conduction",
        labelSet: "none",
        seek: { kind: "event", eventType: "atrial-depolarization", occurrence: 1 },
        highlight: ["right-atrium", "left-atrium"],
        gate: {
          kind: "wave", value: "p",
          prompt: "Click the first small bump on the magnified tracing.",
          hint: "It comes before the tall spike, and it is the smaller, rounder one.",
          wrong: "Not that part. The P wave is the small rounded bump that comes first."
        }
      },
      {
        id: "tour-beat-4",
        title: "The pause you can see",
        text: "The flat stretch after that bump is not nothing happening — the signal is being held up on purpose, which gives the upper chambers time to finish emptying.",
        focus: "conduction",
        wave: "pr",
        seek: { kind: "event", eventType: "av-arrival", occurrence: 1 },
        highlight: ["av-node"]
      },
      {
        id: "tour-beat-5",
        title: "The big spike",
        text: "When the signal finally reaches the two large lower chambers it spreads through them very fast, and that is the tall narrow spike.",
        focus: "conduction",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["left-ventricle", "right-ventricle"],
        predict: {
          q: "The tall spike tells you the lower chambers have just...",
          options: ["received the electrical signal", "finished squeezing", "emptied completely"],
          correct: 0,
          reveal: "The spike is the signal arriving, not the squeeze. The squeeze follows a moment later — which is exactly why you cannot tell from a tracing alone whether any blood actually moved."
        }
      },
      {
        id: "tour-beat-6",
        title: "Now watch a valve",
        text: "The moment the lower chambers start to squeeze, the valves above them slam shut so that blood cannot go backwards.",
        focus: "contraction",
        labelSet: "valves",
        seek: { kind: "event", eventType: "av-valve-close", occurrence: 1 },
        highlight: ["mitral", "tricuspid"],
        gate: {
          kind: "part", value: "mitral",
          prompt: "Click the mitral valve to see what it is doing right now.",
          hint: "It is on the right-hand side of the drawing as you look at it, between the upper and lower chamber.",
          wrong: "That is a different valve. The mitral one is on the right of the picture, between the upper and lower chamber."
        }
      },
      {
        id: "tour-beat-7",
        title: "The flattest part is the busiest part",
        text: "Just after the spike the tracing goes almost flat, and that quiet-looking stretch is when most of the blood is actually leaving the heart.",
        focus: "flow",
        labelSet: "none",
        wave: "st",
        seek: { kind: "event", eventType: "semilunar-valve-open", occurrence: 1 },
        highlight: ["left-ventricle", "aortic"]
      },
      {
        id: "tour-beat-8",
        title: "The reset, and one last thing",
        text: "The last bump is the muscle resetting itself electrically so it can go again — and that is the whole beat, told entirely in signals.",
        focus: "integrated",
        seek: { kind: "event", eventType: "ventricular-repolarization", occurrence: 1 },
        highlight: ["left-ventricle", "right-ventricle"],
        predict: {
          q: "You are looking at a normal-looking tracing. What does it tell you about whether this person has a pulse?",
          options: ["Nothing — you have to feel for one", "That they definitely have one", "That their blood pressure is normal"],
          correct: 0,
          reveal: "The tracing only ever shows the electrical signal. Whether the muscle answered it, and whether blood actually moved, are things you find out at the bedside by feeling for a pulse and looking at the patient."
        }
      }
    ]
  },

  /* =========================================================== C. the limits */
  {
    id: "tour-limits",
    label: "What it can't tell you",
    level: "basic",
    blurb: "Short, and the most important part.",
    steps: [
      {
        id: "tour-limits-1",
        rhythm: "nsr", condition: "normal",
        patientState: "pea",
        title: "A tracing is not a patient",
        text: "The tracing on screen has not changed, but this patient now has no pulse — the signal is still travelling, and the muscle is no longer answering it.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: ["left-ventricle", "right-ventricle"]
      },
      {
        id: "tour-limits-2",
        rhythm: "nsr", condition: "normal",
        title: "One lead is one viewpoint",
        text: "What you have been watching is one view of the heart's signal, and the same beat looks quite different from a different sensor position.",
        focus: "integrated",
        lead: "V1",
        seek: { kind: "start" }
      },
      {
        id: "tour-limits-3",
        title: "Every number here is illustrative",
        text: "The figures underneath the tracing come from the model, not from a machine measuring a person, so treat them as a demonstration of direction rather than as readings.",
        focus: "integrated",
        lead: "II",
        seek: { kind: "start" },
        point: "#readouts"
      },
      {
        id: "tour-limits-4",
        title: "Where to go next",
        text: "You now know enough to use the rest of this page — the other sequences in this panel go deeper, and the Quiz tab will tell you what has stuck.",
        focus: "integrated",
        seek: { kind: "start" },
        predict: {
          q: "One last time: what does this page record?",
          options: ["The heart's electrical activity", "The force of each squeeze", "How much blood is moving"],
          correct: 0,
          reveal: "Electrical activity, and only that. Every other question — is the muscle working, is blood moving, is this person all right — is answered by going and looking at the patient."
        }
      }
    ]
  }
]);
