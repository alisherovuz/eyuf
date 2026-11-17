// MATH 156 final prep: the plan itself. Edit a day here and the whole site follows.

const EXAM_DATE = "2026-12-21";

const PHASES = {
  Diagnose: "Find out where the marks went",
  Rebuild: "Relearn the midterm material, one unit at a time",
  "Keep up": "Stay on top of the current lectures",
  Checkpoint: "Measure the rebuild",
  Probability: "Lock in the post-midterm material",
  Mocks: "Timed exams, then fix what they expose",
  Exam: "The final",
};

// test: the name of the score to record that day.
const DAYS = [
  { date: "2026-11-17", phase: "Diagnose", focus: "Setup and midterm redo, part 1", plan: "Gather your marked midterm, Quizzes 1 to 4 and Online A1 to A7 with solutions. Then redo the first half of the midterm on blank paper, no notes, 45 min timed." },
  { date: "2026-11-18", phase: "Diagnose", focus: "Midterm redo, part 2, and first mistakes", plan: "Redo the second half, 45 min timed. Mark both halves. Log every lost mark under Mistakes and give each unit a first colour under Progress.", test: "Midterm redo" },
  { date: "2026-11-19", phase: "Rebuild", focus: "Unit 1: substitution and integration by parts", plan: "Write the rules from memory, then 12 problems from 7.1 and your A1. Start Online A8." },
  { date: "2026-11-20", phase: "Rebuild", focus: "Unit 1: integration tables and mixed integrals", plan: "Submit A8 first. Then 10 mixed integrals where you have to choose the method yourself.", due: "Online A8, 16:00" },
  { date: "2026-11-21", phase: "Rebuild", focus: "Unit 2: improper integrals, perpetuity and present value", plan: "8 improper integrals from 7.3 (converges or diverges, and why). 4 perpetuity and present value word problems from 7.4." },
  { date: "2026-11-22", phase: "Rebuild", focus: "Unit 2: L'Hopital's rule, then weekly review", plan: "10 limits with indeterminate forms. Weekly review: do the retries that are due and recolour your units." },
  { date: "2026-11-23", phase: "Keep up", focus: "Quiz 5 prep: covariance, correlation, normal distribution", plan: "Rework last week's lecture examples without looking at the solutions, then start the Quiz 5 practice problems." },
  { date: "2026-11-24", phase: "Keep up", focus: "Quiz 5 prep: finish the practice set", plan: "Finish the Quiz 5 practice problems under time. Drill converting to z-scores until it is automatic. Go to class with your open questions." },
  { date: "2026-11-25", phase: "Rebuild", focus: "Quiz 5, then Unit 3: Taylor polynomials", plan: "After the quiz: 6 Taylor polynomial problems from 11.1. Log any quiz mistakes tonight while you still remember them.", due: "Quiz 5" },
  { date: "2026-11-26", phase: "Rebuild", focus: "Unit 3: first order linear differential equations", plan: "8 problems from 9.2 with the integrating factor method, every step written out. Start Online A9." },
  { date: "2026-11-27", phase: "Rebuild", focus: "Unit 4: functions of two variables, partial derivatives", plan: "Submit A9 first. Sketch 4 sets of level curves, then 12 first order partial derivatives from 8.1 and 8.2.", due: "Online A9, 16:00" },
  { date: "2026-11-28", phase: "Rebuild", focus: "Unit 4: second order partials and economics applications", plan: "8 second order partials. 6 problems on marginal productivity and on substitute and complementary commodities." },
  { date: "2026-11-29", phase: "Rebuild", focus: "Unit 5: tangent plane, chain rule, gradient, then weekly review", plan: "Stewart 14.4 to 14.6: 3 tangent planes, 5 chain rule problems, 4 gradients. Weekly review: retries that are due and a 30 min mini test on Units 1 to 3." },
  { date: "2026-11-30", phase: "Rebuild", focus: "Unit 6: critical points and the second derivative test", plan: "8 problems from 8.3. Classify every critical point as a maximum, minimum or saddle point." },
  { date: "2026-12-01", phase: "Rebuild", focus: "Unit 6: absolute extrema and profit maximization", plan: "6 word problems. Write the full setup every time: variables, function, critical points, test, answer in words." },
  { date: "2026-12-02", phase: "Rebuild", focus: "Unit 7: Lagrange multipliers", plan: "6 constrained optimization problems from 8.5. Solve the system fully, do not stop at setting it up." },
  { date: "2026-12-03", phase: "Rebuild", focus: "Unit 7: constrained word problems", plan: "5 word problems. Write the constraint before anything else. Start Online A10." },
  { date: "2026-12-04", phase: "Rebuild", focus: "Unit 8: the total differential", plan: "Submit A10 first. Then 6 approximation problems from 8.6.", due: "Online A10, 16:00" },
  { date: "2026-12-05", phase: "Rebuild", focus: "Unit 8: double integrals", plan: "10 iterated integrals from 8.7, including 3 where you set up the bounds from a region yourself." },
  { date: "2026-12-06", phase: "Checkpoint", focus: "Checkpoint test on Units 1 to 8", plan: "90 min timed, no notes: sit the Checkpoint test under Exams, or your real midterm again. Mark it, log the mistakes, recolour your units and compare with your midterm redo.", test: "Checkpoint", exam: "checkpoint" },
  { date: "2026-12-07", phase: "Probability", focus: "Unit 9: density functions and joint densities", plan: "8 problems from 10.1: check that a density integrates to 1, compute probabilities, and 3 joint density double integrals." },
  { date: "2026-12-08", phase: "Probability", focus: "Unit 10: expected value, variance, Poisson", plan: "10 problems from 10.2, discrete and continuous. In the last class, ask what the final covers and whether a formula sheet or calculator is allowed.", due: "Last day of classes" },
  { date: "2026-12-09", phase: "Probability", focus: "Unit 11: covariance, correlation, normal distribution", plan: "10 problems from 10.3. Redo Quiz 5 from a blank page." },
  { date: "2026-12-10", phase: "Probability", focus: "Unit 12: Markov, Chebyshev, cumulative distribution functions", plan: "8 problems. Practise going from a density to its cumulative distribution function and back." },
  { date: "2026-12-11", phase: "Probability", focus: "Probability test on Units 9 to 12", plan: "Sit the Probability test under Exams, 75 min timed, no notes. If time is left, redo problems from Online A6 to A10 and Quizzes 4 and 5.", test: "Probability test", exam: "probability" },
  { date: "2026-12-12", phase: "Mocks", focus: "Mock exam 1", plan: "Full length, timed, no notes, phone in another room. Use a past final from your instructor if you can get one. Otherwise sit Mock 1 under Exams.", exam: "mock1" },
  { date: "2026-12-13", phase: "Mocks", focus: "Mark mock 1, then weekly review", plan: "Mark it honestly. Log every mistake, redo each wrong question from scratch, recolour your units.", test: "Mock 1" },
  { date: "2026-12-14", phase: "Mocks", focus: "Your weakest unit", plan: "The link below points to your weakest unit right now. Reread its explanation, redo every practice question you missed, then 10 fresh problems from the textbook." },
  { date: "2026-12-15", phase: "Mocks", focus: "Your second weakest unit", plan: "Same routine for your second weakest unit, plus every open mistake for that unit." },
  { date: "2026-12-16", phase: "Mocks", focus: "Mock exam 2", plan: "Same rules as mock 1: sit Mock 2 under Exams, or a second past final. The goal is to beat your mock 1 score.", exam: "mock2" },
  { date: "2026-12-17", phase: "Mocks", focus: "Mark mock 2", plan: "Log, redo, recolour. Anything still red gets tomorrow's session.", test: "Mock 2" },
  { date: "2026-12-18", phase: "Mocks", focus: "Formula sheet from memory and mistake sweep", plan: "Write every formula for all 12 units from memory, check against the Formulas page, and repeat the ones you missed. If your section allows a hand-written formula sheet, write the final version today. Retry every open mistake." },
  { date: "2026-12-19", phase: "Mocks", focus: "Mock exam 3", plan: "Last timed run: sit Mock 3 under Exams, or the mixed set if you have already seen Mock 3. Mark it tonight.", test: "Mock 3", exam: "mock3" },
  { date: "2026-12-20", phase: "Mocks", focus: "Light review", plan: "60 min at most: read your mistakes and formula sheet, redo 5 easy problems. Pack your ONEcard and pens. Stop by early evening." },
  { date: "2026-12-21", phase: "Exam", focus: "Final exam", plan: "Look over the formula sheet once, then put it away.", due: "Final exam" },
];

