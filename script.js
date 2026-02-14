// ===============================
// 0) CONFIG (EDITA AQUÍ)
// ===============================
const MAX_TRIES_PER_HOUR = 10000;          // <-- intentos por intervalo
const HANGMAN_INTERVAL_MINUTES = 0;    // <-- intervalo en minutos (antes 60)
const HANGMAN_INTERVAL_MS = HANGMAN_INTERVAL_MINUTES * 60 * 1000;

// ===============================
// 1) GRID: flip + sparkles
// ===============================
function makeSparkles(layer, x, y) {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";

    const dx = (Math.random() * 120 - 60).toFixed(1) + "px";
    const dy = (Math.random() * 120 - 60).toFixed(1) + "px";
    s.style.setProperty("--dx", dx);
    s.style.setProperty("--dy", dy);

    s.style.left = (x + (Math.random() * 20 - 10)) + "px";
    s.style.top = (y + (Math.random() * 20 - 10)) + "px";

    layer.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }
}

document.querySelectorAll(".cardBtn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const front = btn.querySelector(".front");
    const layer = btn.querySelector(".sparkle-layer");
    const rect = front.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    makeSparkles(layer, x, y);
    btn.classList.toggle("flipped");
  });
});

// ===============================
// 2) MODAL
// ===============================
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalClose = document.getElementById("modalClose");

function openModal(title, text) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ===============================
// 3) AHORCADO (N intentos por intervalo)
//    + localStorage letras usadas
// ===============================
const WORD = "ROSTI POLLOS";

const LS_TRIES = "hangman_tries";
const LS_TIME  = "hangman_time";
const LS_USED  = "hangman_used";

let guessed = [];
let tries = MAX_TRIES_PER_HOUR;

const wordEl = document.getElementById("word");
const triesLeftEl = document.getElementById("triesLeft");
const usedLettersEl = document.getElementById("usedLetters");
const cooldownInfoEl = document.getElementById("cooldownInfo");
const inputEl = document.getElementById("letter");
const btnEl = document.getElementById("guessBtn");

// Opcional: si tu HTML tiene <span id="maxTriesText"></span>
const maxTriesTextEl = document.getElementById("maxTriesText");
if (maxTriesTextEl) maxTriesTextEl.textContent = MAX_TRIES_PER_HOUR;

// Opcional: si tu HTML tiene <span id="intervalText"></span>
const intervalTextEl = document.getElementById("intervalText");
if (intervalTextEl) intervalTextEl.textContent = HANGMAN_INTERVAL_MINUTES;

function nowMs(){ return Date.now(); }

function minutesLeftInWindow(startMs) {
  const elapsed = nowMs() - startMs;
  const leftMs = Math.max(0, HANGMAN_INTERVAL_MS - elapsed);
  return Math.ceil(leftMs / 1000 / 60);
}

function resetHangmanState() {
  tries = MAX_TRIES_PER_HOUR;
  guessed = [];
  localStorage.removeItem(LS_TRIES);
  localStorage.removeItem(LS_USED);
  localStorage.removeItem(LS_TIME);
  updateHangmanUI();
}

function loadHangmanState() {
  const savedTime = Number(localStorage.getItem(LS_TIME) || 0);
  const savedTries = localStorage.getItem(LS_TRIES);
  const savedUsed = localStorage.getItem(LS_USED);

  if (savedTime) {
    const diff = nowMs() - savedTime;
    if (diff >= HANGMAN_INTERVAL_MS) {
      resetHangmanState();
      return;
    }
    if (savedTries !== null) tries = Number(savedTries);
    if (savedUsed) guessed = JSON.parse(savedUsed);
  } else {
    tries = MAX_TRIES_PER_HOUR;
  }

  updateHangmanUI();
}

function saveHangmanState() {
  localStorage.setItem(LS_TRIES, String(tries));
  localStorage.setItem(LS_USED, JSON.stringify(guessed));
  if (!localStorage.getItem(LS_TIME)) {
    localStorage.setItem(LS_TIME, String(nowMs()));
  }
}

