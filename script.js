
/* ---------------- Data & LocalStorage ---------------- */
const LOCAL_STORAGE_KEY = 'wordQuizCustomData';

// 초기 데이터 (기존 RAW 데이터)
const RAW_INITIAL = `
사진촬영술,사진술,촬영술|photography
비행기|airplane
관리자|manager
촬영하다|shoot
운동하다|work out
기술,기량|skill
주의 깊게,신중히|carefully
작업실|studio
~을 담당하다,~를 담당하다,-을 담당하다,-를 담당하다|be in charge of
순간|moment
물론|of course
신호|signal
훈련하다|train
편집자|editor
이야기하기|storytelling
`;

// 데이터를 객체 배열로 파싱하는 함수
function parseData(rawText) {
    return rawText.trim().split(/\n+/).map(line => {
        const [kor, eng] = line.split('|').map(s => s.trim());
        return {
            // ID는 숫자형으로 고유하게 부여
            id: Date.now() + Math.random(), 
            kor: kor.split(',').map(s => s.trim()).filter(s => s.length > 0),
            eng: eng.split(',').map(s => s.trim()).filter(s => s.length > 0)
        };
    }).filter(p => p.kor.length > 0 && p.eng.length > 0);
}

let PAIRS = []; // 전역 변수로 선언

// 로컬 스토리지에서 데이터 불러오기
function loadPairs() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
        try {
            PAIRS = JSON.parse(saved);
        } catch(e) {
            console.error("Failed to parse LocalStorage data. Loading initial data.", e);
            PAIRS = parseData(RAW_INITIAL);
        }
    } else {
        PAIRS = parseData(RAW_INITIAL);
    }
}

// 로컬 스토리지에 데이터 저장
function savePairs() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(PAIRS));
}

loadPairs(); // 앱 시작 시 데이터 로드


