(function () {
  "use strict";

  // ---------- storage ----------

  const KEY = "math156-prep-v1";
  const blank = () => ({
    done: {}, units: {}, scores: {}, mistakes: [], seq: 1,
    practice: {}, read: {}, checks: {}, attempts: [], run: null,
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
    } catch (e) { /* storage blocked: keep going in memory */ }
    return blank();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* in memory only */ }
  }

  let state = load();

  // ---------- dates ----------

  const pad = (n) => String(n).padStart(2, "0");
  const utc = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const diff = (a, b) => Math.round((utc(a) - utc(b)) / 864e5);
  const addDays = (s, n) => new Date(utc(s) + n * 864e5).toISOString().slice(0, 10);
  const fmt = (s, o) => new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC" }, o)).format(new Date(utc(s)));
  const longDate = (s) => fmt(s, { weekday: "long", month: "long", day: "numeric" });
  const shortDate = (s) => fmt(s, { weekday: "short", month: "short", day: "numeric" });
  const monthDay = (s) => fmt(s, { month: "short", day: "numeric" });

  function today() {
    const q = new URLSearchParams(location.search).get("date"); // ?date=2026-12-01 previews another day
    if (q && /^\d{4}-\d\d-\d\d$/.test(q)) return q;
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  const FIRST = DAYS[0].date;
  const byDate = Object.fromEntries(DAYS.map((d) => [d.date, d]));

  // ---------- small helpers ----------

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  const sum = (arr, f) => arr.reduce((a, x, i) => a + f(x, i), 0);
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  // Text with maths between dollar signs, typeset by KaTeX when it has loaded.
  function tex(str) {
    return String(str).split(/(\$\$[^$]+\$\$|\$[^$]+\$)/).map((part) => {
      const display = part.startsWith("$$");
      if (!part.startsWith("$") || typeof katex === "undefined") return esc(part);
      try { return katex.renderToString(display ? part.slice(2, -2) : part.slice(1, -1), { displayMode: display, throwOnError: false }); }
      catch (e) { return esc(part); }
    }).join("");
  }

  const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- what has been done ----------

  const unitById = (u) => UNITS.find((x) => x.id === u);
  const unitOfDay = (day) => { const m = /Unit (\d+)/.exec(day.focus); return m ? Number(m[1]) : null; };
  const questionsIn = (u) => QUESTIONS.filter((q) => q.unit === u).sort((a, b) => a.level - b.level);
  const solvedIn = (u) => questionsIn(u).filter((q) => state.practice[q.id] === "ok").length;
  const missedIn = (u) => questionsIn(u).filter((q) => state.practice[q.id] === "miss").length;
  const checksIn = (u) => CHECKS[u] || [];
  const checkKey = (u, i) => u + "-" + i;
  const answeredIn = (u) => checksIn(u).filter((c, i) => state.checks[checkKey(u, i)] != null).length;
  const rightIn = (u) => checksIn(u).filter((c, i) => state.checks[checkKey(u, i)] === c.a).length;
  const doneCount = () => DAYS.filter((d) => state.done[d.date]).length;
  const openMistakes = () => state.mistakes.filter((m) => !m.closed);
  const dueMistakes = () => openMistakes().filter((m) => m.next <= today());
  const openIn = (u) => openMistakes().filter((m) => m.unit === u).length;

  function streak() {
    let t = today();
    if (!state.done[t]) t = addDays(t, -1);
    let n = 0;
    while (byDate[t] && state.done[t]) { n++; t = addDays(t, -1); }
    return n;
  }

  // A rough measure of how much a unit needs work, from what the student has recorded.
  function weakness(u) {
    const r = state.units[u];
    const w = r === "Red" ? 4 : r === "Yellow" ? 2 : r === "Green" ? -2 : 0;
    return w + 1.5 * openIn(u) + missedIn(u) + 0.5 * (answeredIn(u) - rightIn(u));
  }

  function focusUnits(n) {
    return UNITS.map((u) => ({ u, w: weakness(u.id) })).filter((x) => x.w > 0)
      .sort((a, b) => b.w - a.w || a.u.id - b.u.id).slice(0, n).map((x) => x.u);
  }

  function reasons(u) {
    const out = [];
    if (state.units[u] === "Red" || state.units[u] === "Yellow") out.push("rated " + state.units[u].toLowerCase());
    if (openIn(u)) out.push(plural(openIn(u), "open mistake"));
    if (missedIn(u)) out.push(plural(missedIn(u), "missed question"));
    const wrong = answeredIn(u) - rightIn(u);
    if (wrong) out.push(plural(wrong, "wrong check"));
    return out.join(", ");
  }

  // ---------- exams ----------

  const MIXED = { id: "mixed", name: "Mixed set", scope: "One practice question from each unit, the ones you missed first", minutes: 120 };
  const EXAMS = MOCKS.concat([MIXED]);
  const examById = (id) => EXAMS.find((x) => x.id === id);
  const SCORE_NAME = { checkpoint: "Checkpoint", probability: "Probability test", mock1: "Mock 1", mock2: "Mock 2", mock3: "Mock 3" };

  function examQuestions(run) {
    if (run.id === "mixed") return (run.items || []).map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean);
    const ex = MOCKS.find((m) => m.id === run.id);
    return ex ? ex.questions : [];
  }

  function pickMixed() {
    return UNITS.map((u) => {
      const qs = QUESTIONS.filter((q) => q.unit === u.id);
      const rank = (q) => (state.practice[q.id] === "miss" ? 0 : state.practice[q.id] ? 2 : 1);
      const best = Math.min.apply(null, qs.map(rank));
      const pool = qs.filter((q) => rank(q) === best);
      return pool[Math.floor(Math.random() * pool.length)].id;
    });
  }

  function clock(run) {
    const left = Math.round((run.start + run.minutes * 60000 - Date.now()) / 1000);
    if (left <= 0) return "Time is up";
    const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
    return (h ? h + ":" + pad(m) : m) + ":" + pad(s) + " left";
  }

  // ---------- today and the plan ----------

  let selected = null; // a day picked from the squares; null means today
  let armed = null;    // a button pressed once that waits for a second press
  let draft = null;    // unit and source carried into the mistake form
  const shown = new Set();  // answers opened in this visit
  const hinted = new Set(); // hints opened in this visit

  function focusDate() {
    if (selected && byDate[selected]) return selected;
    const t = today();
    if (t < FIRST) return FIRST;
    if (t > EXAM_DATE) return EXAM_DATE;
    return t;
  }

  function scoreField(day) {
    if (!day.test) return "";
    const v = state.scores[day.test];
    return `<p class="score"><label for="score-${day.date}">${esc(day.test)} score</label>
      <input id="score-${day.date}" data-key="score-${day.date}" data-score="${esc(day.test)}" type="number" min="0" max="100" inputmode="numeric" value="${v == null ? "" : v}"> <span>%</span></p>`;
  }

  function calendar(sel) {
    const t = today();
    const heads = ["Tu", "We", "Th", "Fr", "Sa", "Su", "Mo"].map((d) => `<span>${d}</span>`).join("");
    const cells = DAYS.map((d) => {
      const done = !!state.done[d.date];
      const cls = ["cell"];
      if (done) cls.push("done");
      else if (d.date < t) cls.push("missed");
      if (d.date === t) cls.push("is-today");
      if (d.date === sel) cls.push("selected");
      if (d.date === EXAM_DATE) cls.push("exam");
      const status = done ? "done" : d.date < t ? "not done" : d.date === t ? "today" : "upcoming";
      return `<button type="button" class="${cls.join(" ")}" data-action="pick" data-date="${d.date}" data-key="cell-${d.date}"
        aria-label="${esc(shortDate(d.date) + ": " + d.focus + ", " + status)}">${Number(d.date.slice(8))}</button>`;
    }).join("");
    const s = streak();
    return `<aside class="calendar" aria-label="All 35 days">
      <div class="cal-head" aria-hidden="true">${heads}</div>
      <div class="cal">${cells}</div>
      <p class="cal-note"><strong>${doneCount()} of ${DAYS.length}</strong> sessions done${s >= 2 ? `, ${s} days in a row` : ""}</p>
    </aside>`;
  }

  function unitLine(u) {
    return `<li>Unit ${u} on this site: <a class="link" href="#unit-${u}">explanation</a>${state.read[u] ? " (read)" : ""},
      <a class="link" href="#unit-${u}-check">quick check</a> (${rightIn(u)} of ${checksIn(u).length} right),
      <a class="link" href="#unit-${u}-practice">practice</a> (${solvedIn(u)} of ${questionsIn(u).length} solved)</li>`;
  }

  function viewToday() {
    const t = today();
    const date = focusDate();
    const day = byDate[date];
    const isToday = date === t;
    const done = !!state.done[date];

    let when = esc(longDate(date));
    if (t < FIRST && !selected) when = "The plan starts " + when;
    if (t > EXAM_DATE && !selected) when = "The final was " + when;

    const action = done
      ? `<span class="done-mark">${CHECK} Done</span><button type="button" class="link" data-action="toggle" data-date="${date}" data-key="toggle">Undo</button>`
      : `<button type="button" class="btn" data-action="toggle" data-date="${date}" data-key="toggle">${isToday ? "Mark today done" : "Mark this day done"}</button>`;

    const nudges = [];
    const u = unitOfDay(day);
    if (u) nudges.push(unitLine(u));
    if (day.exam) {
      const ex = examById(day.exam);
      nudges.push(`<li><a class="link" href="#exams">Open ${esc(ex.name)} under Exams</a> <span class="quiet">${esc(ex.scope)}, ${ex.minutes} minutes</span></li>`);
    }
    if (/weakest/i.test(day.focus)) {
      const f = focusUnits(2), pick = /second/i.test(day.focus) ? f[1] : f[0];
      nudges.push(pick
        ? `<li>${/second/i.test(day.focus) ? "Second weakest" : "Weakest"} right now: <a class="link" href="#unit-${pick.id}">Unit ${pick.id}, ${esc(pick.name)}</a> <span class="quiet">(${esc(reasons(pick.id))})</span></li>`
        : `<li class="quiet">Rate your units and log your mistakes, and this will point at your weakest unit.</li>`);
    }
    const due = dueMistakes().length;
    if (due) nudges.push(`<li><a class="link" href="#mistakes">${plural(due, "mistake")} to retry today</a></li>`);
    const behind = DAYS.filter((d) => d.date < t && !state.done[d.date]).length;
    if (behind) nudges.push(`<li>${plural(behind, "earlier day")} not marked done. <a class="link" href="#plan">Open the plan</a></li>`);
    if (!isToday && byDate[t]) nudges.push(`<li><button type="button" class="link" data-action="pick" data-date="${t}">Back to today</button></li>`);

    return `<div class="today">
      <section class="session" aria-live="polite">
        <p class="when">${when}<span class="phase">${esc(day.phase)}</span></p>
        <h1 class="title">${esc(day.focus)}</h1>
        <p class="lede">${esc(day.plan)}</p>
        ${day.due ? `<p class="due-line">${day.date === EXAM_DATE ? "" : "Due: "}${esc(day.due)}</p>` : ""}
        ${scoreField(day)}
        <div class="actions">${action}</div>
        ${nudges.length ? `<ul class="nudges">${nudges.join("")}</ul>` : ""}
      </section>
      ${calendar(date)}
    </div>`;
  }

  function viewPlan() {
    const t = today();
    const blocks = [];
    DAYS.forEach((d) => {
      const last = blocks[blocks.length - 1];
      if (last && last.phase === d.phase) last.days.push(d);
      else blocks.push({ phase: d.phase, days: [d] });
    });

    const html = blocks.map((b) => {
      const a = b.days[0].date, z = b.days[b.days.length - 1].date;
      const range = a === z ? monthDay(a) : monthDay(a) + " to " + monthDay(z);
      const rows = b.days.map((d) => {
        const done = !!state.done[d.date];
        const u = unitOfDay(d);
        return `<li class="day${done ? " is-done" : ""}${d.date === t ? " is-today" : ""}">
          <input type="checkbox" data-action="toggle" data-date="${d.date}" data-key="chk-${d.date}" ${done ? "checked" : ""} aria-label="${esc(shortDate(d.date) + ", " + d.focus)}">
          <span class="d">${shortDate(d.date)}</span>
          <details${d.date === t ? " open" : ""}>
            <summary>${esc(d.focus)}</summary>
            <p>${esc(d.plan)}</p>
            ${d.due ? `<p class="tag">${esc(d.due)}</p>` : ""}
            ${u ? `<p class="go"><a class="link" href="#unit-${u}">Open Unit ${u}</a></p>` : ""}
            ${d.exam ? `<p class="go"><a class="link" href="#exams">Open ${esc(examById(d.exam).name)}</a></p>` : ""}
          </details>
        </li>`;
      }).join("");
      return `<section class="phase-block">
        <div class="phase-head"><h2>${esc(b.phase)}</h2><span class="quiet small">${range}. ${esc(PHASES[b.phase])}</span></div>
        <ul>${rows}</ul>
      </section>`;
    }).join("");

    return `<h1 class="title">The plan</h1>
      <p class="lede">35 days, one session a day. Tick a day when it is finished, and open it to see what to do.</p>
      ${html}`;
  }

  // ---------- units ----------

  function rateTag(u) {
    const r = state.units[u];
    return `<span class="rated ${r ? r.toLowerCase() : "none"}">${r || "Not rated"}</span>`;
  }

  function unitBits(u) {
    const bits = [state.read[u] ? "Explanation read" : "Explanation not read"];
    if (answeredIn(u)) bits.push(`check ${rightIn(u)} of ${checksIn(u).length}`);
    bits.push(`practice ${solvedIn(u)} of ${questionsIn(u).length}`);
    if (openIn(u)) bits.push(plural(openIn(u), "open mistake"));
    return bits.join(", ");
  }

  function viewUnits() {
    const focus = focusUnits(3);
    const rows = UNITS.map((u) => `<li><a class="unit-row" href="#unit-${u.id}">
        <span class="n">${u.id}</span>
        <span class="name"><span class="t">${esc(u.name)}</span><span class="m">${esc(unitBits(u.id))}</span></span>
        ${rateTag(u.id)}
      </a></li>`).join("");
    return `<h1 class="title">Units</h1>
      <p class="lede">Each unit has an explanation, a quick check, practice questions with worked solutions, and its formulas.</p>
      ${focus.length ? `<p class="focus"><strong>Focus next:</strong> ${focus.map((u) => `<a class="link" href="#unit-${u.id}">Unit ${u.id}, ${esc(u.name)}</a>`).join("; ")}</p>` : ""}
      <ul class="unit-list">${rows}</ul>
      <p class="row links-row"><a class="link" href="#formulas">All formulas</a><a class="link" href="#normal-table">Normal table</a></p>`;
  }

  const TABS = [["learn", "Explanation", ""], ["check", "Quick check", "-check"], ["practice", "Practice", "-practice"], ["formulas", "Formulas", "-formulas"]];

  function viewUnit(u, tab) {
    const unit = unitById(u);
    const nav = `<nav class="sub" aria-label="Unit ${u}">${TABS.map((x) =>
      `<a href="#unit-${u}${x[2]}"${x[0] === tab ? ' aria-current="page"' : ""}>${x[1]}</a>`).join("")}</nav>`;
    const body = tab === "check" ? unitCheck(u) : tab === "practice" ? unitPractice(u) : tab === "formulas" ? unitFormulas(u) : unitLearn(u);
    const prev = unitById(u - 1), next = unitById(u + 1);
    const r = state.units[u] || "";
    const dots = ["Red", "Yellow", "Green"].map((c) =>
      `<button type="button" class="dot ${c.toLowerCase()}" data-action="rate" data-unit="${u}" data-rating="${c}" data-key="rate-${u}-${c}" aria-pressed="${r === c}" aria-label="Rate unit ${u} ${c}" title="${c}"></button>`).join("");
    return `<p class="crumb"><a class="link" href="#units">All units</a></p>
      <h1 class="title unit-title"><span class="unit-num">${u}</span>${esc(unit.name)}</h1>
      <p class="quiet small unit-topics">${esc(unit.topics)}. ${esc(unit.ref)}</p>
      ${nav}
      ${body}
      <section class="unit-foot">
        <div class="rate-line"><span>How confident are you with this unit now?</span><div class="rate"><span class="now">${r || "Not rated"}</span>${dots}</div></div>
        <p class="pager">${prev ? `<a class="link" href="#unit-${prev.id}">Unit ${prev.id}: ${esc(prev.name)}</a>` : "<span></span>"}${next ? `<a class="link" href="#unit-${next.id}">Unit ${next.id}: ${esc(next.name)}</a>` : ""}</p>
      </section>`;
  }

  function unitLearn(u) {
    const L = LESSONS[u];
    const list = (arr) => arr.map((x) => `<li>${tex(x)}</li>`).join("");
    const parts = L.parts.map((p) => `<section class="part">
        <h2>${tex(p.h)}</h2>
        ${(p.p || []).map((x) => `<p>${tex(x)}</p>`).join("")}
        ${p.steps ? `<h3>How to do it</h3><ol class="method">${list(p.steps)}</ol>` : ""}
        ${p.ex ? `<div class="example"><p class="ex-label">Worked example</p><div class="ex-q">${tex(p.ex.q)}</div><ol class="steps">${list(p.ex.s)}</ol></div>` : ""}
      </section>`).join("");
    return `<div class="lesson">
        <p class="lede">${tex(L.intro)}</p>
        ${parts}
        <section class="part"><h2>Common mistakes</h2><ul class="bullets">${list(L.mistakes)}</ul></section>
        <section class="part"><h2>On the exam</h2><ul class="bullets">${list(L.exam)}</ul></section>
      </div>
      <div class="row end">
        ${state.read[u]
          ? `<span class="done-mark">${CHECK} Read</span><button type="button" class="link" data-action="read" data-unit="${u}" data-key="read">Mark as not read</button>`
          : `<button type="button" class="btn" data-action="read" data-unit="${u}" data-key="read">Mark as read</button>`}
        <a class="link" href="#unit-${u}-check">Next: quick check</a>
      </div>`;
  }

  function unitCheck(u) {
    const items = checksIn(u);
    const list = items.map((c, i) => {
      const chosen = state.checks[checkKey(u, i)];
      const done = chosen != null;
      const opts = c.o.map((o, j) => {
        const cls = ["opt"];
        if (done && j === c.a) cls.push("right");
        else if (done && j === chosen) cls.push("wrong");
        return `<li><button type="button" class="${cls.join(" ")}" data-action="answer" data-unit="${u}" data-i="${i}" data-j="${j}" aria-pressed="${chosen === j}"${done ? " disabled" : ""}><span class="letter" aria-hidden="true">${"ABCD"[j]}</span><span class="otext">${tex(o)}</span></button></li>`;
      }).join("");
      const fb = done ? `<p class="fb ${chosen === c.a ? "ok" : "no"}" tabindex="-1" data-key="fb-${i}"><b>${chosen === c.a ? "Right." : "Not quite."}</b> ${tex(c.e)}</p>` : "";
      return `<li class="mcq"><p class="qhead"><span class="qn">${i + 1}</span></p><div class="qtext">${tex(c.q)}</div><ol class="opts">${opts}</ol>${fb}</li>`;
    }).join("");
    const n = answeredIn(u), r = rightIn(u), total = items.length;
    return `<p class="lede">Pick an answer to see straight away whether it is right, and why.</p>
      <ol class="questions checks">${list}</ol>
      <div class="row end">
        <span class="tally"><strong>${r} of ${total}</strong> right${n < total ? `, ${total - n} to go` : ""}</span>
        ${n ? `<button type="button" class="btn plain tight" data-action="resetchecks" data-unit="${u}">Try them again</button>` : ""}
        <a class="link" href="#unit-${u}-practice">Next: practice questions</a>
      </div>`;
  }

  function solution(q) {
    return `<div class="solution">
        <p class="answer"><b>Answer:</b> ${tex(q.a)}</p>
        <ol class="steps">${q.s.map((x) => `<li>${tex(x)}</li>`).join("")}</ol>
      </div>`;
  }

  function moreLinks(u) {
    const links = (MORE[u] || []).map((x) =>
      `<li><a class="link" href="${esc(x[2])}" target="_blank" rel="noopener">${esc(x[0])}</a> <span class="quiet small">${esc(x[1])}</span></li>`);
    if (CLP_UNITS.includes(u)) links.push(`<li><a class="link" href="${CLP_PROBLEMS}" target="_blank" rel="noopener">CLP-3 problem book</a> <span class="quiet small">problems with hints, answers and full solutions</span></li>`);
    return links.length ? `<section class="more"><h2 class="section">More reading and practice, free</h2><ul>${links.join("")}</ul></section>` : "";
  }

  function unitPractice(u) {
    const items = questionsIn(u).map((q, i) => {
      const st = state.practice[q.id];
      const open = shown.has(q.id);
      const src = "Practice " + u + "." + (i + 1);
      let foot;
      if (!open) {
        foot = `${q.hint && !hinted.has(q.id) ? `<button type="button" class="btn plain tight" data-action="hint" data-id="${q.id}" data-key="hint-${q.id}">Show a hint</button>` : ""}
          <button type="button" class="btn plain tight" data-action="reveal" data-id="${q.id}" data-key="rev-${q.id}">Show the answer</button>
          ${st ? `<span class="quiet small">${st === "ok" ? "Solved" : "Missed last time"}</span>` : ""}`;
      } else {
        foot = `<button type="button" class="btn tight${st === "ok" ? "" : " plain"}" data-action="mark" data-id="${q.id}" data-result="ok" data-key="ok-${q.id}" aria-pressed="${st === "ok"}">I got it</button>
          <button type="button" class="btn tight${st === "miss" ? "" : " plain"}" data-action="mark" data-id="${q.id}" data-result="miss" data-key="miss-${q.id}" aria-pressed="${st === "miss"}">I missed it</button>
          ${st === "miss" ? `<button type="button" class="link small" data-action="logfrom" data-unit="${u}" data-source="${esc(src)}">Log this mistake</button>` : ""}`;
      }
      return `<li class="question${st === "ok" ? " is-ok" : ""}">
        <p class="qhead"><span class="qn">${u}.${i + 1}</span><span class="quiet small">${LEVELS[q.level]}, ${plural(q.marks, "mark")}</span></p>
        <div class="qtext">${tex(q.q)}</div>
        ${hinted.has(q.id) && !open ? `<p class="hint" tabindex="-1" data-key="hinttext-${q.id}"><b>Hint:</b> ${tex(q.hint)}</p>` : ""}
        ${open ? solution(q) : ""}
        <div class="row">${foot}</div>
      </li>`;
    }).join("");
    return `<p class="lede">Work each question on paper before opening the answer, then mark yourself honestly. They run from warm up to challenge.</p>
      <ol class="questions">${items}</ol>
      ${moreLinks(u)}
      <p class="quiet small note">These questions were written for this plan to match your course topics. They are not from your instructor, so check the notation against your notes.</p>`;
  }

  function formulaList(u) {
    return (FORMULAS[u] || []).map((f) => `<details class="formula"><summary>${tex(f[0])}</summary><div>${tex(f[1])}</div></details>`).join("");
  }

  const openClose = `<p class="row"><button type="button" class="btn plain tight" data-action="openall">Open all</button><button type="button" class="btn plain tight" data-action="closeall">Close all</button></p>`;

  function unitFormulas(u) {
    return `<p class="lede">Say or write each one from memory, then open it to check.</p>
      ${openClose}
      ${formulaList(u)}
      <p class="row links-row"><a class="link" href="#formulas">All formulas</a>${u === 11 ? `<a class="link" href="#normal-table">Normal table</a>` : ""}</p>`;
  }

  function viewFormulas() {
    return `<p class="crumb"><a class="link" href="#units">All units</a></p>
      <h1 class="title">Formulas</h1>
      <p class="lede">Say or write each one from memory, then open it to check. A Fall 2023 MATH 156 syllabus allowed one hand-written, two-sided formula sheet in exams. If yours does too, copying from here by hand is good revision.</p>
      ${openClose}
      ${UNITS.map((u) => `<section class="fgroup"><h2 class="section"><a href="#unit-${u.id}">${u.id}. ${esc(u.name)}</a></h2>${formulaList(u.id)}</section>`).join("")}
      <p class="row links-row"><a class="link" href="#normal-table">Normal table</a></p>`;
  }

  function viewTable() {
    const cols = Array.from({ length: 10 }, (_, j) => j);
    const head = `<tr><th scope="col"><i>z</i></th>${cols.map((j) => `<th scope="col">.0${j}</th>`).join("")}</tr>`;
    const body = Z_TABLE.map((row, i) => `<tr><th scope="row">${(i / 10).toFixed(1)}</th>${row.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("");
    return `<p class="crumb"><a class="link" href="#units">All units</a></p>
      <h1 class="title">Standard normal table</h1>
      <p class="lede">${tex(String.raw`$\Phi(z) = P(Z \le z)$ is the area under the standard normal curve to the left of $z$. Take the row for the first decimal and the column for the second: $\Phi(1.28)$ is in row $1.2$, column $.08$. For negative $z$, use $\Phi(-z) = 1 - \Phi(z)$.`)}</p>
      <div class="ztable-wrap" tabindex="0" role="region" aria-label="Standard normal table"><table class="ztable"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  // ---------- exams ----------

  function viewExams() {
    const run = state.run;
    if (run && examById(run.id) && examQuestions(run).length) return examRun(run);
    if (run) { state.run = null; save(); }

    const rows = EXAMS.map((ex) => {
      const qs = ex.questions;
      const meta = [`${qs ? qs.length : UNITS.length} questions${qs ? ", " + sum(qs, (q) => q.marks) + " marks" : ""}, ${ex.minutes} minutes`];
      const day = DAYS.find((d) => d.exam === ex.id);
      if (day) meta.push("Planned for " + shortDate(day.date));
      const last = state.attempts.filter((a) => a.id === ex.id).slice(-1)[0];
      if (last) meta.push(`Last score ${last.pct}% on ${monthDay(last.date)}`);
      return `<li class="mock">
          <div><h3>${esc(ex.name)}</h3><p class="scope">${esc(ex.scope)}</p><p class="quiet small">${esc(meta.join(". "))}.</p></div>
          <button type="button" class="btn tight${last ? " plain" : ""}" data-action="startmock" data-id="${ex.id}">${last ? "Sit it again" : "Start"}</button>
        </li>`;
    }).join("");

    const rules = [
      String.raw`A Fall 2023 MATH 156 syllabus allowed no calculator in the midterm or final, so leave answers exact, such as $e^{-2}$ or $\ln 4$, unless a decimal is easy by hand.`,
      String.raw`The same syllabus allowed one hand-written, two-sided letter-size formula sheet. Check your own course outline, and use your sheet in every exam here so you know where everything is.`,
      String.raw`Show every step. Marks go to the method, and a bare answer can earn nothing.`,
      String.raw`Mark each exam the same day or the next, and log every lost mark under Mistakes.`,
    ];

    return `<h1 class="title">Exams</h1>
      <p class="lede">Paper, pen, no notes and your phone in another room. The clock starts when you press Start, and your score is saved when you finish marking.</p>
      <ul class="mocks">${rows}</ul>
      <section class="rules"><h2 class="section">Rules to practise under</h2><ul class="bullets">${rules.map((x) => `<li>${tex(x)}</li>`).join("")}</ul></section>
      <p class="quiet small note">A past final from your instructor is the best mock of all; use these when you have none left. Every question here was written for this plan.</p>`;
  }

  function examRun(run) {
    const qs = examQuestions(run);
    const total = sum(qs, (q) => q.marks);
    const name = examById(run.id).name;

    if (run.phase === "run") {
      return `<div class="exam-bar"><strong>${esc(name)}</strong><span id="timer" role="timer">${clock(run)}</span></div>
        <p class="quiet small">${qs.length} questions, ${total} marks. No calculator. Show all of your work on paper.</p>
        <ol class="questions exam">${qs.map((q, i) => `<li class="question">
          <p class="qhead"><span class="qn">${i + 1}</span><span class="quiet small">${plural(q.marks, "mark")}</span></p>
          <div class="qtext">${tex(q.q)}</div></li>`).join("")}</ol>
        <div class="row end">
          <button type="button" class="btn" data-action="finish">Finish and mark</button>
          ${inFrame ? "" : `<button type="button" class="btn plain" data-action="print">Print the questions</button>`}
          <button type="button" class="link" data-action="abandon" data-key="abandon">${armed === "abandon" ? "Press again to stop. Nothing will be saved" : "Stop without marking"}</button>
        </div>`;
    }

    const got = sum(qs, (q, i) => Number(run.marks[i]) || 0);
    const pct = Math.round((100 * got) / total);

    if (run.phase === "mark") {
      return `<h1 class="title">Mark ${esc(name)}</h1>
        <p class="lede">Compare your paper with each solution and give yourself marks for the steps you got right. Be strict: an unsupported answer earns nothing on the real exam.</p>
        <ol class="questions exam">${qs.map((q, i) => `<li class="question">
          <p class="qhead"><span class="qn">${i + 1}</span><span class="quiet small">Unit ${q.unit}</span></p>
          <div class="qtext">${tex(q.q)}</div>
          ${solution(q)}
          <p class="score"><label for="mk-${i}">Your marks</label>
            <input id="mk-${i}" data-key="mk-${i}" data-mark="${i}" type="number" min="0" max="${q.marks}" step="0.5" inputmode="decimal" value="${run.marks[i] == null ? "" : run.marks[i]}"> <span>of ${q.marks}</span></p>
        </li>`).join("")}</ol>
        <div class="row end">
          <span class="tally"><strong>${got} of ${total}</strong> so far</span>
          <button type="button" class="btn" data-action="savescore" data-key="savescore">${armed === "savescore" ? "Save anyway" : "Save my score"}</button>
          ${armed === "savescore" ? `<span class="quiet small">Questions without marks will count as zero.</span>` : ""}
        </div>`;
    }

    const lost = qs.map((q, i) => ({ q, i, got: Number(run.marks[i]) || 0 })).filter((x) => x.got < x.q.marks);
    const where = SCORE_NAME[run.id] ? `Saved under Progress as ${SCORE_NAME[run.id]}.` : "Saved in your exam history under Progress.";
    return `<h1 class="title">${esc(name)}: ${pct}%</h1>
      <p class="lede">${got} of ${total} marks. ${where}${lost.length ? " Log each question where you lost marks, so it comes back until it is fixed." : " Full marks: nothing to log."}</p>
      ${lost.length ? `<ul class="lost">${lost.map((x) => `<li>
          <span>Question ${x.i + 1}, Unit ${x.q.unit}: ${x.got} of ${x.q.marks}</span>
          <button type="button" class="link" data-action="logfrom" data-unit="${x.q.unit}" data-source="${esc(name + " Q" + (x.i + 1))}">Log this mistake</button>
        </li>`).join("")}</ul>` : ""}
      <div class="row end"><button type="button" class="btn plain" data-action="closemock">Back to exams</button></div>`;
  }

  // ---------- progress ----------

  function viewProgress() {
    const tests = DAYS.filter((d) => d.test);
    const filled = tests.filter((d) => state.scores[d.test] != null);
    let trend = "Record each test score here. The first one is your baseline.";
    if (filled.length === 1) trend = `Baseline: ${filled[0].test}, ${state.scores[filled[0].test]}%.`;
    if (filled.length >= 2) {
      const a = state.scores[filled[0].test], z = state.scores[filled[filled.length - 1].test];
      const d = z - a, first = `your first score (${filled[0].test}, ${a}%)`;
      trend = d > 0 ? `Up ${plural(d, "point")} on ${first}.`
        : d < 0 ? `Down ${plural(-d, "point")} on ${first}. Look at which unit lost them.`
        : `Level with ${first}.`;
    }

    const scoreRows = tests.map((d) => {
      const v = state.scores[d.test];
      return `<li>
        <strong>${esc(d.test)}</strong>
        <span class="date quiet small">${monthDay(d.date)}</span>
        <span class="score"><input data-key="score-${d.date}" data-score="${esc(d.test)}" type="number" min="0" max="100" inputmode="numeric" value="${v == null ? "" : v}" aria-label="${esc(d.test)} score in percent"> <span>%</span></span>
        <span class="bar" aria-hidden="true"><i style="width:${v == null ? 0 : Math.max(0, Math.min(100, v))}%"></i></span>
      </li>`;
    }).join("");

    const focus = focusUnits(3);
    const focusHtml = focus.length ? `<h2 class="section">Focus next</h2><ul class="focus-list">${focus.map((u) =>
      `<li><a class="link" href="#unit-${u.id}">Unit ${u.id}: ${esc(u.name)}</a> <span class="quiet small">${esc(reasons(u.id))}</span></li>`).join("")}</ul>` : "";

    const history = state.attempts.length ? `<h2 class="section">Exam history</h2><ul class="history">${state.attempts.slice().reverse().map((a) =>
      `<li><span>${esc((examById(a.id) || { name: a.id }).name)}</span><span class="quiet small">${monthDay(a.date)}</span><span><strong>${a.pct}%</strong> <span class="quiet small">${a.got} of ${a.total}</span></span></li>`).join("")}</ul>` : "";

    const counts = { Red: 0, Yellow: 0, Green: 0 };
    UNITS.forEach((u) => { if (counts[state.units[u.id]] != null) counts[state.units[u.id]]++; });
    const unrated = UNITS.length - counts.Red - counts.Yellow - counts.Green;
    const tally = unrated === UNITS.length ? "Rate each unit after you practise it."
      : `${counts.Green} green, ${counts.Yellow} yellow, ${counts.Red} red${unrated ? `, ${unrated} not rated` : ""}`;

    const unitRows = UNITS.map((u) => {
      const r = state.units[u.id] || "";
      const dots = ["Red", "Yellow", "Green"].map((c) =>
        `<button type="button" class="dot ${c.toLowerCase()}" data-action="rate" data-unit="${u.id}" data-rating="${c}" data-key="rate-${u.id}-${c}" aria-pressed="${r === c}" aria-label="Unit ${u.id}: ${c}" title="${c}"></button>`).join("");
      return `<li class="unit">
        <span class="n">${u.id}</span>
        <div>
          <h3><a href="#unit-${u.id}">${esc(u.name)}</a></h3>
          <p>${esc(unitBits(u.id))}</p>
        </div>
        <div class="rate"><span class="now">${r || "Not rated"}</span>${dots}</div>
      </li>`;
    }).join("");

    return `<h1 class="title">Progress</h1>
      <p class="lede">${doneCount()} of ${DAYS.length} sessions done. ${esc(trend)}</p>
      ${focusHtml}
      <h2 class="section">Test scores</h2>
      <ul class="scores">${scoreRows}</ul>
      ${history}
      <h2 class="section">Units <span class="quiet">${tally}</span></h2>
      <ul>${unitRows}</ul>`;
  }

  // ---------- mistakes ----------

  function mistakeItem(m, mode) {
    const unit = unitById(m.unit);
    const meta = [`Unit ${m.unit}: ${unit ? unit.name : ""}`, m.type, m.source, "logged " + monthDay(m.added)].filter(Boolean).join(", ");
    let row = "";
    if (mode === "due") {
      row = `<button type="button" class="btn tight" data-action="clean" data-id="${m.id}">Solved it cleanly</button>
        <button type="button" class="btn plain tight" data-action="again" data-id="${m.id}">Missed it again</button>
        <span class="quiet small">${m.clean ? "One clean retry so far" : "Needs two clean retries"}</span>`;
    } else if (mode === "waiting") {
      row = `<span class="quiet small">Comes back ${shortDate(m.next)}${m.clean ? ", one clean retry so far" : ""}</span>`;
    } else {
      row = `<span class="quiet small">Closed after two clean retries</span>`;
    }
    return `<li class="mistake">
      <p class="meta">${esc(meta)}</p>
      <p class="what">${esc(m.what)}</p>
      ${m.fix ? `<p class="fix"><b>Fix:</b> ${esc(m.fix)}</p>` : ""}
      <div class="row">${row}<button type="button" class="link small" data-action="remove" data-id="${m.id}" data-key="rm-${m.id}">${armed === "rm-" + m.id ? "Press again to remove" : "Remove"}</button></div>
    </li>`;
  }

  function viewMistakes() {
    const t = today();
    const open = openMistakes();
    const due = open.filter((m) => m.next <= t).sort((a, b) => a.next.localeCompare(b.next));
    const waiting = open.filter((m) => m.next > t).sort((a, b) => a.next.localeCompare(b.next));
    const closed = state.mistakes.filter((m) => m.closed);

    let lede = "Log every problem you get wrong. Each one comes back 3 days later and stays until you solve it cleanly twice in a row.";
    let split = "";
    if (state.mistakes.length >= 3) {
      const tally = Object.keys(MISTAKE_TYPES).map((k) => [k, state.mistakes.filter((m) => m.type === k).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
      const advice = {
        Concept: "Reread the explanations for those units before doing more problems.",
        Method: "Write every step out in full until the method is automatic.",
        Careless: "Slow down on the last two lines and check each answer by substituting it back.",
        Time: "Do your next sets against a clock.",
      };
      lede = `${tally[0][1]} of your ${state.mistakes.length} logged mistakes are ${tally[0][0].toLowerCase()} mistakes. ${advice[tally[0][0]]}`;
      split = `<div class="split" role="img" aria-label="${esc(tally.map((x) => x[0] + " " + x[1]).join(", "))}">${tally.map((x) => `<i style="flex:${x[1]}"></i>`).join("")}</div>
        <p class="quiet small" style="margin-top:8px">${esc(tally.map((x) => x[0] + " " + x[1]).join(", "))}</p>`;
    }

    const d = draft || {};
    const unitOptions = UNITS.map((u) => `<option value="${u.id}"${d.unit === u.id ? " selected" : ""}>${u.id}. ${esc(u.name)}</option>`).join("");
    const typeOptions = Object.keys(MISTAKE_TYPES).map((k) => `<option value="${k}">${k}: ${esc(MISTAKE_TYPES[k])}</option>`).join("");

    return `<h1 class="title">Mistakes</h1>
      <p class="lede">${esc(lede)}</p>
      ${split}

      <h2 class="section">Retry today <span class="quiet">${due.length}</span></h2>
      ${due.length ? `<ul>${due.map((m) => mistakeItem(m, "due")).join("")}</ul>` : `<p class="empty">${open.length ? "Nothing to retry today." : "No mistakes logged yet. After each session, add every problem you got wrong."}</p>`}

      <h2 class="section">Log a mistake</h2>
      <form class="log" id="log" autocomplete="off">
        <label class="field"><span>Unit</span><select name="unit" required>${unitOptions}</select></label>
        <label class="field"><span>Type</span><select name="type" required>${typeOptions}</select></label>
        <label class="field wide"><span>Where it came from</span><input name="source" maxlength="80" placeholder="Midterm Q4, Quiz 3, A6 #2" value="${esc(d.source || "")}"></label>
        <label class="field wide"><span>What went wrong</span><textarea name="what" required maxlength="600" data-key="what"></textarea></label>
        <label class="field wide"><span>The fix, in one sentence</span><input name="fix" maxlength="240"></label>
        <button class="btn wide" type="submit">Log mistake</button>
      </form>

      ${waiting.length ? `<h2 class="section">Coming back later <span class="quiet">${waiting.length}</span></h2><ul>${waiting.map((m) => mistakeItem(m, "waiting")).join("")}</ul>` : ""}
      ${closed.length ? `<details class="closed"><summary>Closed (${closed.length})</summary><ul>${closed.map((m) => mistakeItem(m, "closed")).join("")}</ul></details>` : ""}`;
  }

  // ---------- routing and rendering ----------

  const VIEWS = { today: viewToday, plan: viewPlan, units: viewUnits, exams: viewExams, formulas: viewFormulas, "normal-table": viewTable, progress: viewProgress, mistakes: viewMistakes };
  const NAV_OF = { unit: "units", formulas: "units", "normal-table": "units" };
  const TITLES = { today: "Today", plan: "Plan", units: "Units", exams: "Exams", formulas: "Formulas", "normal-table": "Normal table", progress: "Progress", mistakes: "Mistakes" };

  function route() {
    const h = location.hash.slice(1);
    const m = /^unit-(\d+)(?:-(check|practice|formulas))?$/.exec(h);
    if (m && unitById(Number(m[1]))) return { name: "unit", unit: Number(m[1]), tab: m[2] || "learn" };
    if (h === "practice") return { name: "units" };
    if (h === "mocks") return { name: "exams" };
    return VIEWS[h] ? { name: h } : { name: "today" };
  }

  const view = document.getElementById("view");

  function render(keepKey) {
    const r = route();
    view.innerHTML = r.name === "unit" ? viewUnit(r.unit, r.tab) : VIEWS[r.name]();
    const navName = NAV_OF[r.name] || r.name;
    document.querySelectorAll(".top nav a").forEach((a) => {
      if (a.dataset.view === navName) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = (r.name === "unit" ? "Unit " + r.unit + ": " + unitById(r.unit).name : TITLES[r.name]) + ", MATH 156 final prep";
    const left = diff(EXAM_DATE, today());
    document.getElementById("countdown").textContent = left > 0 ? plural(left, "day") + " left" : left === 0 ? "is today" : "";
    const due = dueMistakes().length;
    document.getElementById("due-badge").textContent = due ? due : "";
    if (r.name === "mistakes" && draft) { draft = null; keepKey = "what"; }
    if (keepKey) { const el = view.querySelector(`[data-key="${keepKey}"]`); if (el) el.focus(); }
  }

  const toTop = () => window.scrollTo(0, 0);

  // ---------- actions ----------

  view.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.tagName === "INPUT") return;
    const a = el.dataset.action, t = today();
    const wasArmed = armed; armed = null;
    const twice = (key) => { if (wasArmed === key) return true; armed = key; render(key); return false; };

    if (a === "openall" || a === "closeall") { view.querySelectorAll("details.formula").forEach((d) => { d.open = a === "openall"; }); return; }
    if (a === "print") { window.print(); return; }
    if (a === "logfrom") { draft = { unit: Number(el.dataset.unit), source: el.dataset.source }; location.hash = "#mistakes"; return; }
    if (a === "answer") {
      const key = checkKey(Number(el.dataset.unit), Number(el.dataset.i));
      if (state.checks[key] == null) state.checks[key] = Number(el.dataset.j);
      save(); render("fb-" + el.dataset.i); return;
    }
    if (a === "resetchecks") { const u = Number(el.dataset.unit); checksIn(u).forEach((c, i) => { delete state.checks[checkKey(u, i)]; }); save(); render(); toTop(); return; }
    if (a === "read") { const u = el.dataset.unit; if (state.read[u]) delete state.read[u]; else state.read[u] = true; save(); render("read"); return; }
    if (a === "hint") { hinted.add(el.dataset.id); render("hinttext-" + el.dataset.id); return; }
    if (a === "reveal") shown.add(el.dataset.id);
    if (a === "mark") { const id = el.dataset.id; if (state.practice[id] === el.dataset.result) delete state.practice[id]; else state.practice[id] = el.dataset.result; }
    if (a === "startmock") {
      const ex = examById(el.dataset.id);
      state.run = { id: ex.id, start: Date.now(), minutes: ex.minutes, phase: "run", marks: {}, items: ex.id === "mixed" ? pickMixed() : null };
      save(); render(); toTop(); return;
    }
    if (a === "finish") { state.run.phase = "mark"; save(); render(); toTop(); return; }
    if (a === "abandon") { if (!twice("abandon")) return; state.run = null; save(); render(); toTop(); return; }
    if (a === "savescore") {
      const qs = examQuestions(state.run);
      if (qs.some((q, i) => state.run.marks[i] == null) && !twice("savescore")) return;
      const total = sum(qs, (q) => q.marks), got = sum(qs, (q, i) => Number(state.run.marks[i]) || 0);
      const pct = Math.round((100 * got) / total);
      if (SCORE_NAME[state.run.id]) state.scores[SCORE_NAME[state.run.id]] = pct;
      state.attempts.push({ id: state.run.id, date: t, got, total, pct });
      state.run.phase = "done"; save(); render(); toTop(); return;
    }
    if (a === "closemock") { state.run = null; save(); render(); toTop(); return; }
    if (a === "pick") selected = el.dataset.date === t ? null : el.dataset.date;
    if (a === "toggle") { const d = el.dataset.date; if (state.done[d]) delete state.done[d]; else state.done[d] = true; }
    if (a === "rate") { const u = el.dataset.unit, r = el.dataset.rating; if (state.units[u] === r) delete state.units[u]; else state.units[u] = r; }
    const m = el.dataset.id ? state.mistakes.find((x) => String(x.id) === el.dataset.id) : null;
    if (a === "clean" && m) { m.clean = (m.clean || 0) + 1; if (m.clean >= 2) m.closed = true; else m.next = addDays(t, 4); }
    if (a === "again" && m) { m.clean = 0; m.next = addDays(t, 3); }
    if (a === "remove" && m) { if (!twice("rm-" + m.id)) return; state.mistakes = state.mistakes.filter((x) => x !== m); }
    save();
    render(el.dataset.key);
  });

  view.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.action === "toggle") {
      if (el.checked) state.done[el.dataset.date] = true; else delete state.done[el.dataset.date];
      save(); render(el.dataset.key);
    }
    if (el.dataset.mark != null && state.run) {
      const i = Number(el.dataset.mark), max = Number(el.max);
      if (el.value === "") delete state.run.marks[i];
      else { state.run.marks[i] = Math.max(0, Math.min(max, Math.round(Number(el.value) * 2) / 2)); el.value = state.run.marks[i]; }
      save();
      // Update the running total in place, so tabbing through the marks is not interrupted.
      const qs = examQuestions(state.run), tally = view.querySelector(".tally strong");
      if (tally) tally.textContent = sum(qs, (q, k) => Number(state.run.marks[k]) || 0) + " of " + sum(qs, (q) => q.marks);
    }
    if (el.dataset.score) {
      const n = el.value === "" ? null : Math.max(0, Math.min(100, Math.round(Number(el.value))));
      if (n == null || isNaN(n)) delete state.scores[el.dataset.score]; else state.scores[el.dataset.score] = n;
      save(); render(el.dataset.key);
    }
  });

  view.addEventListener("submit", (e) => {
    if (e.target.id !== "log") return;
    e.preventDefault();
    const f = new FormData(e.target), t = today();
    const what = String(f.get("what") || "").trim();
    if (!what) return;
    state.mistakes.push({
      id: state.seq++, unit: Number(f.get("unit")), type: String(f.get("type")),
      source: String(f.get("source") || "").trim(), what, fix: String(f.get("fix") || "").trim(),
      added: t, next: addDays(t, 3), clean: 0, closed: false,
    });
    save(); render();
  });

  // ---------- backup ----------

  const $ = (id) => document.getElementById(id);
  const say = (text) => { $("backup-msg").textContent = text; };
  let pending = null;

  function offerRestore(txt) {
    let data;
    try { data = JSON.parse(txt); } catch (e) { data = null; }
    if (!data || typeof data.done !== "object" || !Array.isArray(data.mistakes)) { pending = null; $("restore-confirm").hidden = true; say("That is not a backup from this site."); return; }
    pending = data;
    say("Replace the progress saved in this browser with this backup?");
    $("restore-confirm").hidden = false;
  }

  if (inFrame) $("export").hidden = true; // embedded viewers block downloads; copying still works

  $("export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "math156-prep-" + today() + ".json" });
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    say("Backup downloaded.");
  });

  $("copy").addEventListener("click", () => {
    const txt = JSON.stringify(state);
    const done = () => say("Backup copied. Paste it into a note or a message to yourself.");
    const fallback = () => { $("paste").value = txt; $("paste").select(); say("Copy the selected text and keep it somewhere safe."); };
    try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
  });

  $("import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", () => {
    const file = $("import-file").files[0];
    if (!file) return;
    file.text().then(offerRestore).finally(() => { $("import-file").value = ""; });
  });
  $("paste-go").addEventListener("click", () => offerRestore($("paste").value));
  $("restore-yes").addEventListener("click", () => {
    if (!pending) return;
    state = Object.assign(blank(), pending); pending = null; save(); render();
    $("restore-confirm").hidden = true; $("paste").value = ""; say("Backup restored.");
  });
  $("restore-no").addEventListener("click", () => { pending = null; $("restore-confirm").hidden = true; say(""); });

  // ---------- start ----------

  $("rules").innerHTML = RULES.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("");
  setInterval(() => {
    const el = $("timer");
    if (el && state.run && state.run.phase === "run") el.textContent = clock(state.run);
  }, 1000);
  window.addEventListener("hashchange", () => { selected = null; armed = null; render(); toTop(); });
  render();
})();
