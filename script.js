let curriculum = [];
let progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
let state = { currentScreen: 'map', hearts: 5, currentLesson: null, qIndex: 0, queue: [], sessionXP: 0, wrongCount: 0, mistakes: [], isReviewMode: false, initialQCount: 0, activeAnswerData: null };

// متغير لتتبع الملف الصوتي الحالي حتى نتمكن من إيقافه عند تشغيل صوت جديد
window.currentAudio = null;

// تهيئة الصوت عند ضغط المستخدم (للسماح بتشغيل الصوت في المتصفحات وخاصة Safari/iOS)
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            // تفعيل سياق الصوت للمتصفح عبر تشغيل ملف فارغ صامت
            const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            silentAudio.play().catch(e => console.log('Audio init skipped:', e));
            
            if ('speechSynthesis' in window) {
                window.speechSynthesis.resume();
                const silent = new SpeechSynthesisUtterance(" ");
                silent.volume = 0;
                window.speechSynthesis.speak(silent);
            }
            
            document.getElementById('splash-screen').style.display = 'none';
        });
    }
});

// دالة الصوت المحسنة باستخدام ElevenLabs مع نظام البديل الاحتياطي
async function speakArabic(text) {
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // --- ضع مفاتيحك الخاصة هنا ---
    const apiKey = 'sk_f2fda7b99d1730fc8975753436bda01f42e5e5a6983c597d'; 
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; 

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const headers = {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
    };

    const body = JSON.stringify({
        text: text,
        model_id: "eleven_turbo_v2_5", 
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs Error: ${response.status}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        window.currentAudio = new Audio(audioUrl);
        window.currentAudio.play();

    } catch (error) {
        console.warn('ElevenLabs failed, switching to Fallback Voice...', error);
        fallbackSpeakArabic(text);
    }
}

// دالة بديلة تستخدم صوت المتصفح الافتراضي كحل احتياطي جاهز دائماً
function fallbackSpeakArabic(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    setTimeout(() => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ar-SA';
        u.rate = 0.85;
        u.volume = 1;
        window.speechSynthesis.speak(u);
    }, 50);
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

function saveProgress() {
    localStorage.setItem('alTibyanProgressUz_v4', JSON.stringify(progress));
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
    document.getElementById('nav-xp').textContent = progress.totalXP;
    document.getElementById('nav-streak').textContent = progress.streak;
}

function openWelcome(l) {
    state.currentLesson = l;
    document.getElementById('welcome-title').textContent = l.title;
    const vDiv = document.getElementById('vocab-preview'); vDiv.innerHTML = '';
    l.vocabulary.forEach(v => {
        vDiv.innerHTML += `<div class="vocab-card"><div class="arabic-text">${v.arabic}</div><div>${v.uzbek}</div><div onclick="speakArabic('${v.arabic.replace(/'/g, "\\'")}')" style="cursor:pointer; font-size:24px;">🔊</div></div>`;
    });
    showScreen('welcome');
}

function startLesson() {
    state.hearts = 5;
    state.qIndex = 0;
    state.sessionXP = 0;
    state.wrongCount = 0;
    state.mistakes = [];
    state.isReviewMode = false;
    state.queue = [...state.currentLesson.questions];
    state.initialQCount = state.queue.length;
    updateHeartsUI();
    showScreen('game');
    nextQuestion();
}

function nextQuestion() {
    state.activeAnswerData = null;
    document.getElementById('btn-check').style.display = 'block';
    document.getElementById('btn-next').style.display = 'none';
    const footer = document.getElementById('game-footer');
    footer.className = 'game-footer';
    document.getElementById('feedback-msg').textContent = '';

    if (state.hearts <= 0) {
        endSession(false);
        return;
    }

    if (state.qIndex >= state.queue.length) {
        if (state.mistakes.length > 0 && !state.isReviewMode) {
            state.isReviewMode = true;
            state.queue = [...state.mistakes];
            state.qIndex = 0;
            state.mistakes = [];
            alert("Keling, xatolaringizni takrorlaymiz!");
        } else {
            endSession(true);
            return;
        }
    }

    const progressPercent = (state.qIndex / state.queue.length) * 100;
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;

    const q = state.queue[state.qIndex];
    document.getElementById('question-text').textContent = q.question;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    if (q.type === 'mcq') {
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => {
                document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.activeAnswerData = opt;
            };
            container.appendChild(btn);
        });
    }
}

function checkAnswer() {
    const q = state.queue[state.qIndex];
    let isCorrect = false;

    if (q.type === 'mcq') {
        if (!state.activeAnswerData) { alert("Iltimos, javobni tanlang!"); return; }
        isCorrect = (state.activeAnswerData === q.answer);
    }

    const footer = document.getElementById('game-footer');
    const msg = document.getElementById('feedback-msg');

    if (isCorrect) {
        footer.classList.add('correct');
        msg.innerHTML = `🎉 To'g'ri!`;
        state.sessionXP += 10;
    } else {
        footer.classList.add('incorrect');
        msg.innerHTML = `😢 Noto'g'ri! To'g'ri javob: <b>${q.answer}</b>`;
        state.hearts--;
        updateHeartsUI();
        if (!state.isReviewMode) {
            state.mistakes.push(q);
        }
    }

    document.getElementById('btn-check').style.display = 'none';
    document.getElementById('btn-next').style.display = 'block';
}

function nextAction() {
    state.qIndex++;
    nextQuestion();
}

function updateHeartsUI() {
    document.getElementById('game-hearts').textContent = `❤️ ${state.hearts}`;
}

function endSession(success) {
    showScreen('result');
    const title = document.getElementById('result-title');
    const xpText = document.getElementById('result-xp');

    if (success) {
        title.textContent = "Tabriklaymiz! Darsni tugatdingiz!";
        xpText.textContent = `Siz ${state.sessionXP} XP qo'lga kiritdingiz!`;
        progress.totalXP += state.sessionXP;
        
        if (!progress.completedLessons.includes(state.currentLesson.id)) {
            progress.completedLessons.push(state.currentLesson.id);
            const nextLId = 'l' + (parseInt(state.currentLesson.id.replace('l', '')) + 1);
            if (!progress.unlockedLessons.includes(nextLId)) {
                progress.unlockedLessons.push(nextLId);
            }
        }
        progress.streak++;
        saveProgress();
    } else {
        title.textContent = "O'yin tugadi! Qalblaringiz qolmadi.";
        xpText.textContent = "Xafa bo'lmang, qaytadan urinib ko'ring!";
    }
}

function goHome() {
    initMap();
    showScreen('map');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
}
