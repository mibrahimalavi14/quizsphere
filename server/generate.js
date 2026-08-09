import { db } from './db.js';

const TARGET_PER_SUBJECT = 50;
const SLEEP_MS = 6000;
const AMOUNT_PER_REQUEST = 50;

const CATEGORY_MAP = {
  'General Knowledge': 9,
  'Science': 17,
  'Mathematics': 19,
  'Computer Science': 18,
  'History': 23,
};

const POINTS_BY_DIFF = { easy: 1, medium: 2, hard: 3 };
const TIME_BY_DIFF = { easy: 15, medium: 20, hard: 25 };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function existingQuestions(subjectId) {
  return new Set(
    db.prepare('SELECT question FROM questions WHERE subject_id = ?').all(subjectId).map((r) => r.question)
  );
}

function insertQuestion(subjectId, question, options, correctIdx, points, timeLimit, difficulty, explanation) {
  db.prepare(`
    INSERT INTO questions (subject_id, question, option_a, option_b, option_c, option_d, correct, points, time_limit, difficulty, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(subjectId, question, options[0], options[1], options[2], options[3], correctIdx, points, timeLimit, difficulty, explanation || '');
}

async function fetchOpenTdb(categoryId) {
  const url = `https://opentdb.com/api.php?amount=${AMOUNT_PER_REQUEST}&category=${categoryId}&type=multiple&encode=url3986`;
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const data = await res.json();
      if (data.response_code === 0) return data.results;
      if (data.response_code === 5) {
        console.log(`    rate limited, retrying in ${SLEEP_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, SLEEP_MS));
        continue;
      }
      if (data.response_code === 1) return data.results || [];
      console.log(`    unexpected response_code ${data.response_code}, retrying...`);
      await new Promise((r) => setTimeout(r, 3000));
    } catch (e) {
      console.log(`    fetch error: ${e.message}, retrying...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return [];
}

async function generateSubject(subject) {
  const existing = existingQuestions(subject.id);
  const count = existing.size;
  const need = TARGET_PER_SUBJECT - count;
  if (need <= 0) {
    console.log(`  ${subject.name}: already ${count} questions (target ${TARGET_PER_SUBJECT}) — skip`);
    return 0;
  }
  console.log(`  ${subject.name}: ${count} → need ${need}`);

  let added = 0;
  if (CATEGORY_MAP[subject.name] !== undefined) {
    const catId = CATEGORY_MAP[subject.name];
    while (added < need) {
      const results = await fetchOpenTdb(catId);
      if (results.length === 0) break;
      let fromBatch = 0;
      for (const r of results) {
        if (added >= need) break;
        const question = decodeURIComponent(r.question);
        if (existing.has(question)) continue;
        const options = shuffle([decodeURIComponent(r.correct_answer), ...r.incorrect_answers.map(decodeURIComponent)]);
        const correctIdx = options.indexOf(decodeURIComponent(r.correct_answer));
        const difficulty = ['easy', 'medium', 'hard'].includes(r.difficulty) ? r.difficulty : 'medium';
        insertQuestion(subject.id, question, options, correctIdx, POINTS_BY_DIFF[difficulty], TIME_BY_DIFF[difficulty], difficulty, '');
        existing.add(question);
        added++;
        fromBatch++;
      }
      console.log(`    +${fromBatch} from OpenTDB (batch), total added so far ${added}/${need}`);
      if (fromBatch === 0) {
        console.log('    no new questions from this batch — stopping');
        break;
      }
      await new Promise((r) => setTimeout(r, SLEEP_MS));
    }
  } else {
    added = generateEnglish(subject.id, existing, need);
  }
  console.log(`  ${subject.name}: finished, +${added} questions`);
  return added;
}

function generateEnglish(subjectId, existing, need) {
  const past = [
    ['go', 'went'], ['eat', 'ate'], ['see', 'saw'], ['take', 'took'], ['write', 'wrote'],
    ['speak', 'spoke'], ['break', 'broke'], ['choose', 'chose'], ['drive', 'drove'], ['forget', 'forgot'],
    ['give', 'gave'], ['know', 'knew'], ['throw', 'threw'], ['wear', 'wore'], ['build', 'built'],
    ['catch', 'caught'], ['teach', 'taught'], ['sell', 'sold'], ['tell', 'told'], ['think', 'thought'],
    ['bring', 'brought'], ['buy', 'bought'], ['sleep', 'slept'], ['keep', 'kept'], ['mean', 'meant'],
  ];
  const plurals = [
    ['child', 'children'], ['man', 'men'], ['woman', 'women'], ['foot', 'feet'], ['tooth', 'teeth'],
    ['mouse', 'mice'], ['goose', 'geese'], ['person', 'people'], ['leaf', 'leaves'], ['wolf', 'wolves'],
    ['knife', 'knives'], ['life', 'lives'], ['wife', 'wives'], ['half', 'halves'], ['shelf', 'shelves'],
    ['datum', 'data'], ['criterion', 'criteria'], ['analysis', 'analyses'], ['crisis', 'crises'], ['axis', 'axes'],
  ];
  const synonyms = [
    ['happy', 'joyful'], ['big', 'large'], ['fast', 'quick'], ['smart', 'intelligent'], ['angry', 'furious'],
    ['small', 'tiny'], ['beautiful', 'gorgeous'], ['tired', 'exhausted'], ['rich', 'wealthy'], ['brave', 'courageous'],
    ['sad', 'unhappy'], ['cold', 'chilly'], ['hot', 'scorching'], ['quiet', 'silent'], ['difficult', 'challenging'],
    ['easy', 'simple'], ['funny', 'humorous'], ['strange', 'weird'], ['important', 'essential'], ['correct', 'accurate'],
  ];
  const antonyms = [
    ['happy', 'sad'], ['big', 'small'], ['fast', 'slow'], ['smart', 'foolish'], ['day', 'night'],
    ['hot', 'cold'], ['light', 'dark'], ['strong', 'weak'], ['rich', 'poor'], ['brave', 'cowardly'],
    ['always', 'never'], ['begin', 'end'], ['buy', 'sell'], ['win', 'lose'], ['arrive', 'depart'],
    ['expand', 'shrink'], ['increase', 'decrease'], ['modern', 'ancient'], ['generous', 'stingy'], ['honest', 'dishonest'],
  ];

  const bank = [];
  for (const [present, pastV] of past) {
    const opts = shuffle([pastV, ...past.filter(([, p]) => p !== pastV).map(([, p]) => p).sort(() => Math.random() - 0.5).slice(0, 3)]);
    bank.push({ q: `What is the past tense of "${present}"?`, opts, correct: opts.indexOf(pastV), points: 1, diff: 'easy', expl: `The past tense of "${present}" is "${pastV}".` });
  }
  for (const [singular, plural] of plurals) {
    const opts = shuffle([plural, ...plurals.filter(([, p]) => p !== plural).map(([, p]) => p).sort(() => Math.random() - 0.5).slice(0, 3)]);
    bank.push({ q: `What is the plural of "${singular}"?`, opts, correct: opts.indexOf(plural), points: 1, diff: 'easy', expl: `The plural of "${singular}" is "${plural}".` });
  }
  for (const [w, syn] of synonyms) {
    const opts = shuffle([syn, ...synonyms.filter(([x]) => x !== w).map(([, s]) => s).sort(() => Math.random() - 0.5).slice(0, 3)]);
    bank.push({ q: `Which word is a synonym of "${w}"?`, opts, correct: opts.indexOf(syn), points: 1, diff: 'medium', expl: `"${syn}" means the same as "${w}".` });
  }
  for (const [w, ant] of antonyms) {
    const opts = shuffle([ant, ...antonyms.filter(([x]) => x !== w).map(([, a]) => a).sort(() => Math.random() - 0.5).slice(0, 3)]);
    bank.push({ q: `Which word is an antonym of "${w}"?`, opts, correct: opts.indexOf(ant), points: 1, diff: 'medium', expl: `"${ant}" means the opposite of "${w}".` });
  }

  let added = 0;
  for (const item of bank) {
    if (added >= need) break;
    if (existing.has(item.q)) continue;
    insertQuestion(subjectId, item.q, item.opts, item.correct, item.points, 20, item.diff, item.expl);
    existing.add(item.q);
    added++;
  }
  console.log(`    +${added} generated English questions`);
  return added;
}

const subjects = db.prepare('SELECT id, name FROM subjects WHERE is_visible = 1 ORDER BY id').all();
console.log('Generating questions...');
for (const subject of subjects) {
  await generateSubject(subject);
}

const totals = db.prepare(`
  SELECT s.name, (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) AS count
  FROM subjects s WHERE s.is_visible = 1 ORDER BY s.name
`).all();
console.log('\nDone. Question counts:');
for (const t of totals) console.log(`  - ${t.name}: ${t.count}`);