function drawWord() {
  const uniqueLetters = new Set(WORD.replaceAll(" ", "").split(""));
  let display = "";

  for (const ch of WORD) {
    if (ch === " ") display += "  ";
    else display += guessed.includes(ch) ? ch : "_";
    display += " ";
  }

  wordEl.textContent = display.trim();

  let ok = true;
  for (const letter of uniqueLetters) {
    if (!guessed.includes(letter)) { ok = false; break; }
  }
  return ok;
}

function updateHangmanUI() {
  const won = drawWord();

  triesLeftEl.textContent = String(tries);
  usedLettersEl.textContent = guessed.length ? guessed.join(", ") : "—";
  btnEl.disabled = tries <= 0;

  const startMs = Number(localStorage.getItem(LS_TIME) || 0);
  if (tries <= 0 && startMs) {
    cooldownInfoEl.textContent =
      `Vuelve a intentar en ~${minutesLeftInWindow(startMs)} min 🕒❤️`;
  } else {
    cooldownInfoEl.textContent = "";
  }

  if (won) {
    openModal(
      "😍 ¡Adivinaste!",
      "Sabía que ibas a adivinarla 😍🍗✨ Iremos mañana por esa bandeja que tanto nos gusta ❤️"
    );
  }
}

function normalizeLetter(v) {
  return (v || "").toUpperCase().trim();
}

function guess() {
  const savedTime = Number(localStorage.getItem(LS_TIME) || 0);
  if (savedTime && (nowMs() - savedTime) >= HANGMAN_INTERVAL_MS) {
    resetHangmanState();
  }

  if (tries <= 0) {
    openModal("⏳ Sin jugadas", "Por ahora ya no hay jugadas 😭 Volvé en un ratito ❤️");
    return;
  }

  let l = normalizeLetter(inputEl.value);
  inputEl.value = "";
  inputEl.focus();

  if (!l || l.length !== 1 || !/^[A-ZÑ]$/.test(l)) {
    openModal("😅 Solo una letra", "Poné una sola letra (A-Z) 😊");
    return;
  }

  if (guessed.includes(l)) {
    openModal("😄 Ya usada", "Esa letra ya la usaste. Probá otra ✨");
    return;
  }

  guessed.push(l);
  tries--; // consume intento

  saveHangmanState();
  updateHangmanUI();
}

btnEl.addEventListener("click", guess);
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement?.id === "letter") {
    guess();
  }
});

loadHangmanState();

// ===============================
// 4) CONTADOR: desbloquea letras
// ===============================

// 🔧 Para debug (13 feb), descomentá y ajustá:
// const START = new Date("Feb 13 2026 20:00:00").getTime();
// const END   = new Date("Feb 13 2026 20:05:00").getTime();

// ✅ Real: 14 feb 1:00am -> 2:00pm
const START = new Date("Feb 14 2026 00:00:00").getTime();
const END   = new Date("Feb 14 2026 00:02:00").getTime();

const MESSAGE = "Te amo, eres el amor de mi vida";

const secretEl = document.getElementById("secret");
const statusEl = document.getElementById("countStatus");

function updateUnlockMessage() {
  const now = Date.now();

  if (now < START) {
    statusEl.textContent = "Aún no empieza… 😌 (se desbloquea desde la 1:00am)";
    secretEl.textContent = "⏳";
    return;
  }

  const total = END - START;
  const passed = Math.min(total, now - START);
  const progress = total <= 0 ? 1 : (passed / total);

  const letters = Math.floor(MESSAGE.length * progress);
  statusEl.textContent = "Se está desbloqueando… ✨";
  secretEl.textContent = MESSAGE.substring(0, letters);

  if (now >= END) {
    statusEl.textContent = "Completado 💖";
    secretEl.textContent = MESSAGE;
  }
}

updateUnlockMessage();
setInterval(updateUnlockMessage, 1000);