/* ---------------- Utilities ---------------- */
const $ = sel => document.querySelector(sel);
const shuffle = arr => {
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const normalize = s => s.trim().replace(/\s+/g,' ').toLowerCase();

/* ---------------- Quiz Controller ---------------- */
class QuizController {
  constructor(){
    this.reset();
  }
  
  // ★★★ [수정] reset 시 전역 PAIRS 최신값 참조 ★★★
  reset(){
    this.pairs = PAIRS.slice(); // 최신 단어 목록을 복사하여 사용

    this.mode = 'kor-to-eng';
    this.total = 0;
    this.queue = [];
    this.index = 0;
    this.correct = 0;
    this.history = [];
    this.active = false;
  }
  start(total, mode){
    this.reset(); // 항상 최신 단어 목록으로 재설정
    this.mode = mode;
    
    // 단어 목록이 없으면 퀴즈 시작 불가
    if (this.pairs.length === 0) {
        alert("퀴즈를 풀 단어가 단어장에 없습니다. 단어장 관리 탭에서 단어를 추가해주세요.");
        return;
    }

    this.total = Math.min(Math.max(1, parseInt(total||10)||10), 100);

    const times = Math.ceil(this.total / this.pairs.length);
    let pool = [];
    for(let i=0;i<times;i++) pool = pool.concat(this.pairs);

    this.queue = shuffle(pool).slice(0, this.total);
    this.active = true;
  }
  current(){
    return this.queue[this.index];
  }
  submit(answer){
    const pair = this.current();
    let ok=false;

    if(this.mode === 'kor-to-eng'){
      ok = pair.eng.some(e => normalize(answer) === normalize(e));
    } else {
      ok = pair.kor.some(k => normalize(answer) === normalize(k));
    }

    this.history.push({pair, answer, ok});
    if(ok) this.correct++;

    this.index++;
    if(this.index >= this.total) this.active = false;

    return {ok, pair};
  }
}

/* ---------------- DOM Caching ---------------- */
const qc = new QuizController(); // 인자 제거 (내부에서 PAIRS 참조)

const mode1Btn = $('#mode1');
const mode2Btn = $('#mode2');
const mode3Btn = $('#mode3'); // 단어 관리 탭
const startBtn = $('#startBtn');
const resetBtn = $('#resetBtn');
const countInput = $('#count');
const cueLabel = $('#cueLabel');
const cueMain = $('#cueMain');
const answerInput = $('#answerInput');
const submitBtn = $('#submitBtn');
const scoreText = $('#scoreText');
const progressText = $('#progressText');
const statusText = $('#statusText');
const progFill = $('#progFill');
const historyBox = $('#history');

// 단어 관리 섹션 DOM
const mainQuiz = $('#main');
const wordManager = $('#word-manager'); 
const newKorInput = $('#newKor');
const newEngInput = $('#newEng');
const addWordBtn = $('#addWordBtn');
const wordList = $('#wordList');
const saveBtn = $('#saveBtn');
const exportBtn = $('#exportBtn');

/* ---------------- Mode UI ---------------- */
function setModeUI(mode){
  const m1 = mode === 'kor-to-eng';
  const m2 = mode === 'eng-to-kor';
  const m3 = mode === 'manager';
  
  mode1Btn.classList.toggle('active', m1);
  mode2Btn.classList.toggle('active', m2);
  mode3Btn.classList.toggle('active', m3);

  mainQuiz.style.display = m3 ? 'none' : 'block';
  wordManager.style.display = m3 ? 'block' : 'none';

  /* ★ 모드 바뀌면 등장 애니메이션 */
  const shown = m3 ? wordManager : mainQuiz;
  shown.classList.add('fade-slide-up');

  // 0.45초 뒤에 클래스 제거 (다음 전환 준비)
  setTimeout(()=>{
    shown.classList.remove('fade-slide-up');
  },500);

  if(m3) renderWordList();
}

// 이벤트 리스너: 모드 전환
mode1Btn.addEventListener('click', () => {
  qc.reset();
  setModeUI('kor-to-eng');
  qc.mode = 'kor-to-eng';
  clearUI(); // 화면 초기화
});

mode2Btn.addEventListener('click', () => {
  qc.reset();
  setModeUI('eng-to-kor');
  qc.mode = 'eng-to-kor';
  clearUI(); // 화면 초기화
});

mode3Btn.addEventListener('click', () => {
  setModeUI('manager');
});

/* ---------------- Word Manager Functions ---------------- */

// 단어 목록을 화면에 렌더링
function renderWordList() {
    wordList.innerHTML = '';
    if (PAIRS.length === 0) {
        wordList.innerHTML = '<div class="entry" style="justify-content:center; color: var(--muted);">단어장에 단어가 없습니다.</div>';
        return;
    }
    
    // 최신 PAIRS를 기반으로 리스트 생성
    PAIRS.forEach(p => {
        const div = document.createElement('div');
        div.className = 'entry';
        // HTML 요소에 데이터 ID 부여
        div.dataset.id = p.id; 
        div.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:700;">${p.kor.join(', ')}</div>
                <div class="tag">→ ${p.eng.join(', ')}</div>
            </div>
            <button class="btn delete-btn clickable" style="background:linear-gradient(180deg, var(--danger), var(--darkred)); padding:6px 10px;">삭제</button>
        `;
        wordList.appendChild(div);
    });
}

// 단어 추가 버튼 이벤트
addWordBtn.addEventListener('click', () => {
    const korText = newKorInput.value.trim();
    const engText = newEngInput.value.trim();

    if (!korText || !engText) {
        alert("한국어 뜻과 영어 스펠링을 모두 입력해주세요.");
        return;
    }

    const newPair = {
        id: Date.now() + Math.random(),
        kor: korText.split(',').map(s => s.trim()).filter(s => s.length > 0),
        eng: engText.split(',').map(s => s.trim()).filter(s => s.length > 0)
    };
    
    PAIRS.push(newPair);
    renderWordList();
    
    newKorInput.value = '';
    newEngInput.value = '';
    alert("단어가 추가되었습니다! 저장 버튼을 눌러야 퀴즈와 브라우저에 반영됩니다.");
});

// 단어 삭제 이벤트 (위임)
wordList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const entry = e.target.closest('.entry');
        if (!entry) return;
        
        const id = Number(entry.dataset.id);
        
        if (confirm("정말로 이 단어를 삭제하시겠습니까?")) {
            PAIRS = PAIRS.filter(p => p.id !== id);
            renderWordList();
            alert("단어가 삭제되었습니다! 저장 버튼을 눌러야 퀴즈와 브라우저에 반영됩니다.");
        }
    }
});

// 로컬 스토리지에 저장 버튼 이벤트
saveBtn.addEventListener('click', () => {
    savePairs();
    // 저장 후 퀴즈 컨트롤러 리셋 (새로운 단어 목록 반영 준비)
    qc.reset(); 
    alert("단어장 내용이 브라우저에 저장되었습니다. 퀴즈를 새로 시작할 수 있습니다.");
});

// 단어 내보내기 버튼 이벤트
exportBtn.addEventListener('click', () => {
    const exportText = PAIRS.map(p => `${p.kor.join(', ')}|${p.eng.join(', ')}`).join('\n');
    prompt("아래 텍스트를 복사하여 백업할 수 있습니다.", exportText);
});


/* ---------------- Start / Reset ---------------- */
startBtn.addEventListener('click', ()=>{
  // start 전에 reset을 호출하여 최신 단어 목록으로 퀴즈 큐를 생성
  qc.reset(); 
    
  const cnt = parseInt(countInput.value) || 10;
  const mode = mode2Btn.classList.contains('active') ? 'eng-to-kor' : 'kor-to-eng';

  qc.start(cnt, mode);
  renderQuestion();
  updateStatus();
  answerInput.focus();
});

resetBtn.addEventListener('click', ()=>{
  qc.reset();
  setModeUI('kor-to-eng');
  countInput.value = 10;
  clearUI();
});

/* ---------------- Rendering ---------------- */
function renderQuestion(){
  // 문제 종료 상태 처리
  if(!qc.active){
    if(qc.index >= qc.total && qc.total>0){
      cueLabel.textContent = '완료';
      cueMain.textContent = `정답 ${qc.correct} / ${qc.total}`;
      statusText.textContent = '세션 종료';
      showSummary();
    } else {
      cueLabel.textContent = '준비';
      cueMain.textContent = '시작 버튼을 눌러주세요';
    }
    answerInput.value = '';
    return;
  }

  const cur = qc.current();

  if(qc.mode === 'kor-to-eng'){
    cueLabel.textContent = '뜻을 보고 스펠링 입력';
    cueMain.textContent = cur.kor.join(', ');
    answerInput.placeholder = '영어 스펠링을 입력하세요';
  } else {
    cueLabel.textContent = '스펠링 보고 뜻 입력';
    cueMain.textContent = cur.eng.join(', ');
    answerInput.placeholder = '한국어 뜻을 입력하세요';
  }

  answerInput.value = '';

  /* ===== 등장 애니메이션 추가 ===== */
  cueLabel.classList.add('fade-slide-up', 'fade-delay-1');
  cueMain.classList.add('fade-slide-up', 'fade-delay-2');
  answerInput.classList.add('fade-slide-up', 'fade-delay-3');
  submitBtn.classList.add('fade-slide-up', 'fade-delay-4');

  // 애니메이션 클래스 제거 준비 → 다음 문제에서 다시 재생되게
  setTimeout(() => {
    cueLabel.classList.remove('fade-slide-up','fade-delay-1');
    cueMain.classList.remove('fade-slide-up','fade-delay-2');
    answerInput.classList.remove('fade-slide-up','fade-delay-3');
    submitBtn.classList.remove('fade-slide-up','fade-delay-4');
  }, 500);
}

/* ---------------- Submit ---------------- */
function handleSubmit(){
  if(!qc.active) return;
  const userAns = answerInput.value;
  if(!userAns.trim()) return;

  const res = qc.submit(userAns);
  // historyBox.length 대신 qc.history.length 사용
  pushHistoryItem(res, qc.history.length); 

  updateStatus();
  renderQuestion();
}

submitBtn.addEventListener('click', handleSubmit);
answerInput.addEventListener('keydown', e=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    handleSubmit();
  }
});

/* ---------------- History ---------------- */
function pushHistoryItem({ok, pair}, idx){
  const div = document.createElement('div');
  div.className = 'entry';

  const left = document.createElement('div');
  // XSS 위험을 줄이기 위해 가능한 textContent 사용을 권장하지만, 현재 데이터 구조 유지
  left.innerHTML = `
    <div style="font-weight:700">${qc.mode==='kor-to-eng' ? pair.kor.join(', ') : pair.eng.join(', ')}</div>
    <div class="tag">정답: ${qc.mode==='kor-to-eng' ? pair.eng.join(', ') : pair.kor.join(', ')}</div>
  `;

  const right = document.createElement('div');
  right.style.textAlign='right';
  right.innerHTML = `
    <div style="font-weight:800;color:${ok?'var(--success)':'var(--danger)'}">
      ${ok ? '맞음' : '틀림'}
    </div>
    <div class="tag">풀이 ${idx}/${qc.total}</div>
  `;

  div.appendChild(left);
  div.appendChild(right);
  historyBox.insertBefore(div, historyBox.firstChild);
}

/* ---------------- Summary ---------------- */
function showSummary(){
  const summary = document.createElement('div');
  summary.className = 'entry';
  summary.style.background = 'rgba(0,0,0,0.03)';
  summary.innerHTML = `
    <div style="font-weight:700">세션 요약</div>
    <div class="tag">정답 ${qc.correct} / ${qc.total}</div>
  `;
  historyBox.insertBefore(summary, historyBox.firstChild);
}

/* ---------------- Status UI ---------------- */
function updateStatus(){
  scoreText.textContent = `정답: ${qc.correct}`;
  progressText.textContent = `${Math.min(qc.index,qc.total)} / ${qc.total}`;
  statusText.textContent = qc.active ? `풀이중 (${qc.index+1} / ${qc.total})` : (qc.total>0 ? '완료' : '준비');

  const pct = qc.total ? Math.round((qc.index/qc.total)*100) : 0;
  progFill.style.width = pct + '%';
}
/*=====애니메이션 함수=====*/
function renderQuiz() {
  const area = document.getElementById("quizArea");
  area.innerHTML = `
    <div class="question fade-slide-up fade-delay-1">${currentQuestion}</div>
    <div class="answer-row fade-slide-up fade-delay-2">
      <input id="answerInput" class="input-answer"/>
      <button class="btn fade-slide-up fade-delay-3" onclick="submitAnswer()">확인</button>
    </div>
    <div id="feedback" class="feedback fade-slide-up fade-delay-4"></div>
  `;
}
/* ---------------- Clear UI ---------------- */
function clearUI(){
  cueLabel.textContent = '준비';
  cueMain.textContent = '시작 버튼을 눌러주세요';
  answerInput.value = '';
  scoreText.textContent = '정답: 0';
  progressText.textContent = '0 / 0';
  statusText.textContent = '준비 상태';
  progFill.style.width = '0%';
  historyBox.innerHTML = '';
}
window.onload = () => {
  document.querySelector(".app").classList.add("fade-slide-up");
};
const app = document.querySelector(".app");
/*=========스크롤=========*/
function showTab(tab) {
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");

  if (tab === 1) {
    document.getElementById("quiz-meaning").style.display = "block";
    app.classList.remove("tab3-scroll");
  }
  else if (tab === 2) {
    document.getElementById("quiz-spell").style.display = "block";
    app.classList.remove("tab3-scroll");
  }
  else if (tab === 3) {
    document.getElementById("word-manager").style.display = "block";
    app.classList.add("tab3-scroll");
  }
}
/* ---------------- Keyboard Mode Switch ---------------- */
document.addEventListener('keydown', e=>{
  if(e.key === '1') mode1Btn.click();
  if(e.key === '2') mode2Btn.click();
  if(e.key === '3') mode3Btn.click(); // ★ [추가] 3번 키로 단어장 관리 이동
});

/* ---------------- Init ---------------- */
setModeUI('kor-to-eng');
clearUI();
