let curriculum = [];
let progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
let state = { currentScreen: 'map', hearts: 5, currentLesson: null, qIndex: 0, queue: [], sessionXP: 0, wrongCount: 0, mistakes: [], isReviewMode: false, initialQCount: 0 };
window._audioCtx = null;

// --- التعديل الجديد: تفعيل الصوت وإخفاء شاشة البداية ---
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            // تفعيل نظام الصوت في المتصفح
            window.speechSynthesis.resume();
            const utterance = new SpeechSynthesisUtterance("");
            window.speechSynthesis.speak(utterance);
            
            // إخفاء شاشة البداية
            document.getElementById('splash-screen').style.display = 'none';
        });
    }
});

// التهيئة الأساسية
window.onload = () => {
  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      curriculum = data;
      loadProgress();
      initMap();
    })
    .catch(error => console.error("Error loading curriculum:", error));

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log("Service Worker Registered"))
      .catch(err => console.log("Service Worker Failed", err));
  }
};

// دالة الصوت المحدثة
function speakArabic(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; 
  u.rate = 0.85; 
  u.pitch = 1.0;
  if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
  }
  window.speechSynthesis.speak(u);
}

// --- بقية الدوال ---
function showUserMessage(text) {
  const toast = document.getElementById('user-message-toast');
  toast.textContent = text;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

function loadProgress() {
  try {
    const data = localStorage.getItem('alTibyanProgressUz_v4');
    if (data) progress = { ...progress, ...JSON.parse(data) };
  } catch (e) { showUserMessage("ملاحظة: لن يتم حفظ تقدمك."); }
  updateTopBar();
}

function saveProgress() {
  try { localStorage.setItem('alTibyanProgressUz_v4', JSON.stringify(progress)); } catch (e) {}
  updateTopBar();
}

function updateTopBar() {
  document.getElementById('total-xp').textContent = progress.totalXP;
  document.getElementById('streak-count').textContent = progress.streak;
}

function resetProgress() {
  if(confirm("Barcha yutuqlaringizni o'chirib tashlamoqchimisiz?")) {
    progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
    saveProgress();
    initMap();
  }
}

function showScreen(id) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById('screen-' + id);
  if (!next || current === next) return;
  if (current) {
    current.classList.remove('active');
    current.classList.add('slide-out-left');
    setTimeout(() => { current.classList.remove('slide-out-left'); }, 250);
  }
  next.classList.add('slide-in-right');
  requestAnimationFrame(() => {
    next.classList.add('active');
    next.classList.remove('slide-in-right');
  });
  state.currentScreen = id;
  if(id === 'map') initMap();
}

function initAudio() {
  if (!window._audioCtx) {
    try { window._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (window._audioCtx && window._audioCtx.state === 'suspended') window._audioCtx.resume();
}

function playTone(type, freq, duration, volStart) {
  initAudio();
  if (!window._audioCtx) return;
  try {
    const osc = window._audioCtx.createOscillator();
    const gain = window._audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, window._audioCtx.currentTime);
    gain.gain.setValueAtTime(volStart, window._audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, window._audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(window._audioCtx.destination);
    osc.start(); osc.stop(window._audioCtx.currentTime + duration);
  } catch(e) {}
}

function playCorrect() { playTone('sine', 440, 0.15, 0.3); }
function playWrong() { playTone('triangle', 200, 0.3, 0.4); }
function playClick() { playTone('sine', 600, 0.05, 0.1); }
function playLevelUp() {
  setTimeout(() => playTone('sine', 523, 0.1, 0.3), 0);
  setTimeout(() => playTone('sine', 659, 0.1, 0.3), 100);
  setTimeout(() => playTone('sine', 784, 0.2, 0.3), 200);
}

function initMap() {
  const path = document.getElementById('lesson-path');
  path.innerHTML = '';
  curriculum.forEach((unit, uIdx) => {
    const divider = document.createElement('div');
    divider.style.cssText = "background:var(--border); color:var(--text); padding:8px 16px; border-radius:16px; font-weight:800; margin:20px 0; font-size:14px; text-align:center;";
    divider.textContent = `Qism ${uIdx+1} — ${unit.title}`;
    path.appendChild(divider);
    unit.lessons.forEach((lesson) => {
      const isCompleted = progress.completedLessons.includes(lesson.id);
      const isUnlocked = progress.unlockedLessons.includes(lesson.id);
      const node = document.createElement('div');
      node.className = `node ${isCompleted ? 'completed' : (isUnlocked ? 'active-node' : 'locked')}`;
      node.innerHTML = isCompleted ? '✅' : lesson.icon;
      node.onclick = () => { playClick(); if(isUnlocked || confirm("Davom etishni xohlaysizmi?")) openWelcome(lesson); };
      const nodeCont = document.createElement('div');
      nodeCont.className = 'node-container';
      nodeCont.appendChild(node);
      nodeCont.innerHTML += `<div class='node-label'>${lesson.title}</div>`;
      path.appendChild(nodeCont);
    });
  });
}

function openWelcome(lesson) {
  state.currentLesson = lesson;
  document.getElementById('welcome-icon').textContent = lesson.icon;
  document.getElementById('welcome-title').textContent = lesson.title;
  document.getElementById('word-count').textContent = lesson.vocabulary.length; 
  const vocabDiv = document.getElementById('vocab-preview');
  vocabDiv.innerHTML = '';
  lesson.vocabulary.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.innerHTML = `<div class="arabic-text" style="font-size:24px; flex:1;">${v.arabic}</div>
      <div style="font-weight:700; text-align:left; margin-left:15px; font-size:15px;">${v.uzbek}</div>
      <div style="cursor:pointer; font-size:24px; padding:5px;" onclick="speakArabic('${v.arabic}')">🔊</div>`;
    vocabDiv.appendChild(card);
  });
  showScreen('welcome');
}

function startLesson() {
  initAudio();
  state.hearts = 5; state.qIndex = 0; state.sessionXP = 0; state.wrongCount = 0; state.mistakes = []; state.isReviewMode = false;
  state.initialQCount = state.currentLesson.questions.length;
  state.queue = [...state.currentLesson.questions];
  updateHearts();
  showScreen('exercise');
  renderQuestion();
}