const UNITS = [
  { id: 1, name: "Integration techniques", topics: "Substitution, integration by parts, integration tables", ref: "7.1, 7.2" },
  { id: 2, name: "Improper integrals and limits", topics: "Improper integrals, perpetuities and present value, L'Hopital's rule", ref: "7.3, 7.4" },
  { id: 3, name: "Taylor and differential equations", topics: "Taylor's theorem, first order linear differential equations", ref: "11.1, 9.2" },
  { id: 4, name: "Partial derivatives", topics: "Functions of two variables, level sets, first and second order partials, economics applications", ref: "8.1, 8.2" },
  { id: 5, name: "Tangent plane, chain rule, gradient", topics: "Tangent planes, chain rule with intermediate variables, gradient", ref: "Stewart 14.4 to 14.6" },
  { id: 6, name: "Unconstrained optimization", topics: "Critical points, second derivative test, absolute extrema, profit maximization", ref: "8.3" },
  { id: 7, name: "Lagrange multipliers", topics: "Optimization with constraints", ref: "8.5" },
  { id: 8, name: "Differentials and double integrals", topics: "Total differential, Riemann sums over a region, iterated integrals", ref: "8.6, 8.7" },
  { id: 9, name: "Continuous random variables", topics: "Density functions, computing probabilities, joint densities", ref: "10.1" },
  { id: 10, name: "Expectation and variance", topics: "Expected value, Poisson distribution, variance, standard deviation", ref: "10.2" },
  { id: 11, name: "Covariance and the normal distribution", topics: "Covariance, correlation, normal and standard normal distribution", ref: "10.3" },
  { id: 12, name: "Inequalities and distribution functions", topics: "Markov, Chebyshev, cumulative distribution functions", ref: "Week 12 notes" },
];

