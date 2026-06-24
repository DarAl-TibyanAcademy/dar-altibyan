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

// دالة الصوت المحسنة باستخدام ElevenLabs
async function speakArabic(text) {
    // إيقاف أي صوت يعمل حالياً إذا تم الضغط على زر آخر
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // --- ضع مفاتيحك هنا ---
    const apiKey = 'sk_f2fda7b99d1730fc8975753436bda01f42e5e5a6983c597d';
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // المعرف الذي تستخدمه حالياً

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const headers = {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
    };

    const body = JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", 
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.7
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        // إذا كان الرد يحمل خطأ 402 أو أي خطأ آخر، ننتقل فوراً للـ Fallback
        if (!response.ok) {
            throw new Error(`ElevenLabs Error: ${response.status}`);
        }

        // تحويل الاستجابة إلى ملف صوتي وتشغيله
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        window.currentAudio = new Audio(audioUrl);
        window.currentAudio.play();

    } catch (error) {
        console.warn('ElevenLabs failed, switching to Google/System Voice...', error);
        // التحويل الصامت والآمن للصوت البديل في حال نفاد الرصيد
        fallbackSpeakArabic(text);
    }
}

// دالة بديلة تستخدم صوت المتصفح الافتراضي كحل احتياطي جاهز دائماً
function fallbackSpeakArabic(text) {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel(); // تنظيف أي طابور صوتي قديم
    
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
        vDiv.innerHTML += `<div class="vocab-card"><div class="arabic-text">${v.arabic}</div><div>${v.uzbek}</div><div onclick="speakArabic('${v.arabic.replace(/'/g, "\\'")}')" style="cursor:pointer; font-size:24px;">🔊</div></div>`;
    });
    showScreen('welcome');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
}
