let curriculum = [];
let progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
let state = { currentScreen: 'map', hearts: 5, currentLesson: null, qIndex: 0, queue: [], sessionXP: 0, wrongCount: 0, mistakes: [], isReviewMode: false, initialQCount: 0, activeAnswerData: null };
window._audioCtx = null;

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            window.speechSynthesis.resume();
            const u = new SpeechSynthesisUtterance("");
            window.speechSynthesis.speak(u);
            document.getElementById('splash-screen').style.display = 'none';
        });
    }
});

window.onload = () => {
  fetch('data.json')
    .then(r => r.json())
    .then(data => { curriculum = data; loadProgress(); initMap(); })
    .catch(e => console.error(e));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
};

function speakArabic(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

function loadProgress() {
  const data = localStorage.getItem('alTibyanProgressUz_v4');
  if (data) progress = { ...progress, ...JSON.parse(data) };
  updateTopBar();
}

function saveProgress() {
  localStorage.setItem('alTibyanProgressUz_v4', JSON.stringify(progress));
  updateTopBar();
}

function updateTopBar() {
  document.getElementById('total-xp').textContent = progress.totalXP;
  document.getElementById('streak-count').textContent = progress.streak;
}

function initMap() {
  const path = document.getElementById('lesson-path');
  path.innerHTML = '';
  curriculum.forEach((unit, uIdx) => {
    const div = document.createElement('div');
    div.style.cssText = "background:#E5E5E5; padding:8px; border-radius:10px; margin:10px 0; font-weight:bold; text-align:center;";
    div.textContent = `Qism ${uIdx+1} — ${unit.title}`;
    path.appendChild(div);
    unit.lessons.forEach(l => {
      const isC = progress.completedLessons.includes(l.id);
      const isU = progress.unlockedLessons.includes(l.id);
      const node = document.createElement('div');
      node.className = `node ${isC ? 'completed' : (isU ? 'active-node' : 'locked')}`;
      node.innerHTML = isC ? '✅' : l.icon;
      node.onclick = () => { if(isU || confirm("Davom etish?")) openWelcome(l); };
      path.appendChild(node);
    });
  });
}

function openWelcome(l) {
  state.currentLesson = l;
  document.getElementById('welcome-title').textContent = l.title;
  document.getElementById('word-count').textContent = l.vocabulary.length;
  const vDiv = document.getElementById('vocab-preview'); vDiv.innerHTML = '';
  l.vocabulary.forEach(v => {
    vDiv.innerHTML += `<div class="vocab-card"><div class="arabic-text">${v.arabic}</div><div>${v.uzbek}</div><div onclick="speakArabic('${v.arabic}')">🔊</div></div>`;
  });
  showScreen('welcome');
}

function startLesson() {
  state.hearts = 5; state.qIndex = 0; state.queue = [...state.currentLesson.questions];
  updateHearts(); showScreen('exercise'); renderQuestion();
}

function renderQuestion() {
  if (state.queue.length === 0) { completeLesson(); return; }
  const q = state.queue[0];
  document.getElementById('exercise-content').innerHTML = `<h3>${q.uzbek || 'Savol'}</h3>`;
  document.getElementById('check-btn').disabled = true;
  // هنا يتم عرض أنواع الأسئلة (Match, Fill, etc) بناءً على q.type
  // تأكد أن الدوال renderTypeA, B, C, D موجودة في ملفك كما أرسلتها سابقاً
}

function checkAnswer() {
  // منطق التحقق من الإجابة
  const isCorrect = true; // ضع المنطق الخاص بك هنا
  handleAnswer(isCorrect);
}

function handleAnswer(isCorrect) {
  document.getElementById('feedback-sheet').className = 'feedback-sheet show ' + (isCorrect ? 'correct' : 'wrong');
}

function nextQuestion() { state.queue.shift(); renderQuestion(); }
function updateHearts() { document.getElementById('hearts-display').innerHTML = '❤️'.repeat(state.hearts); }
function completeLesson() { saveProgress(); showScreen('lesson-complete'); }
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById('screen-' + id).classList.add('active'); }
