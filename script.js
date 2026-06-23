let curriculum = [];
let progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
let state = { currentScreen: 'map', hearts: 5, currentLesson: null, qIndex: 0, queue: [], sessionXP: 0, wrongCount: 0, mistakes: [], isReviewMode: false, initialQCount: 0, activeAnswerData: null };

// متغير عام لمنع متصفح أندرويد من إيقاف الصوت فجأة (Garbage Collection Fix)
window.currentUtterance = null;
window._audioCtx = null;

// 1. تهيئة النظام فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // إجبار متصفحات أندرويد على تحميل مكتبة الأصوات مبكراً
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = window.speechSynthesis.getVoices;
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            // كسر حماية المتصفح عبر تفعيل صوت صامت وقت تفاعل المستخدم
            if ('speechSynthesis' in window) {
                window.speechSynthesis.resume();
                const silentUtterance = new SpeechSynthesisUtterance(" ");
                silentUtterance.volume = 0; // صامت تماماً
                window.speechSynthesis.speak(silentUtterance);
            }
            
            document.getElementById('splash-screen').style.display = 'none';
        });
    }
});

window.onload = () => {
    fetch('data.json')
        .then(r => r.json())
        .then(data => { curriculum = data; loadProgress(); initMap(); })
        .catch(e => console.error("Error loading data:", e));
        
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
};

// 2. المحرك الرئيسي لتشغيل الصوت الاحترافي
function speakArabic(text) {
    if (!window.speechSynthesis) return;

    // إيقاف أي صوت سابق واستئناف المحرك (يحل مشكلة التعليق في أندرويد)
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    // استخدام تأخير بسيط لمنح أندرويد فرصة لإنهاء أمر الإلغاء قبل البدء بالجديد
    setTimeout(() => {
        const u = new SpeechSynthesisUtterance(text);
        
        // إعدادات اللغة (السعودية كخيار أول، والعربية العامة كبديل)
        u.lang = 'ar-SA'; 
        u.rate = 0.85; // سرعة مناسبة للتعليم
        u.pitch = 1;
        u.volume = 1;

        // البحث عن صوت عربي محدد في الجهاز إن وُجد
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(v => v.lang.includes('ar'));
        if (arabicVoice) {
            u.voice = arabicVoice;
        } else {
            u.lang = 'ar'; // Fallback
        }

        // معالجة الأخطاء وتنظيف الذاكرة
        u.onerror = (event) => console.error("TTS Error:", event);
        u.onend = () => { window.currentUtterance = null; };

        // حفظ مرجع للكائن حتى لا يحذفه المتصفح
        window.currentUtterance = u;

        // تشغيل الصوت
        window.speechSynthesis.speak(u);
    }, 150);
}

// 3. دوال إدارة التقدم واللعبة
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
    const vDiv = document.getElementById('vocab-preview'); 
    vDiv.innerHTML = '';
    
    l.vocabulary.forEach(v => {
        vDiv.innerHTML += `<div class="vocab-card"><div class="arabic-text">${v.arabic}</div><div>${v.uzbek}</div><div onclick="speakArabic('${v.arabic}')" style="cursor:pointer; font-size:20px;">🔊</div></div>`;
    });
    showScreen('welcome');
}

function startLesson() {
    state.hearts = 5; 
    state.qIndex = 0; 
    state.queue = [...state.currentLesson.questions];
    updateHearts(); 
    showScreen('exercise'); 
    renderQuestion();
}

function renderQuestion() {
    if (state.queue.length === 0) { completeLesson(); return; }
    const q = state.queue[0];
    document.getElementById('exercise-content').innerHTML = `<h3>${q.uzbek || 'Savol'}</h3>`;
    document.getElementById('check-btn').disabled = true;
    
    // يمكنك إضافة استدعاء الدوال الخاصة بأنواع الأسئلة هنا (Match, Fill, etc)
}

function checkAnswer() {
    // منطق التحقق من الإجابة (قم بتعديله حسب منطقك)
    const isCorrect = true; 
    handleAnswer(isCorrect);
}

function handleAnswer(isCorrect) {
    document.getElementById('feedback-sheet').className = 'feedback-sheet show ' + (isCorrect ? 'correct' : 'wrong');
}

function nextQuestion() { 
    state.queue.shift(); 
    renderQuestion(); 
}

function updateHearts() { 
    document.getElementById('hearts-display').innerHTML = '❤️'.repeat(state.hearts); 
}

function completeLesson() { 
    saveProgress(); 
    showScreen('lesson-complete'); 
}

function showScreen(id) { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById('screen-' + id).classList.add('active'); 
}
