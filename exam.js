/* ================== GLOBAL SETTINGS ================== */
let students = {}
let answers = {}

// *** URL ของ Google Apps Script ***
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxBxub0pQNzcvBcknMDKuscTXI8Q-i03LyJrTXfXHg3IQDoxPYNkZ15LRNod4bUGuPB/exec"; 

// เฉลย 60 ข้อ (สลับใหม่เรียบร้อย)
const correctAnswers = {
  1: "ก", 2: "ข", 3: "ก", 4: "ง", 5: "ง", 6: "ข", 7: "ค", 8: "ก", 9: "ข", 10: "ง",
  11: "ก", 12: "ค", 13: "ข", 14: "ก", 15: "ง", 16: "ข", 17: "ค", 18: "ก", 19: "ข", 20: "ง",
  21: "ก", 22: "ค", 23: "ก", 24: "ข", 25: "ง", 26: "ข", 27: "ก", 28: "ค", 29: "ข", 30: "ง",
  31: "ก", 32: "ข", 33: "ค", 34: "ง", 35: "ก", 36: "ค", 37: "ข", 38: "ง", 39: "ก", 40: "ข",
  41: "ค", 42: "ง", 43: "ก", 44: "ข", 45: "ค", 46: "ง", 47: "ก", 48: "ข", 49: "ค", 50: "ง",
  51: "ก", 52: "ข", 53: "ค", 54: "ง", 55: "ก", 56: "ข", 57: "ค", 58: "ง", 59: "ก", 60: "ข"
};

const TOTAL_QUESTIONS = 60; 
const PASS_SCORE = 30;      
let timeLeft = 1.5 * 60;     // 90 นาที
let timerInterval;
let alert30Shown = false;   // ตัวแปรเช็คการแจ้งเตือน 30 นาที

// เวลาเริ่มสอบ (ตั้งค่าตามเดิมที่คุณส่งมา)
const EXAM_START_TIME = new Date(2026, 0, 27, 15, 59, 0);

/* ================== CUSTOM POPUP SYSTEM ================== */
function showModal(title, message, icon = '⚠️', callback = null) {
  let modal = document.getElementById('customModal');
  if (!modal) {
    const modalHTML = `
      <div id="customModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-icon" id="modalIcon"></div>
          <h2 id="modalTitle" style="margin:0 0 10px 0;"></h2>
          <p id="modalMsg" style="margin-bottom:25px; line-height:1.6;"></p>
          <button class="btn-login" id="modalBtn" style="padding: 10px 30px; cursor: pointer;">ตกลง</button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('customModal');
  }
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalMsg').innerText = message;
  document.getElementById('modalIcon').innerText = icon;
  modal.classList.add('active');
  document.getElementById('modalBtn').onclick = () => {
    modal.classList.remove('active');
    if (callback) callback();
  };
}

/* ================== DATABASE SENDING ================== */
function sendDataToSheet(score, total, status) {
    const studentId = localStorage.getItem("sid");
    const studentName = localStorage.getItem("sname");
    const userAnswers = JSON.parse(localStorage.getItem("userAnswers") || "{}");

    const payload = {
        studentId: studentId,
        studentName: studentName,
        score: score,
        total: total,
        status: status,
        answers: userAnswers
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(() => console.log("ส่งข้อมูลสำเร็จ"))
    .catch(err => console.error("เกิดข้อผิดพลาด:", err));
}

/* ================== LOAD STUDENTS ================== */
if (document.getElementById("sid") || location.pathname.includes("exam.html")) {
  fetch("students.json")
    .then(res => res.json())
    .then(data => students = data)
    .catch(err => console.log("รอโหลดไฟล์นักศึกษา..."))
}

/* ================== LOGIN PAGE ================== */
function checkStudent(){
  const id = document.getElementById("sid").value.trim()
  if(!students[id]) return showModal("ไม่พบข้อมูล", "ไม่พบข้อมูลนักศึกษานี้ในระบบ", "❌");

  localStorage.clear(); 
  localStorage.setItem("sid", id)
  localStorage.setItem("sname", students[id])
  
  // เข้าหน้าสอบทันที (ตัดการบังคับ Full Screen ออก)
  location.href = "exam.html";
}

// ฟังก์ชันปุ่มตัวเลขหน้า Login
function pressNum(val) {
  const input = document.getElementById('sid');
  if (val === 'del') {
    input.value = input.value.slice(0, -1);
  } else if (val === 'clr') {
    input.value = '';
  } else {
    if (input.value.length < 15) input.value += val;
  }
  if (typeof updateVisual === 'function') updateVisual();
}

/* ================== EXAM PAGE INITIALIZE ================== */
if(location.pathname.includes("exam.html")){
  const sname = localStorage.getItem("sname")
  if(!sname) {
      location.href = "index.html";
  } else {
      document.getElementById("studentName").innerText = "ผู้รับการทดสอบ : " + sname
      initSecurity()
      checkExamTimeStatus() // ระบบตรวจสอบเวลาเริ่มสอบ
  }
}

function checkExamTimeStatus() {
  const examContainer = document.getElementById("examContainer");
  const timerLoop = setInterval(() => {
    const now = new Date();
    if (now < EXAM_START_TIME) {
      if(examContainer) examContainer.style.display = "none";
      if (!document.getElementById("waitMessage")) {
        const waitHTML = `
          <div id="waitMessage" style="text-align:center; margin-top:100px; padding:40px;">
            <div style="font-size: 5rem; margin-bottom: 20px;">⏳</div>
            <h2 style="color:#f39c12; font-size: 2rem;">ยังไม่ถึงเวลาเริ่มการทดสอบ</h2>
            <div id="countdownDisplay" style="font-weight:bold; font-size:2.5rem; color:#2c3e50; margin-top:20px;"></div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', waitHTML);
      }
      const diff = EXAM_START_TIME - now;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const countdown = document.getElementById("countdownDisplay");
      if(countdown) countdown.innerText = `เริ่มสอบในอีก ${mins} นาที ${secs} วินาที`;
    } else {
      clearInterval(timerLoop);
      const wm = document.getElementById("waitMessage");
      if(wm) wm.remove();
      if(examContainer) {
        examContainer.style.display = "flex";
        startTimer(); // ถึงเวลาเริ่มสอบแล้ว ค่อยเริ่มตัวนับเวลา 90 นาที
      }
    }
  }, 1000);
}



