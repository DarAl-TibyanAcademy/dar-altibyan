let curriculum = [];
let progress = { totalXP: 0, streak: 0, completedLessons: [], unlockedLessons: ['l1'] };
let state = { currentScreen: 'map', hearts: 5, currentLesson: null, qIndex: 0, queue: [], sessionXP: 0, wrongCount: 0, mistakes: [], isReviewMode: false, initialQCount: 0 };
window._audioCtx = null;

// التهيئة عند تحميل الصفحة وتفعيل الميزات
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
  } catch (e) { 
    console.warn("Local storage disabled.");
    showUserMessage("ملاحظة: لن يتم حفظ تقدمك في هذا المتصفح.");
  }
  updateTopBar();
}

function saveProgress() {
  try { 
    localStorage.setItem('alTibyanProgressUz_v4', JSON.stringify(progress)); 
  } catch (e) {
    console.warn("Cannot save progress. Private mode?");
    showUserMessage("ملاحظة: لن يتم حفظ تقدمك في هذا المتصفح.");
  }
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
    try { window._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } 
    catch (e) { console.warn('AudioContext not supported'); }
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
    if(type === 'sine' && duration === 0.15) osc.frequency.exponentialRampToValueAtTime(880, window._audioCtx.currentTime + duration);
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

function speakArabic(text) {
  initAudio();
  if (!('speechSynthesis' in window)) {
    showUserMessage("المتصفح لا يدعم النطق الصوتي.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.85; u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}

function initMap() {
  const path = document.getElementById('lesson-path');
  path.innerHTML = '';
  
  curriculum.forEach((unit, uIdx) => {
    const divider = document.createElement('div');
    divider.style.cssText = "background:var(--border); color:var(--text); padding:8px 16px; border-radius:16px; font-weight:800; margin:20px 0; text-transform:uppercase; font-size:14px; text-align:center;";
    divider.textContent = `Qism ${uIdx+1} — ${unit.title}`;
    path.appendChild(divider);

    unit.lessons.forEach((lesson, lIdx) => {
      const isCompleted = progress.completedLessons.includes(lesson.id);
      const isUnlocked = progress.unlockedLessons.includes(lesson.id);
      
      const nodeCont = document.createElement('div');
      nodeCont.className = 'node-container';
      nodeCont.style.transform = `translateX(${lIdx % 2 === 0 ? '-30px' : '30px'})`;

      const node = document.createElement('div');
      node.className = `node ${isCompleted ? 'completed' : (isUnlocked ? 'active-node' : 'locked')}`;
      node.innerHTML = isCompleted ? '✅' : lesson.icon;
      
      node.onclick = () => { 
          playClick(); 
          initAudio();
          if (!isUnlocked) {
              const msg = "Siz hali bu darsga yetib kelmadingiz.\n\nهل أنت متأكد من أنك حفظت الكلمات؟\n\nDavom etishni xohlaysizmi?";
              if(confirm(msg)) openWelcome(lesson);
          } else {
              openWelcome(lesson);
          }
      };

      const label = document.createElement('div');
      label.className = 'node-label';
      label.textContent = lesson.title;

      nodeCont.appendChild(node);
      nodeCont.appendChild(label);
      path.appendChild(nodeCont);
    });
  });
}

function openWelcome(lesson) {
  state.currentLesson = lesson;
  document.getElementById('welcome-icon').textContent = lesson.icon;
  document.getElementById('welcome-title').textContent = lesson.title;
  document.getElementById('welcome-title-ar').textContent = curriculum.find(u => u.lessons.includes(lesson)).titleAr;
  document.getElementById('word-count').textContent = lesson.vocabulary.length; 
  
  const vocabDiv = document.getElementById('vocab-preview');
  vocabDiv.innerHTML = '';
  lesson.vocabulary.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.innerHTML = `
      <div class="arabic-text" style="font-size:24px; flex:1;">${v.arabic}</div>
      <div style="font-weight:700; text-align:left; margin-left:15px; font-size:15px;">${v.uzbek}</div>
      <div style="cursor:pointer; font-size:24px; padding:5px;" onclick="speakArabic('${v.arabic}')">🔊</div>
    `;
    vocabDiv.appendChild(card);
  });
  
  showScreen('welcome');
}

function startLesson() {
  initAudio();
  state.hearts = 5;
  state.qIndex = 0;
  state.sessionXP = 0;
  state.wrongCount = 0;
  state.mistakes = [];
  state.isReviewMode = false;
  state.initialQCount = state.currentLesson.questions.length;
  state.queue = [...state.currentLesson.questions];

  updateHearts();
  showScreen('exercise');
  renderQuestion();
}

function startMistakesReview() {
  initAudio();
  state.queue = [...state.mistakes];
  state.mistakes = [];
  state.isReviewMode = true;
  state.qIndex = 0;
  
  showScreen('exercise');
  renderQuestion();
}

function updateHearts() {
  const hd = document.getElementById('hearts-display');
  hd.innerHTML = '❤️'.repeat(state.hearts) + '🤍'.repeat(5 - state.hearts);
}

function updateProgress() {
  const total = state.queue.length + state.qIndex; 
  const done = state.qIndex;
  const pct = Math.min(100, (done / total) * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
}

let activeAnswerData = null;

function renderQuestion() {
  if (state.queue.length === 0) return handleQueueEnd();
  
  updateProgress();
  document.getElementById('feedback-sheet').classList.remove('show');
  
  const checkBtn = document.getElementById('check-btn');
  checkBtn.style.display = 'block';
  checkBtn.className = 'btn btn-primary';
  checkBtn.textContent = 'TEKSHIRISH';
  checkBtn.disabled = true;
  
  const content = document.getElementById('exercise-content');
  content.innerHTML = '';
  
  if (state.isReviewMode) {
      const badge = document.createElement('div');
      badge.className = 'review-badge';
      badge.textContent = '🛠️ Xatoni to\'g\'rilash';
      content.appendChild(badge);
  }

  activeAnswerData = null;
  const q = state.queue[0];
  
  if (q.type === 'sentenceBuilder') renderTypeA(q, content);
  else if (q.type === 'matchPairs') renderTypeB(q, content);
  else if (q.type === 'listenSelect') renderTypeC(q, content);
  else if (q.type === 'fillBlank') renderTypeD(q, content);
  else if (q.type === 'letterGrid') renderTypeE(q, content);
  else if (q.type === 'wordSearch') renderWordSearch(q, content);
}

function removeTashkeelAndPunctuation(text) {
    if (!text) return "";
    return text
        .replace(/[\u0617-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '')
        .replace(/\u0640/g, '')
        .replace(/[.,،؛؟!:"'()\[\]{}«»]/g, '')
        .replace(/\s+/g, ' ') 
        .trim()
        .replace(/[أإآ]/g, 'ا') 
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه');
}

function isAnswerCorrect(userAns, targetAns) {
    return removeTashkeelAndPunctuation(userAns) === removeTashkeelAndPunctuation(targetAns);
}

function renderTypeA(q, container) {
  const inst = document.createElement('div');
  inst.className = 'instruction';
  inst.textContent = q.uzbek;
  container.appendChild(inst);
  
  const dropZone = document.createElement('div');
  dropZone.className = 'drop-zone';
  const wordBank = document.createElement('div');
  wordBank.className = 'word-bank';
  
  let currentSentence = [];
  
  const updateCheckBtn = () => {
    document.getElementById('check-btn').disabled = currentSentence.length === 0;
    activeAnswerData = currentSentence.map(btn => btn.dataset.word).join(' '); 
  };

  const words = [...q.words].sort(() => Math.random() - 0.5);
  words.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'word-btn arabic-text';
    btn.textContent = w;
    btn.dataset.word = w;
    
    btn.onclick = () => {
      playClick();
      if (btn.parentElement === wordBank) dropZone.appendChild(btn);
      else wordBank.appendChild(btn);
      
      currentSentence = Array.from(dropZone.children);
      updateCheckBtn();
    };
    wordBank.appendChild(btn);
  });
  
  container.appendChild(dropZone);
  container.appendChild(wordBank);
}

function renderTypeB(q, container) {
  const inst = document.createElement('div');
  inst.className = 'instruction';
  inst.textContent = "Mos keladigan juftlikni toping";
  container.appendChild(inst);

  document.getElementById('check-btn').style.display = 'none';
  
  const grid = document.createElement('div');
  grid.className = 'match-grid';
  
  let arList = q.pairs.map(p => ({t: p.arabic, type: 'ar'})).sort(() => Math.random() - 0.5);
  let uzList = q.pairs.map(p => ({t: p.uzbek, type: 'uz'})).sort(() => Math.random() - 0.5);
  
  let selAr = null, selUz = null;
  let matches = 0;

  const checkMatch = () => {
    if(!selAr || !selUz) return;
    const pair = q.pairs.find(p => p.arabic === selAr.dataset.val && p.uzbek === selUz.dataset.val);
    
    if (pair) {
      playCorrect();
      selAr.classList.add('matched'); selUz.classList.add('matched');
      matches++;
      if(matches === q.pairs.length) {
        activeAnswerData = true;
        handleAnswer(true);
      }
    } else {
      playWrong();
      if(state.hearts > 0) state.hearts--;
      updateHearts();
      selAr.style.borderColor = 'var(--danger)'; selUz.style.borderColor = 'var(--danger)';
      
      if (!state.isReviewMode && !state.mistakes.includes(q)) state.mistakes.push(q);
      else if (state.isReviewMode) state.queue.push(q);
      
      setTimeout(() => {
        if(selAr) { selAr.style.borderColor = ''; selAr.classList.remove('active'); }
        if(selUz) { selUz.style.borderColor = ''; selUz.classList.remove('active'); }
        selAr = null; selUz = null;
      }, 600);
      return;
    }
    selAr = null; selUz = null;
  };

  const createBtn = (item) => {
    const b = document.createElement('button');
    b.className = 'match-btn ' + (item.type === 'ar' ? 'arabic-text' : '');
    if(item.type === 'ar') b.style.fontSize = '20px';
    b.textContent = item.t;
    b.dataset.val = item.t;
    b.onclick = () => {
      playClick();
      if(item.type === 'ar') {
        if(selAr) selAr.classList.remove('active');
        selAr = b;
      } else {
        if(selUz) selUz.classList.remove('active');
        selUz = b;
      }
      b.classList.add('active');
      checkMatch();
    };
    return b;
  };

  for(let i=0; i<q.pairs.length; i++) {
    grid.appendChild(createBtn(arList[i]));
    grid.appendChild(createBtn(uzList[i]));
  }
  container.appendChild(grid);
}

function renderTypeC(q, container) {
  const inst = document.createElement('div');
  inst.className = 'instruction';
  inst.textContent = "اضغط على 🔊 لسماع الجملة، ثم اختر الترجمة الصحيحة";
  container.appendChild(inst);
  
  document.getElementById('check-btn').style.display = 'none';
  
  const speaker = document.createElement('div');
  speaker.className = 'speaker-btn';
  speaker.innerHTML = '🔊';
  speaker.onclick = () => {
      playClick();
      speakArabic(q.arabic);
  };
  container.appendChild(speaker);
  
  const grid = document.createElement('div');
  grid.className = 'options-grid';
  
  q.options.sort(() => Math.random() - 0.5).forEach(opt => {
    const b = document.createElement('button');
    b.className = 'option-btn';
    b.textContent = opt;
    b.onclick = () => {
      playClick();
      activeAnswerData = opt;
      handleAnswer(opt === q.correct);
    };
    grid.appendChild(b);
  });
  container.appendChild(grid);
}

function renderTypeD(q, container) {
  const inst = document.createElement('div');
  inst.className = 'instruction';
  inst.textContent = q.uzbek;
  container.appendChild(inst);
  
  const sentence = document.createElement('div');
  sentence.className = 'arabic-text text-center mb-2';
  sentence.style.fontSize = '32px';
  sentence.innerHTML = q.arabic.replace('___', '<span style="border-bottom:2px dashed var(--border); display:inline-block; width:60px; height: 30px; vertical-align: bottom;"></span>');
  container.appendChild(sentence);

  const grid = document.createElement('div');
  grid.className = 'options-grid';
  
  q.choices.sort(() => Math.random() - 0.5).forEach(opt => {
    const b = document.createElement('button');
    b.className = 'option-btn arabic-text';
    b.textContent = opt;
    b.onclick = () => {
      playClick();
      document.querySelectorAll('.option-btn').forEach(btn=>btn.classList.remove('selected'));
      b.classList.add('selected');
      activeAnswerData = opt;
      document.getElementById('check-btn').disabled = false;
    };
    grid.appendChild(b);
  });
  container.appendChild(grid);
}

function renderTypeE(q, container) {
  const inst = document.createElement('div');
  inst.className = 'instruction';
  inst.textContent = "So'zni yig'ing: " + q.uzbek;
  container.appendChild(inst);
  
  const answerBox = document.createElement('div');
  answerBox.className = 'letter-answer-box arabic-text';
  container.appendChild(answerBox);

  const grid = document.createElement('div');
  grid.className = 'letter-grid-container';
  
  let selectedLetters = [];

  const updateAnswerDisplay = () => {
    answerBox.innerHTML = '';
    selectedLetters.forEach((item, idx) => {
      const span = document.createElement('span');
      span.className = 'letter-answer-item';
      span.textContent = item.letter;
      span.onclick = () => {
        playClick();
        item.btn.classList.remove('used');
        selectedLetters.splice(idx, 1);
        updateAnswerDisplay();
      };
      answerBox.appendChild(span);
    });
    activeAnswerData = selectedLetters.map(i => i.letter).join('');
    document.getElementById('check-btn').disabled = selectedLetters.length === 0;
  };

  const letters = [...q.letters].sort(() => Math.random() - 0.5);
  letters.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn arabic-text';
    btn.textContent = l;
    btn.onclick = () => {
      playClick();
      btn.classList.add('used');
      selectedLetters.push({ letter: l, btn: btn });
      updateAnswerDisplay();
    };
    grid.appendChild(btn);
  });
  
  container.appendChild(grid);
}

function renderWordSearch(q, container) {
  const inst = document.createElement('div');
  inst.className = 'instruction';
  inst.textContent = q.instruction;
  container.appendChild(inst);

  document.getElementById('check-btn').style.display = 'none';

  const clues = document.createElement('div');
  clues.style.display = 'flex';
  clues.style.flexWrap = 'wrap';
  clues.style.gap = '10px';
  clues.style.justifyContent = 'center';

  q.wordsToFind.forEach(w => {
      w.found = false;
      const badge = document.createElement('div');
      badge.id = 'clue-' + w.arabic;
      badge.className = 'word-btn';
      badge.style.fontSize = '16px';
      badge.style.padding = '8px 12px';
      badge.textContent = w.uzbek;
      clues.appendChild(badge);
  });

  const gridBox = document.createElement('div');
  const cols = q.grid[0].length;
  const rows = q.grid.length;
  gridBox.style.display = 'grid';
  gridBox.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridBox.style.gap = '5px';
  gridBox.style.direction = 'rtl';
  gridBox.style.maxWidth = '320px';
  gridBox.style.margin = '0 auto';

  let cells = [];
  for(let r=0; r<rows; r++) {
      cells[r] = [];
      for(let c=0; c<cols; c++) {
          const cell = document.createElement('button');
          cell.className = 'letter-btn arabic-text';
          cell.style.padding = '10px 5px';
          cell.textContent = q.grid[r][c];
          cell.dataset.row = r;
          cell.dataset.col = c;
          cells[r][c] = cell;
          gridBox.appendChild(cell);
      }
  }

  let currentPath = [];
  let foundCount = 0;

  const clearSelection = () => {
      currentPath.forEach(p => {
          if(!p.element.classList.contains('found')) {
              p.element.classList.remove('selected');
              p.element.style.transform = 'scale(1)';
          }
      });
      currentPath = [];
  };

  const isStraightLine = (path) => {
      if(path.length < 2) return true;
      const dr = path[1].row - path[0].row;
      const dc = path[1].col - path[0].col;
      for(let i=2; i<path.length; i++) {
          if((path[i].row - path[i-1].row) !== dr || (path[i].col - path[i-1].col) !== dc) return false;
      }
      return true;
  };

  const getWordFromPath = (path) => path.map(p => q.grid[p.row][p.col]).join('');

  cells.forEach(row => {
      row.forEach(cell => {
          cell.onclick = () => {
              playClick();
              if(cell.classList.contains('found')) return;

              const r = parseInt(cell.dataset.row);
              const c = parseInt(cell.dataset.col);

              const existingIndex = currentPath.findIndex(p => p.row === r && p.col === c);
              if(existingIndex >= 0) {
                  for(let i = currentPath.length - 1; i >= existingIndex; i--) {
                      currentPath[i].element.classList.remove('selected');
                      currentPath[i].element.style.transform = 'scale(1)';
                      currentPath.pop();
                  }
                  return;
              }

              if(currentPath.length > 0) {
                  const last = currentPath[currentPath.length - 1];
                  const dr = Math.abs(last.row - r);
                  const dc = Math.abs(last.col - c);
                  if(dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
                      clearSelection();
                      return;
                  }
              }

              cell.classList.add('selected');
              cell.style.transform = 'scale(0.9)';
              currentPath.push({row: r, col: c, element: cell});

              if(currentPath.length < 2) return;

              if(!isStraightLine(currentPath)) {
                  clearSelection();
                  return;
              }

              const word = getWordFromPath(currentPath);
              const reversed = word.split('').reverse().join('');

              const match = q.wordsToFind.find(w => !w.found && (w.arabic === word || w.arabic === reversed));

              if(match) {
                  playCorrect();
                  match.found = true;
                  foundCount++;
                  currentPath.forEach(p => {
                      p.element.classList.remove('selected');
                      p.element.classList.add('found');
                      p.element.style.backgroundColor = 'var(--success)';
                      p.element.style.color = 'white';
                      p.element.style.borderColor = 'var(--success-dark)';
                      p.element.style.transform = 'scale(1)';
                  });
                  currentPath = [];

                  const clueEl = document.getElementById('clue-' + match.arabic);
                  clueEl.style.textDecoration = 'line-through';
                  clueEl.style.backgroundColor = '#E1F5FE';
                  clueEl.style.color = 'var(--success-dark)';

                  if(foundCount === q.wordsToFind.length) {
                      activeAnswerData = true;
                      const cBtn = document.getElementById('check-btn');
                      cBtn.disabled = false;
                      cBtn.style.display = 'block';
                      cBtn.textContent = 'DAVOM ETISH';
                  }
              } else if (currentPath.length > 6) {
                  clearSelection();
              }
          };
      });
  });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn';
  clearBtn.style.backgroundColor = '#E5E5E5';
  clearBtn.style.color = '#4B4B4B';
  clearBtn.style.boxShadow = '0 4px 0 #CCC';
  clearBtn.style.marginTop = '10px';
  clearBtn.style.fontSize = '16px';
  clearBtn.textContent = '🧹 Tanlovni tozalash';
  clearBtn.onclick = () => { playClick(); clearSelection(); };

  container.appendChild(clues);
  container.appendChild(gridBox);
  container.appendChild(clearBtn);
}

function checkAnswer() {
  const q = state.queue[0];
  let isCorrect = false;
  
  if(q.type === 'sentenceBuilder') isCorrect = isAnswerCorrect(activeAnswerData, q.arabic);
  else if(q.type === 'fillBlank') isCorrect = isAnswerCorrect(activeAnswerData, q.correct);
  else if(q.type === 'letterGrid') isCorrect = isAnswerCorrect(activeAnswerData, q.arabic);
  else if(q.type === 'wordSearch') isCorrect = true;
  
  handleAnswer(isCorrect);
}

function handleAnswer(isCorrect) {
  const q = state.queue[0];
  const sheet = document.getElementById('feedback-sheet');
  const msg = document.getElementById('feedback-msg');
  const emoji = document.getElementById('feedback-emoji');
  const btn = document.getElementById('feedback-btn');
  const arDiv = document.getElementById('feedback-correct-answer');
  
  document.getElementById('check-btn').style.display = 'none';
  
  if (isCorrect) {
    playCorrect();
    state.sessionXP += 10;
    sheet.className = 'feedback-sheet show correct';
    msg.textContent = "To'g'ri, barakalla!";
    emoji.textContent = "✅";
    arDiv.style.display = 'none';
    btn.className = 'btn btn-success';
  } else {
    playWrong();
    if(state.hearts > 0) state.hearts--;
    state.wrongCount++;
    updateHearts();
    
    if (state.isReviewMode) state.queue.push(q);
    else if (!state.mistakes.includes(q)) state.mistakes.push(q);
    
    sheet.className = 'feedback-sheet show wrong';
    msg.textContent = "Xato, lekin o'rganishda davom etamiz!";
    emoji.textContent = "💪"; 
    
    arDiv.style.display = 'block';
    arDiv.textContent = q.fullArabic || q.arabic || q.correct || "";
    btn.className = 'btn btn-danger';
  }
}

function nextQuestion() {
  state.queue.shift(); 
  state.qIndex++;
  renderQuestion(); 
}

function handleQueueEnd() {
    if (state.mistakes.length > 0) showScreen('mistakes-intro');
    else completeLesson();
}

function completeLesson() {
  playLevelUp();
  state.sessionXP += (state.hearts * 5); 
  progress.totalXP += state.sessionXP;
  
  if (!progress.completedLessons.includes(state.currentLesson.id)) {
    progress.completedLessons.push(state.currentLesson.id);
  }
  
  let foundCurrent = false;
  let nextUnlocked = false;
  curriculum.forEach(u => u.lessons.forEach(l => {
    if(foundCurrent && !nextUnlocked) {
      if(!progress.unlockedLessons.includes(l.id)) progress.unlockedLessons.push(l.id);
      nextUnlocked = true;
    }
    if(l.id === state.currentLesson.id) foundCurrent = true;
  }));
  
  progress.streak++; 
  saveProgress();
  
  document.getElementById('earned-xp').textContent = state.sessionXP;
  document.getElementById('result-wrong').textContent = state.wrongCount;
  
  let accuracy = Math.round(((state.initialQCount - state.wrongCount) / state.initialQCount) * 100);
  if(accuracy < 0) accuracy = 0;
  document.getElementById('result-accuracy').textContent = accuracy;

  const msg = document.getElementById('completion-msg');
  const emj = document.getElementById('completion-emoji');
  
  if (state.wrongCount === 0 && !state.isReviewMode) {
      msg.textContent = "Mukammal! Siz hech qanday xato qilmadingiz!"; 
      emj.textContent = "🏆";
  } else {
      msg.textContent = "Juda yaxshi! Xatolarni ustida ishlash orqali siz yanada kuchli bo'ldingiz!"; 
      emj.textContent = "🌟";
  }
  
  showScreen('lesson-complete');
}

function finishLesson() {
  showScreen('map');
}