const MISTAKE_TYPES = {
  Concept: "I did not know what to do",
  Method: "I knew the idea, the steps went wrong",
  Careless: "Algebra, sign or copying slip",
  Time: "I could do it, but too slowly",
};

const RULES = [
  ["The daily session", "10 min: write the unit's formulas and solution steps from memory on blank paper. 60 to 70 min: problems with notes closed, checking the solution only after a full attempt. 10 min: log your mistakes and mark the day done."],
  ["Problems before notes", "Rereading notes feels productive and mostly is not. Open your notes only to fix a specific gap that a problem exposed."],
  ["Mistakes", "Every lost mark gets logged with its unit, its type and the fix in one sentence. The site brings it back 3 days later, and again after that. It closes only after two clean retries in a row."],
  ["Unit colours", "Red: you cannot start without notes. Yellow: you can do it slowly or with small slips. Green: 80% or better on a timed set with no notes."],
  ["If you miss a day", "Do not double up the next day. Move it to the coming Sunday or cut the least useful part. Mock exam days are never dropped."],
  ["Units", "Each unit has an explanation, a quick check, practice questions with worked solutions, and its formulas. Read the explanation when a method feels shaky. Attempt every question on paper before opening the answer, and mark yourself honestly. A missed question can go straight into the mistake log."],
  ["Exam rules", "A Fall 2023 MATH 156 syllabus allowed no calculator and one hand-written, two-sided letter-size formula sheet on the midterm and final. Check your own course outline, and practise under the same rules."],
  ["Mock exams", "Full length, timed, no notes, phone in another room. Marking it and redoing the mistakes the next day matters as much as sitting it."],
  ["Session length", "The plan assumes about 90 minutes on weekdays and 2 to 3 hours on weekend days. If you have less, cut the problem count, not the recall or the mistake log."],
];
