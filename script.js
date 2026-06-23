let curriculum = [];
let progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
let state = { currentScreen: 'map', hearts: 5, currentLesson: null, qIndex: 0, queue: [], sessionXP: 0, wrongCount: 0, mistakes: [], isReviewMode: false, initialQCount: 0, activeAnswerData: null };

window.currentUtterance = null;

// تهيئة الصوت عند ضغط المستخدم (مفتاح الحل)
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.resume();
                // صوت صامت لتفعيل القناة
                const silent = new SpeechSynthesisUtterance(" ");
                silent.volume = 0;
                window.speechSynthesis.speak(silent);
            }
            document.getElementById('splash-screen').style.display = 'none';
        });
    }
});

// دالة الصوت المحسنة
function speakArabic(text) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    setTimeout(() => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ar-SA';
        u.rate = 0.85;
        u.volume = 1;
        
        // إبقاء المرجع لمنع الحذف بواسطة المتصفح
        window.currentUtterance = u;
        window.speechSynthesis.speak(u);
    }, 100);
}

window.onload = () => {
    fetch('data.json')
        .then(r => r.json())
        .then(data => { curriculum = data; loadProgress(); initMap(); })
        .catch(e => console.error(e));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
};

function loadProgress() {
    const data = localStorage.getItem('alTibyanProgressUz_v4');
    if (data) progress = { ...progress, ...JSON.parse(data) };
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
            node.onclick = () => { if(isU) openWelcome(l); };
            path.appendChild(node);
        });
    });
}

function openWelcome(l) {
    state.currentLesson = l;
    document.getElementById('welcome-title').textContent = l.title;
    const vDiv = document.getElementById('vocab-preview'); vDiv.innerHTML = '';
    l.vocabulary.forEach(v => {
        vDiv.innerHTML += `<div class="vocab-card"><div class="arabic-text">${v.arabic}</div><div>${v.uzbek}</div><div onclick="speakArabic('${v.arabic}')" style="cursor:pointer; font-size:24px;">🔊</div></div>`;
    });
    showScreen('welcome');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
}
