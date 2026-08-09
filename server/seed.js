import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { ensureSpecialSubjects } from './special.js';

const subjects = [
  { name: 'General Knowledge', description: 'World, countries, sports and everyday facts.', icon: '🌍', color: '#f59e0b', rank: 'bronze' },
  { name: 'Science', description: 'Physics, chemistry, biology and space.', icon: '🔬', color: '#10b981', rank: 'bronze' },
  { name: 'Mathematics', description: 'Arithmetic, algebra, geometry and logic.', icon: '➗', color: '#6366f1', rank: 'silver' },
  { name: 'Computer Science', description: 'Programming, hardware, networks and tech.', icon: '💻', color: '#3b82f6', rank: 'gold' },
  { name: 'History', description: 'Ancient and modern world history.', icon: '🏛️', color: '#8b5cf6', rank: 'platinum' },
  { name: 'English', description: 'Grammar, vocabulary and comprehension.', icon: '📖', color: '#ec4899', rank: 'diamond' },
];

const questionsBySubject = {
  'General Knowledge': [
    { q: 'What is the capital city of Pakistan?', a: 'Karachi', b: 'Islamabad', c: 'Lahore', d: 'Rawalpindi', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'Islamabad became the capital of Pakistan in the 1960s, replacing Karachi.' },
    { q: 'Which is the largest ocean in the world?', a: 'Atlantic Ocean', b: 'Indian Ocean', c: 'Arctic Ocean', d: 'Pacific Ocean', correct: 3, points: 1, time: 20, diff: 'easy', expl: 'The Pacific Ocean covers about one-third of the Earth\'s surface.' },
    { q: 'How many continents are there in the world?', a: '5', b: '6', c: '7', d: '8', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Africa, Antarctica, Asia, Australia, Europe, North America and South America.' },
    { q: 'Which country is known as the Land of the Rising Sun?', a: 'China', b: 'South Korea', c: 'Japan', d: 'Thailand', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Japan\'s name in Japanese means "sun origin", as it lies to the east of Asia.' },
    { q: 'What is the currency of the United Kingdom?', a: 'Euro', b: 'Dollar', c: 'Pound Sterling', d: 'Franc', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'The British pound sterling (£) is one of the oldest currencies still in use.' },
    { q: 'Which is the highest mountain in the world?', a: 'K2', b: 'Mount Everest', c: 'Kangchenjunga', d: 'Makalu', correct: 1, points: 2, time: 20, diff: 'medium', expl: 'Mount Everest stands at 8,849 metres in the Himalayas on the Nepal–China border.' },
    { q: 'The Great Wall is located in which country?', a: 'India', b: 'Japan', c: 'Mongolia', d: 'China', correct: 3, points: 1, time: 20, diff: 'easy', expl: 'The Great Wall of China stretches over 21,000 kilometres.' },
    { q: 'Which planet is known as the Red Planet?', a: 'Venus', b: 'Mars', c: 'Jupiter', d: 'Saturn', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'Mars looks red because of iron oxide (rust) on its surface.' },
    { q: 'Which sport is played at Wimbledon?', a: 'Cricket', b: 'Football', c: 'Tennis', d: 'Golf', correct: 2, points: 1, time: 20, diff: 'medium', expl: 'Wimbledon is the oldest tennis tournament in the world, held in London.' },
    { q: 'Which country hosted the 2022 FIFA World Cup?', a: 'Russia', b: 'Brazil', c: 'Qatar', d: 'USA', correct: 2, points: 1, time: 20, diff: 'medium', expl: 'Qatar hosted the 2022 FIFA World Cup, the first in the Middle East.' },
  ],
  'Science': [
    { q: 'What is the chemical symbol for water?', a: 'O2', b: 'CO2', c: 'H2O', d: 'HO', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Water is made of two hydrogen atoms and one oxygen atom: H₂O.' },
    { q: 'What is the powerhouse of the cell?', a: 'Nucleus', b: 'Mitochondria', c: 'Ribosome', d: 'Cell wall', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'Mitochondria generate most of the cell\'s energy as ATP.' },
    { q: 'How many bones are in the adult human body?', a: '206', b: '201', c: '208', d: '210', correct: 0, points: 1, time: 20, diff: 'medium', expl: 'Adults have 206 bones; babies are born with about 300 which fuse together.' },
    { q: 'Which gas do plants absorb from the atmosphere?', a: 'Oxygen', b: 'Nitrogen', c: 'Carbon dioxide', d: 'Hydrogen', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Plants take in CO₂ during photosynthesis and release oxygen.' },
    { q: 'What is the speed of light approximately?', a: '300,000 km/s', b: '150,000 km/s', c: '500,000 km/s', d: '1,000,000 km/s', correct: 0, points: 2, time: 20, diff: 'medium', expl: 'Light travels at about 299,792 km per second in a vacuum.' },
    { q: 'Which element has the atomic number 1?', a: 'Helium', b: 'Oxygen', c: 'Carbon', d: 'Hydrogen', correct: 3, points: 1, time: 20, diff: 'easy', expl: 'Hydrogen is the lightest and most abundant element in the universe.' },
    { q: 'What is the largest organ of the human body?', a: 'Liver', b: 'Skin', c: 'Brain', d: 'Heart', correct: 1, points: 1, time: 20, diff: 'medium', expl: 'Skin is the largest organ, covering about 1.7 m² in adults.' },
    { q: 'Which force keeps us on the ground?', a: 'Magnetism', b: 'Friction', c: 'Gravity', d: 'Inertia', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Gravity attracts objects towards the centre of the Earth.' },
    { q: 'What is the hardest natural substance on Earth?', a: 'Iron', b: 'Titanium', c: 'Diamond', d: 'Quartz', correct: 2, points: 1, time: 20, diff: 'medium', expl: 'Diamond scores 10 on the Mohs hardness scale, the highest rating.' },
    { q: 'Which part of the plant makes food?', a: 'Root', b: 'Stem', c: 'Leaf', d: 'Flower', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Leaves use sunlight, water and CO₂ to produce glucose via photosynthesis.' },
  ],
  'Mathematics': [
    { q: 'What is 12 × 8?', a: '88', b: '96', c: '104', d: '92', correct: 1, points: 1, time: 20, diff: 'easy', expl: '12 × 8 = 96.' },
    { q: 'What is the value of pi (π) to two decimal places?', a: '3.12', b: '3.14', c: '3.16', d: '3.18', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'π ≈ 3.14159, which rounds to 3.14.' },
    { q: 'What is the square root of 144?', a: '10', b: '11', c: '12', d: '13', correct: 2, points: 1, time: 20, diff: 'easy', expl: '12 × 12 = 144, so √144 = 12.' },
    { q: 'What is 25% of 200?', a: '25', b: '40', c: '50', d: '75', correct: 2, points: 1, time: 20, diff: 'easy', expl: '25% means 25/100, and 200 × 0.25 = 50.' },
    { q: 'Solve: 7 + 3 × 2', a: '20', b: '17', c: '13', d: '14', correct: 2, points: 2, time: 25, diff: 'medium', expl: 'Using BODMAS, multiplication comes first: 3 × 2 = 6, then 7 + 6 = 13.' },
    { q: 'What is 2 raised to the power of 10?', a: '512', b: '1024', c: '2048', d: '256', correct: 1, points: 2, time: 25, diff: 'medium', expl: '2¹⁰ = 2×2×… ten times = 1024.' },
    { q: 'The angles of a triangle always add up to?', a: '90 degrees', b: '180 degrees', c: '270 degrees', d: '360 degrees', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'The interior angles of any triangle sum to 180°.', },
    { q: 'What is the next number: 2, 4, 8, 16, __?', a: '24', b: '28', c: '32', d: '36', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Each number doubles: 16 × 2 = 32.' },
    { q: 'How many sides does a hexagon have?', a: '5', b: '6', c: '7', d: '8', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'Hexa means six, so a hexagon has 6 sides.' },
    { q: 'What is 99 × 99?', a: '9801', b: '9901', c: '9701', d: '9601', correct: 0, points: 2, time: 25, diff: 'hard', expl: '(100 − 1)² = 10000 − 200 + 1 = 9801.' },
  ],
  'Computer Science': [
    { q: 'What does CPU stand for?', a: 'Central Processing Unit', b: 'Computer Personal Unit', c: 'Central Program Utility', d: 'Core Processing Unit', correct: 0, points: 1, time: 20, diff: 'easy', expl: 'The CPU is the "brain" of the computer that executes instructions.' },
    { q: 'Which language is used to style web pages?', a: 'HTML', b: 'CSS', c: 'JavaScript', d: 'Python', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'CSS (Cascading Style Sheets) controls the look and layout of web pages.' },
    { q: 'What does "HTTP" stand for?', a: 'HyperText Transfer Protocol', b: 'High Tech Transfer Process', c: 'HyperText Transmit Program', d: 'Host Transfer Protocol', correct: 0, points: 1, time: 20, diff: 'easy', expl: 'HTTP is the protocol used to transfer web pages over the internet.' },
    { q: 'Which of these is a programming language?', a: 'Microsoft', b: 'Linux', c: 'Python', d: 'Windows', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Python is a popular programming language; the others are companies/OSes.' },
    { q: 'What is 1 kilobyte equal to?', a: '100 bytes', b: '1024 bytes', c: '2048 bytes', d: '512 bytes', correct: 1, points: 1, time: 20, diff: 'medium', expl: '1 KB = 2¹⁰ bytes = 1024 bytes in binary computing.' },
    { q: 'Which company developed the Android operating system?', a: 'Apple', b: 'Microsoft', c: 'Samsung', d: 'Google', correct: 3, points: 1, time: 20, diff: 'medium', expl: 'Google acquired Android in 2005 and leads its development.' },
    { q: 'What does RAM stand for?', a: 'Random Access Memory', b: 'Read Access Memory', c: 'Rapid Access Module', d: 'Random Allocation Memory', correct: 0, points: 1, time: 20, diff: 'easy', expl: 'RAM is the fast, temporary working memory of a computer.' },
    { q: 'Which tag is used to create a hyperlink in HTML?', a: '<link>', b: '<a>', c: '<href>', d: '<url>', correct: 1, points: 1, time: 20, diff: 'medium', expl: 'The anchor tag <a href="..."> creates links in HTML.' },
    { q: 'What type of software is a web browser?', a: 'Operating system', b: 'Compiler', c: 'Application software', d: 'Driver', correct: 2, points: 1, time: 20, diff: 'medium', expl: 'Browsers like Chrome and Firefox are application software.' },
    { q: 'Which data structure works on FIFO (First In, First Out)?', a: 'Stack', b: 'Queue', c: 'Tree', d: 'Graph', correct: 1, points: 2, time: 25, diff: 'hard', expl: 'A queue processes elements in the order they arrive — first in, first out.' },
  ],
  'History': [
    { q: 'Who was the first President of the United States?', a: 'Abraham Lincoln', b: 'Thomas Jefferson', c: 'George Washington', d: 'John Adams', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'George Washington served from 1789 to 1797 as the first US President.' },
    { q: 'In which year did World War II end?', a: '1943', b: '1944', c: '1945', d: '1946', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'WWII ended in 1945 with the surrender of Germany and Japan.' },
    { q: 'The Indus Valley Civilization was located in which region?', a: 'Egypt', b: 'Mesopotamia', c: 'South Asia', d: 'China', correct: 2, points: 1, time: 20, diff: 'medium', expl: 'It flourished around the Indus River in modern Pakistan and northwest India.' },
    { q: 'Who built the famous Hanging Gardens of Babylon (traditionally attributed)?', a: 'Alexander the Great', b: 'Nebuchadnezzar II', c: 'King Solomon', d: 'Ramses II', correct: 1, points: 2, time: 25, diff: 'hard', expl: 'Tradition credits King Nebuchadnezzar II with building the Hanging Gardens.' },
    { q: 'Who was known as the "Father of the Nation" in Pakistan?', a: 'Allama Iqbal', b: 'Liaquat Ali Khan', c: 'Quaid-e-Azam Muhammad Ali Jinnah', d: 'Sir Syed Ahmed Khan', correct: 2, points: 1, time: 20, diff: 'easy', expl: 'Quaid-e-Azam Muhammad Ali Jinnah led Pakistan to independence in 1947.' },
    { q: 'The pyramids of Giza are located in which country?', a: 'Mexico', b: 'Egypt', c: 'Peru', d: 'Sudan', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'The Giza pyramids stand near Cairo, Egypt, built around 2560 BC.' },
    { q: 'Who discovered the sea route to India in 1498?', a: 'Christopher Columbus', b: 'Ferdinand Magellan', c: 'Vasco da Gama', d: 'James Cook', correct: 2, points: 1, time: 20, diff: 'medium', expl: 'Vasco da Gama reached Calicut, India, by sailing around Africa in 1498.' },
    { q: 'The French Revolution started in which year?', a: '1776', b: '1789', c: '1799', d: '1804', correct: 1, points: 1, time: 20, diff: 'medium', expl: 'The storming of the Bastille on 14 July 1789 began the Revolution.' },
    { q: 'The Roman Empire fell in which century?', a: '3rd century', b: '4th century', c: '5th century', d: '6th century', correct: 2, points: 1, time: 20, diff: 'hard', expl: 'The Western Roman Empire fell in AD 476, during the 5th century.' },
    { q: 'Who wrote the famous "Declaration of Independence"?', a: 'Thomas Jefferson', b: 'Benjamin Franklin', c: 'George Washington', d: 'John Hancock', correct: 0, points: 1, time: 20, diff: 'medium', expl: 'Thomas Jefferson was the principal author of the 1776 Declaration.' },
  ],
  'English': [
    { q: 'Which word is a synonym of "happy"?', a: 'Sad', b: 'Angry', c: 'Joyful', d: 'Tired', correct: 2, points: 1, time: 20, diff: 'easy', expl: '"Joyful" has a similar meaning to "happy".' },
    { q: 'Which sentence is grammatically correct?', a: 'He go to school', b: 'He goes to school', c: 'He going to school', d: 'He gone to school', correct: 1, points: 1, time: 20, diff: 'easy', expl: 'Third-person singular subjects take the verb with "s": he goes.' },
    { q: 'What is the plural of "child"?', a: 'Childs', b: 'Childes', c: 'Children', d: 'Child', correct: 2, points: 1, time: 20, diff: 'easy', expl: '"Children" is an irregular plural form of "child".' },
    { q: 'Choose the correct spelling:', a: 'Recieve', b: 'Receive', c: 'Receeve', d: 'Recive', correct: 1, points: 1, time: 20, diff: 'easy', expl: '"I before E except after C" — receive is spelled with "ei".' },
    { q: '"The quick brown fox" - which word is an adjective?', a: 'The', b: 'quick', c: 'fox', d: 'brown fox', correct: 1, points: 2, time: 25, diff: 'medium', expl: 'Adjectives describe nouns; "quick" describes the fox.' },
    { q: 'What is the past tense of "run"?', a: 'Runned', b: 'Ran', c: 'Runs', d: 'Runing', correct: 1, points: 1, time: 20, diff: 'easy', expl: '"Run" is an irregular verb; its past tense is "ran".' },
    { q: 'Which word means the opposite of "increase"?', a: 'Grow', b: 'Expand', c: 'Decrease', d: 'Rise', correct: 2, points: 1, time: 20, diff: 'easy', expl: '"Decrease" is the antonym of "increase".' },
    { q: 'Which of these is a noun?', a: 'Quickly', b: 'Beautiful', c: 'Honesty', d: 'Run', correct: 2, points: 1, time: 20, diff: 'medium', expl: '"Honesty" is an abstract noun; the others are adverbs/adjectives.' },
    { q: 'Complete: She has been living here ____ 2015.', a: 'since', b: 'for', c: 'from', d: 'at', correct: 0, points: 1, time: 20, diff: 'medium', expl: '"Since" is used with a point in time (2015); "for" with a duration.' },
    { q: 'What is the synonym of "begin"?', a: 'End', b: 'Start', c: 'Stop', d: 'Finish', correct: 1, points: 1, time: 20, diff: 'easy', expl: '"Start" means the same as "begin".' },
  ],
};

function seedAdmin() {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@quizsphere.com');
  if (!exists) {
    db.prepare('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)')
      .run('Administrator', 'admin@quizsphere.com', bcrypt.hashSync('admin123', 10));
    console.log('Created admin user: admin@quizsphere.com / admin123');
  }
}

function seedSubjects() {
  for (const s of subjects) {
    db.prepare('INSERT OR IGNORE INTO subjects (name, description, icon, color, is_visible, min_rank) VALUES (?, ?, ?, ?, 1, ?)')
      .run(s.name, s.description, s.icon, s.color, s.rank);
  }
  ensureSpecialSubjects();
}

function seedQuestions() {
  for (const [subjectName, qs] of Object.entries(questionsBySubject)) {
    const subject = db.prepare('SELECT id FROM subjects WHERE name = ?').get(subjectName);
    if (!subject) continue;
    const existing = db.prepare('SELECT COUNT(*) AS c FROM questions WHERE subject_id = ?').get(subject.id).c;
    if (existing > 0) continue;
    const insert = db.prepare(`
      INSERT INTO questions (subject_id, question, option_a, option_b, option_c, option_d, correct, points, time_limit, difficulty, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of qs) {
      insert.run(subject.id, item.q, item.a, item.b, item.c, item.d, item.correct, item.points, item.time, item.diff, item.expl);
    }
    console.log(`Seeded ${qs.length} questions for ${subjectName}`);
  }
}

seedAdmin();
seedSubjects();
seedQuestions();

const totals = db.prepare(`
  SELECT s.name, s.is_visible, (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) AS count
  FROM subjects s ORDER BY s.is_visible DESC, s.name
`).all();
console.log('\nDatabase ready:');
for (const t of totals) console.log(`  - ${t.name}${t.is_visible ? '' : ' (hidden mode)'}: ${t.count} questions`);
