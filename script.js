let curriculum = [];
let progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
let state = { currentScreen: 'map', hearts: 5, currentLesson: null, qIndex: 0, queue: [], sessionXP: 0, wrongCount: 0, mistakes: [], isReviewMode: false, initialQCount: 0, activeAnswerData: null };

const ELEVENLABS_API_KEY = 'sk_f2fda7b99d1730fc8975753436bda01f42e5e5a6983c597d'; 
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 
const audioCache = {};

// --- حل المشكلة: كود زر البداية (لإخفاء الشاشة الافتتاحية) ---
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            document.getElementById('splash-screen').style.display = 'none';
        });
    }
});
// -------------------------------------------------------------

async function speakArabic(text) {
    if (audioCache[text]) {
        new Audio(audioCache[text]).play();
        return;
    }

    try {
        console.log("يتم الآن جلب الصوت من ElevenLabs...");
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) throw new Error('فشل الاتصال بخوادم ElevenLabs');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioCache[text] = audioUrl; 
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (error) {
        console.error("حدث خطأ في الصوت:", error);
    }
}

window.onload = () => {
    fetch('data.json')
        .then(r => r.json())
        .then(data => { curriculum = data; loadProgress(); initMap(); })
        .catch(e => console.error(e));
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
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
    const vDiv = document.getElementById('vocab-preview'); 
    vDiv.innerHTML = '';
    l.vocabulary.forEach(v => {
        vDiv.innerHTML += `<div class="vocab-card"><div class="arabic-text">${v.arabic}</div><div>${v.uzbek}</div><div onclick="speakArabic('${v.arabic}')" style="cursor:pointer; font-size:24px;">🔊</div></div>`;
    });
    showScreen('welcome');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
}