/* ================== TIMER SYSTEM ================== */
function startTimer(){
  updateTimer()
  timerInterval = setInterval(()=>{
    timeLeft--
    updateTimer()

    // แจ้งเตือนเมื่อเหลือ 30 นาที (1800 วินาที)
    if (timeLeft === 1800 && !alert30Shown) {
      alert30Shown = true;
      showModal("แจ้งเตือนเวลา", "เหลือเวลาอีก 30 นาที กรุณาตรวจสอบคำตอบและทำให้ครบ", "⏰");
    }

    if (timeLeft === 600 && !alert30Shown) {
      alert30Shown = true;
      showModal("แจ้งเตือนเวลา", "เหลือเวลาอีก 10 นาที กรุณาตรวจสอบคำตอบและทำให้ครบ", "⏰");
    }

    if (timeLeft === 300 && !alert30Shown) {
      alert30Shown = true;
      showModal("แจ้งเตือนเวลา", "เหลือเวลาอีก 5 นาที กรุณาตรวจสอบคำตอบและทำให้ครบ", "⏰");
    }
    if (timeLeft === 60 && !alert30Shown) {
      alert30Shown = true;
      showModal("แจ้งเตือนเวลา", "เหลือเวลาอีก 1 นาที กรุณาตรวจสอบคำตอบและทำให้ครบ", "⏰");
    }

    if(timeLeft <= 0){
      clearInterval(timerInterval)
      submitExam(true) // หมดเวลา -> เก็บกระดาษคำตอบอัตโนมัติ
    }
  },1000)
}

function updateTimer(){
  let m = Math.floor(timeLeft/60)
  let s = timeLeft % 60
  const t = document.getElementById("timer")
  if(t) {
    t.innerText = `${m}:${s.toString().padStart(2,"0")}`
    if(timeLeft <= 300) t.style.color = "#ff4444";
  }
}

/* ================== ANSWER LOGIC ================== */
function mark(q, a, btn){
  answers[q] = a
  const parent = btn.parentElement;
  parent.querySelectorAll("button").forEach(b => b.classList.remove("active"))
  btn.classList.add("active")
  
  // เก็บคำตอบลง Storage ทันทีเพื่อป้องกันข้อมูลหาย
  localStorage.setItem("userAnswers", JSON.stringify(answers));
}


/* ================== SUBMIT LOGIC (Auto only) ================== */
function submitExam(auto){
  // ล็อกการแจ้งเตือนหน้าต่างปิด
  window.onbeforeunload = null;
  localStorage.setItem("userAnswers", JSON.stringify(answers));
  
  // บังคับย้ายไปหน้าประมวลผลทันทีเมื่อหมดเวลา
  location.href = "processing.html";
}

/* ================== SECURITY (คงเดิม) ================== */
function initSecurity(){
  window.onbeforeunload = () => "คุณกำลังทำข้อสอบอยู่"
  
  // 1. ตรวจจับการสลับแท็บ/พับจอ
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden) submitExam(true);
  })

  // 2. ป้องกันคลิกขวาและปุ่มลัด
  document.addEventListener("contextmenu", e => e.preventDefault())
  document.addEventListener("keydown", (e) => {
      if(e.ctrlKey || e.metaKey || e.altKey || e.key.startsWith('F')) {
          e.preventDefault();
      }
  }, true);
}

/* ================== RESULT PAGE (LOCKED) ================== */
if(location.pathname.includes("result.html")){
  const userAns = JSON.parse(localStorage.getItem("userAnswers") || "{}")
  let score = 0
  for(let i=1; i<=TOTAL_QUESTIONS; i++){
    if(userAns[i]?.toString() === correctAnswers[i]) score++
  }
  const isPass = score >= PASS_SCORE
  const statusText = isPass ? "ผ่านการทดสอบ" : "ไม่ผ่านการทดสอบ"

  if(!localStorage.getItem("dataSent")){
      sendDataToSheet(score, TOTAL_QUESTIONS, statusText);
      localStorage.setItem("dataSent", "true");
  }

  document.body.style.background = "#e8f5e9";

  const resultBox = document.getElementById("resultBox");
  if(resultBox) {
    resultBox.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <div style="font-size: 5rem; margin-bottom: 20px;">✅</div>
        <h2 style="color:var(--primary); font-size: 2.2rem;">ส่งคำตอบสำเร็จ!</h2>
        <hr style="border:1px solid #ddd; margin:20px 0;">
        <p style="font-size:1.3rem;">นักศึกษา: <b>${localStorage.getItem("sname")}</b></p>
        
        <div style="background: #fff; border: 2px dashed #388e3c; padding: 20px; border-radius: 15px; display: inline-block; margin-top:20px;">
           <p style="margin: 0; font-size: 1.1rem; color: #2e7d32;">
             <b>ระบบได้บันทึกคะแนนลงฐานข้อมูลเรียบร้อยแล้ว</b><br>
             กรุณานั่งรอคำสั่งจากอาจารย์
           </p>
        </div>
      </div>`
  }

  history.pushState(null, null, location.href);
  window.onpopstate = function () {
      history.go(1);
  };
}