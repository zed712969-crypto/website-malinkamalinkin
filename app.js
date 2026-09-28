/* ═══════════════════════════════════════════════════════════════
   app.js  —  Portfolio (nic0martins.com-style clone)
   ─────────────────────────────────────────────────────────────
   • Text scramble entrance animation (TwistFlash-like)
   • GLTFLoader Skipper model with polygon-by-polygon reveal
   • Click model → re-trigger polygon build
   • 6 color schemes  •  hover sound ticks
   ═══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   1. TEXT SCRAMBLE + STAGGERED ENTRANCE
   ────────────────────────────────────────── */
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#01';

class TextScramble {
  constructor(el) {
    this.el = el;
    this.original = el.innerHTML;
    this.plainText = el.textContent;
    this.queue = [];
    this.frame = 0;
    this.running = false;
  }

  scramble() {
    return new Promise(resolve => {
      const text = this.plainText;
      const len = text.length;
      this.queue = [];

      for (let i = 0; i < len; i++) {
        const start = Math.floor(Math.random() * 20);
        const end = start + Math.floor(Math.random() * 25) + 5;
        this.queue.push({ char: text[i], start, end, current: '' });
      }

      this.frame = 0;
      this.running = true;
      this._resolve = resolve;
      this._tick();
    });
  }

  _tick() {
    let output = '';
    let done = 0;

    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (this.frame >= q.end) {
        output += q.char;
        done++;
      } else if (this.frame >= q.start) {
        const rc = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        const safeRc = rc === '<' ? '&lt;' : (rc === '>' ? '&gt;' : rc);
        output += `<span class="scr">${safeRc}</span>`;
      } else {
        output += '&nbsp;';
      }
    }

    // Preserve inner HTML (links etc.) after scramble finishes
    if (done === this.queue.length) {
      this.el.innerHTML = this.original;
      this.running = false;
      this._resolve();
      return;
    }

    this.el.innerHTML = output;
    this.frame++;
    requestAnimationFrame(() => this._tick());
  }
}

// Staggered entrance with flicker + scramble
function runEntranceAnimations() {
  window._entranceStarted = true;
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) heroBg.classList.add('visible');

  const els = document.querySelectorAll('[data-enter]');
  const STEP = 55; // ms between elements

  // Trigger 3D model reveal in exact sync with first text element ("Malinka" at 200ms)
  setTimeout(() => {
    if (typeof window.triggerModelReveal === 'function') {
      window.triggerModelReveal();
    }
  }, 200);

  els.forEach(el => {
    const i = parseInt(el.dataset.enter, 10);
    const delay = i * STEP + 200;

    // Find scramble targets inside this element
    const scrambleEl = el.querySelector('[data-scramble]') || (el.hasAttribute('data-scramble') ? el : null);

    setTimeout(() => {
      // Add flicker class first
      el.classList.add('flicker');

      // Start scramble if applicable
      if (scrambleEl) {
        const scr = new TextScramble(scrambleEl);
        scr.scramble();
      }

      // After a tiny delay, add the entered class (slide up + unblur)
      setTimeout(() => {
        el.classList.add('entered');
      }, 30);

      // Remove flicker class after it completes
      setTimeout(() => {
        el.classList.remove('flicker');
      }, 350);
    }, delay);
  });
}

/* ──────────────────────────────────────────
   REAL-TIME BROWSER TAB TITLE TYPEWRITER
   ────────────────────────────────────────── */
const MAIN_TITLE = "малинка  —  сын шл...";
const AWAY_TITLE = "куда ушел, вернись...";
window.MAIN_TITLE = MAIN_TITLE;
window.AWAY_TITLE = AWAY_TITLE;
window.__isSiteLoaded = false;

const INVISIBLE_TITLE_CHAR = '\u200E'; // Left-to-Right Mark: 0-width invisible character that prevents Chromium from collapsing empty title to URL/localhost

class TitleTypewriter {
  constructor(initialText = '') {
    this.current = (initialText || '').replace(/\u200E/g, '');
    this.target = this.current;
    this.activeTask = 0;
    this.isAnimating = false;
    this.worker = null;
    this.initWorker();
    document.title = this.current || INVISIBLE_TITLE_CHAR;
  }

  initWorker() {
    try {
      const code = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data.action === 'start') {
            clearInterval(timer);
            timer = setInterval(() => self.postMessage('tick'), e.data.interval || 20);
          } else if (e.data.action === 'stop') {
            clearInterval(timer);
          }
        };
      `;
      const blob = new Blob([code], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    } catch (_) {
      this.worker = null;
    }
  }

  to(targetText, options = {}) {
    if (this.current === targetText && (!this.isAnimating || this.target === targetText)) {
      return;
    }
    this.target = targetText;
    const taskId = ++this.activeTask;
    this.isAnimating = true;

    const fromText = this.current;
    const toText = targetText;

    const eraseSpeed = options.eraseSpeed || 14;
    const typeSpeed = options.typeSpeed || 24;
    const pause = options.pause !== undefined ? options.pause : 10;
    const onComplete = options.onComplete || null;

    // Time-based phase scheduling
    const eraseDuration = fromText.length * eraseSpeed;
    const typeDuration = toText.length * typeSpeed;

    const startTime = performance.now();
    const eraseEndTime = startTime + eraseDuration;
    const typeStartTime = eraseDuration > 0 ? (eraseEndTime + pause) : startTime;
    const totalEndTime = typeStartTime + typeDuration;

    let fallbackTimeout = null;

    const tick = () => {
      if (this.activeTask !== taskId) {
        if (this.worker) this.worker.postMessage({ action: 'stop' });
        clearTimeout(fallbackTimeout);
        return;
      }

      const now = performance.now();

      if (now < eraseEndTime) {
        // Erasing phase (time-based interpolation: immune to browser throttling!)
        const progress = Math.min(1, (now - startTime) / Math.max(1, eraseDuration));
        const remLen = Math.round(fromText.length * (1 - progress));
        this.current = fromText.slice(0, remLen);
        document.title = this.current || INVISIBLE_TITLE_CHAR;
      } else if (now < typeStartTime) {
        // Brief pause between erase and type
        this.current = '';
        document.title = INVISIBLE_TITLE_CHAR;
      } else if (now < totalEndTime) {
        // Typing phase (time-based interpolation)
        const progress = Math.min(1, (now - typeStartTime) / Math.max(1, typeDuration));
        const typedLen = Math.round(toText.length * progress);
        this.current = toText.slice(0, typedLen);
        document.title = this.current || INVISIBLE_TITLE_CHAR;
      } else {
        // Completed
        this.current = toText;
        document.title = toText || INVISIBLE_TITLE_CHAR;
        this.isAnimating = false;
        if (this.worker) this.worker.postMessage({ action: 'stop' });
        clearTimeout(fallbackTimeout);
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      if (!this.worker) {
        fallbackTimeout = setTimeout(tick, 16);
      }
    };

    if (this.worker) {
      this.worker.onmessage = tick;
      this.worker.postMessage({ action: 'start', interval: 18 });
    } else {
      tick();
    }
  }

  setInstant(text) {
    this.activeTask++;
    this.isAnimating = false;
    if (this.worker) this.worker.postMessage({ action: 'stop' });
    this.current = text;
    this.target = text;
    document.title = text || INVISIBLE_TITLE_CHAR;
  }
}

const titleTypewriter = new TitleTypewriter('');
window.titleTypewriter = titleTypewriter;

/* ──────────────────────────────────────────
   IPHONE SETUP "HELLO" MULTILINGUAL INTRO
   ────────────────────────────────────────── */
const HELLO_WORDS = [
  { text: 'Привет!', dur: 520 },     // Russian
  { text: 'Hello!', dur: 400 },      // English
  { text: 'Bonjour!', dur: 300 },    // French
  { text: 'Hola!', dur: 240 },       // Spanish
  { text: 'Ciao!', dur: 190 },       // Italian
  { text: 'Hallo!', dur: 160 },      // German
  { text: 'こんにちは!', dur: 130 },  // Japanese
  { text: 'Olá!', dur: 110 },        // Portuguese
  { text: '안녕하세요!', dur: 95 },   // Korean
  { text: '你好!', dur: 85 },        // Chinese
  { text: 'مرحبا!', dur: 75 },       // Arabic
  { text: 'नमस्ते!', dur: 70 },       // Hindi
  { text: 'Merhaba!', dur: 65 },     // Turkish
  { text: 'Hej!', dur: 60 },         // Swedish
  { text: 'Cześć!', dur: 55 },       // Polish
  { text: 'Γειά σου!', dur: 50 },    // Greek
  { text: 'Привіт!', dur: 45 },      // Ukrainian
  { text: 'Shalom!', dur: 45 }       // Hebrew
];

let helloIntroFinished = false;
let currentHelloWord = 'Привет!';
let finishHelloIntro = null;

function startHelloIntro(onComplete) {
  const introEl = document.getElementById('hello-intro');
  const textEl = document.getElementById('hello-text');

  if (!introEl || !textEl) {
    helloIntroFinished = true;
    onComplete();
    return;
  }

  let index = 0;
  let finished = false;

  finishHelloIntro = function(immediate = false) {
    if (finished) return;
    finished = true;
    helloIntroFinished = true;

    if (!document.hidden && titleTypewriter) {
      titleTypewriter.to('загрузка...', { typeSpeed: 28, eraseSpeed: 14, pause: 20 });
    }

    function triggerBoom() {
      if (animId) cancelAnimationFrame(animId);
      introEl.classList.remove('warmup');
      textEl.classList.remove('glitch-warmup');
      introEl.classList.add('boom');

      // Unleash site entrance (wireframe cat reveal + hero text stagger)
      onComplete();

      // Clean up overlay from DOM after boom transition completes
      setTimeout(() => {
        if (introEl.parentNode) {
          introEl.parentNode.removeChild(introEl);
        }
      }, 450);
    }

    if (immediate) {
      triggerBoom();
      return;
    }

    // 1. Warmup Phase ("Прогрев"):
    // Glitch build-up matching site text scramble and chip flicker aesthetics
    introEl.classList.add('warmup');
    textEl.classList.add('glitch-warmup');

    const WARMUP_DURATION = 680; // ms
    const startTime = performance.now();
    let animId;
    const baseWord = currentHelloWord || 'Shalom!';
    const len = Math.max(6, baseWord.length);

    function warmupTick() {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / WARMUP_DURATION);

      if (progress >= 1) {
        cancelAnimationFrame(animId);
        triggerBoom();
        return;
      }

      // Dynamic scramble: starts from the last word and destabilizes into cyber glyphs
      let out = '';
      for (let i = 0; i < len; i++) {
        const scrambleProbability = 0.25 + progress * 0.75;
        if (Math.random() < scrambleProbability) {
          const rawChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          const rc = rawChar === '<' ? '&lt;' : (rawChar === '>' ? '&gt;' : rawChar);
          if (Math.random() > 0.4) {
            out += `<span class="scr">${rc}</span>`;
          } else {
            out += rc;
          }
        } else {
          const char = baseWord[i] || SCRAMBLE_CHARS[i % SCRAMBLE_CHARS.length];
          const safeChar = char === '<' ? '&lt;' : (char === '>' ? '&gt;' : char);
          out += safeChar;
        }
      }
      textEl.innerHTML = out;

      animId = requestAnimationFrame(warmupTick);
    }

    animId = requestAnimationFrame(warmupTick);
  };

  function step() {
    if (finished) return;
    if (index >= HELLO_WORDS.length) {
      finishHelloIntro(false);
      return;
    }

    const item = HELLO_WORDS[index];
    currentHelloWord = item.text;
    textEl.textContent = item.text;

    // Real-time title typewriter: backspace & type current greeting
    if (!document.hidden && window.titleTypewriter) {
      const charCount = Math.max(1, item.text.length);
      const tSpeed = Math.max(14, Math.floor((item.dur * 0.55) / charCount));
      const eSpeed = Math.max(10, Math.floor(tSpeed * 0.55));
      window.titleTypewriter.to(item.text, { typeSpeed: tSpeed, eraseSpeed: eSpeed, pause: 20 });
    }

    // Kinetic entry animation using Web Animations API (native & 60/120fps on mobile)
    if (typeof textEl.animate === 'function') {
      const animDur = Math.min(240, Math.max(45, item.dur * 0.75));
      textEl.animate([
        { opacity: 0.2, transform: index > 4 ? 'translateY(4px)' : 'translateY(12px) scale(0.97)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], {
        duration: animDur,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both'
      });
    } else {
      textEl.classList.remove('word-in', 'word-fast');
      void textEl.offsetWidth;
      textEl.classList.add(index > 4 ? 'word-fast' : 'word-in');
    }

    index++;
    setTimeout(step, item.dur);
  }

  // Quick skip: double click, touch double-tap, or Escape
  introEl.addEventListener('dblclick', () => finishHelloIntro(true));
  let lastTouch = 0;
  introEl.addEventListener('touchend', () => {
    const t = performance.now();
    if (t - lastTouch < 320) {
      finishHelloIntro(true);
    }
    lastTouch = t;
  }, { passive: true });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') finishHelloIntro(true);
  }, { once: true });

  window.__helloDebug = {
    get isDone() { return helloIntroFinished; },
    get currentWord() { return currentHelloWord; },
    skip: () => finishHelloIntro && finishHelloIntro(true)
  };

  // Launch word sequence
  step();
}

// Start with iPhone "Hello" multilingual intro as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => startHelloIntro(runEntranceAnimations), { once: true });
} else {
  startHelloIntro(runEntranceAnimations);
}

// Staggered entrance for Works section ("синяя шапка") on first scroll
let worksAnimated = false;
function runWorksEntranceAnimations() {
  if (worksAnimated) return;
  worksAnimated = true;

  const els = document.querySelectorAll('[data-enter-works]');
  const STEP = 45; // ms stagger

  els.forEach(el => {
    const i = parseInt(el.getAttribute('data-enter-works'), 10) || 0;
    const delay = i * STEP + 60;

    const scrambleEl = el.querySelector('[data-scramble]') || (el.hasAttribute('data-scramble') ? el : null);

    setTimeout(() => {
      el.classList.add('flicker');

      if (scrambleEl) {
        const scr = new TextScramble(scrambleEl);
        scr.scramble();
      }

      setTimeout(() => {
        el.classList.add('entered');
      }, 25);

      setTimeout(() => {
        el.classList.remove('flicker');
      }, 350);
    }, delay);
  });
}

// Trigger works entrance when user scrolls to it
if (typeof IntersectionObserver !== 'undefined') {
  const worksObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.08) {
        runWorksEntranceAnimations();
      }
    });
  }, { threshold: [0.08, 0.2] });

  const targetWorks = document.getElementById('works');
  if (targetWorks) worksObserver.observe(targetWorks);
}

window.addEventListener('scroll', () => {
  if (worksAnimated) return;
  const targetWorks = document.getElementById('works');
  const rect = targetWorks?.getBoundingClientRect();
  if (rect && rect.top < window.innerHeight * 0.88) {
    runWorksEntranceAnimations();
  }
}, { passive: true });

/* ──────────────────────────────────────────
   2. COLOR SCHEMES
   ────────────────────────────────────────── */
const SCHEMES = [
  { bg: '#1337ff', ink: '#e6e6e6' },
  { bg: '#d9d9d9', ink: '#1337ff' },
  { bg: '#ff1337', ink: '#e6e6e6' },
  { bg: '#d9d9d9', ink: '#ff1337' },
  { bg: '#1e1e1e', ink: '#e6e6e6' },
  { bg: '#d9d9d9', ink: '#1e1e1e' },
];

const worksEl = document.getElementById('works');
const swatches = document.querySelectorAll('.sw');

function applyScheme(idx) {
  const s = SCHEMES[idx];
  const r = document.documentElement.style;
  r.setProperty('--w-bg', s.bg);
  r.setProperty('--w-ink', s.ink);
  r.setProperty('--w-chip', `color-mix(in srgb, ${s.ink} 8%, ${s.bg})`);
  r.setProperty('--w-chip-lit', s.ink);
  r.setProperty('--w-chip-ink', s.bg);
  worksEl.style.background = s.bg;
  worksEl.style.color = s.ink;
  swatches.forEach((sw, j) => {
    sw.classList.toggle('active', j === idx);
    sw.setAttribute('aria-pressed', j === idx);
  });
}

swatches.forEach((sw, i) => sw.addEventListener('click', () => applyScheme(i)));

/* ──────────────────────────────────────────
   3. SOUND EFFECTS (SFX)
   ────────────────────────────────────────── */
const btnSound = document.getElementById('btn-sound');

let soundOn = true, audioCtx = null, userInteracted = false;

function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

if (btnSound) {
  btnSound.addEventListener('click', () => {
    soundOn = !soundOn;
    btnSound.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
    btnSound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    if (soundOn) {
      btnClick();
    }
  });
}

// Zero-latency audio unlock on first user interaction
const UNLOCK_EVENTS = [
  'click', 'pointerdown', 'mousedown', 'mouseup',
  'touchstart', 'touchend', 'keydown'
];

function tryUnlockAudio() {
  userInteracted = true;
  ensureAudioCtx();
}

UNLOCK_EVENTS.forEach(ev => {
  window.addEventListener(ev, tryUnlockAudio, { passive: true, once: true });
});

// Crisp, audible UI hover tick (louder: 0.09 instead of 0.02)
function tick() {
  tryUnlockAudio();
  if (!soundOn) return;
  try {
    const ctx = ensureAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 850 + Math.random() * 450;
    g.gain.setValueAtTime(0.09, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.05);
  } catch (_) {}
}

// Snappy tactile UI click sound
function btnClick() {
  tryUnlockAudio();
  if (!soundOn) return;
  try {
    const ctx = ensureAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1100, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.06);
  } catch (_) {}
}

// Glitch scramble effect on button hover
function attachHoverScramble(el) {
  const target = el.querySelector('[data-scramble]') || (el.hasAttribute('data-scramble') ? el : null) || el;
  if (!target) return;
  const originalHTML = target.getAttribute('data-original-html') || target.innerHTML;
  target.setAttribute('data-original-html', originalHTML);
  const originalText = target.textContent.trim();
  if (!originalText || target.querySelector('input')) return;

  let timer = null;
  let isScrambling = false;

  el.addEventListener('mouseenter', () => {
    if (isScrambling) return;
    isScrambling = true;
    let frame = 0;
    const totalFrames = 8;
    clearInterval(timer);

    timer = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        clearInterval(timer);
        target.innerHTML = target.getAttribute('data-original-html') || originalHTML;
        isScrambling = false;
      } else {
        let str = '';
        for (let i = 0; i < originalText.length; i++) {
          const ch = originalText[i];
          if (ch === ' ' || ch === '\n') {
            str += ch;
          } else if (Math.random() < 0.35) {
            const rc = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            const safeRc = rc === '<' ? '&lt;' : (rc === '>' ? '&gt;' : rc);
            str += `<span class="scr">${safeRc}</span>`;
          } else {
            str += ch;
          }
        }
        target.innerHTML = str;
      }
    }, 24);
  });

  el.addEventListener('mouseleave', () => {
    clearInterval(timer);
    target.innerHTML = target.getAttribute('data-original-html') || originalHTML;
    isScrambling = false;
  });
}

// Attach hover, click feedback and scramble glitch to all interactive chips, links, email and windhawk
const interactiveButtons = document.querySelectorAll(
  '.chip-link, .sw, #btn-scroll, #btn-sound, .scroll-hint, .email-link, a[href*="windhawk"], [data-scramble]'
);
interactiveButtons.forEach(el => {
  el.addEventListener('mouseenter', tick);
  el.addEventListener('click', btnClick);
  attachHoverScramble(el);
});

/* ──────────────────────────────────────────
   4. SCROLL HINT (CLICK & 5S PERIODIC FLICKER)
   ────────────────────────────────────────── */
const btnScroll = document.getElementById('btn-scroll');
if (btnScroll) {
  btnScroll.addEventListener('click', () => {
    worksEl.scrollIntoView({ behavior: 'smooth' });
    setTimeout(runWorksEntranceAnimations, 250);
  });

  // Every 5 seconds, trigger a cyber glitch scramble on "SCROLL DOWN"
  setInterval(() => {
    if (window.scrollY < 120) {
      let frame = 0;
      const totalFrames = 8;
      const targetText = 'SCROLL DOWN';
      const timer = setInterval(() => {
        frame++;
        if (frame >= totalFrames) {
          clearInterval(timer);
          btnScroll.textContent = targetText;
        } else {
          let s = '';
          for (let i = 0; i < targetText.length; i++) {
            if (targetText[i] === ' ') s += ' ';
            else if (Math.random() < 0.45) {
              s += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            } else {
              s += targetText[i];
            }
          }
          btnScroll.textContent = s;
        }
      }, 28);
    }
  }, 5000);
}

/* ──────────────────────────────────────────
   5. THREE.JS — SKIPPER (GLB MODEL + FALLBACK)
      Polygon-by-polygon reveal + click rebuild
   ────────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('gl');
  if (!canvas) return;

  const cursorBadge = document.getElementById('cursor-badge');
  const petHandEl = document.getElementById('pet-hand');

  // State variables for petting, squish & magnetic interaction
  let patSquish = 0;
  let patVelocity = 0;
  let isPatHolding = false;
  let patInterval = null;
  let patHoldTimeout = null;
  let lastTouchEndTime = 0;
  let handHideTimeout = null;
  let lastPatTime = 0;
  let modelGroup = null;
  let mixer = null;
  let activeAction = null;
  let isHoveringCat = false;
  let isNearCat = false;
  let mouseClientX = -9999, mouseClientY = -9999;
  let catHeadPullX = 0, catHeadPullY = 0;
  let currentSpinSpeed = 0.11;
  let patSpinBoost = 0;
  const HEAD_MAGNETIC_RADIUS = 210;

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  // ── Scene & Camera ──
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 1.15, 5.2);
  camera.lookAt(0, 0.85, 0);

  function onResize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (camera.aspect < 1) {
      // Mobile / narrow: gently pull camera back so the model fits comfortably
      camera.position.z = 5.2 + (1 - camera.aspect) * 2.8;
    } else {
      camera.position.z = 5.2;
    }
    camera.updateProjectionMatrix();
    updatePetHandPosition();
  }
  onResize();
  window.addEventListener('resize', onResize);

  // ── Studio Lighting (Crisp & integrated for white hero) ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.88));

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(3, 6, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 15;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.radius = 3;
  scene.add(key);

  const rim = new THREE.PointLight(0x88b4ff, 0.5, 12);
  rim.position.set(-3, 2.5, -2);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffeedd, 0.35, 10);
  fill.position.set(2, 0.6, 3.5);
  scene.add(fill);

  // ── Soft Contact Shadow (Studio grounding) ──
  function createContactShadowTexture() {
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 512;
    sCanvas.height = 512;
    const ctx = sCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 230);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
    grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.18)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.06)');
    grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.015)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(sCanvas);
  }

  const contactMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), contactMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.visible = false;
  scene.add(contactShadow);

  // ── Dynamic Ground shadow receiver ──
  const gndMat = new THREE.ShadowMaterial({ opacity: 0 });
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), gndMat);
  gnd.rotation.x = -Math.PI / 2;
  gnd.receiveShadow = true;
  gnd.visible = false;
  scene.add(gnd);

  // ── Mouse tracking & Hover "CLICK ME" badge ──
  let mx = 0, my = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // ── "ПАТ-ПАТ" Petpet Meme System (Sound: MyInstants Pato Pato) ──
  const PAT_VOLUME = 0.14; // Soft & gentle volume
  let patBuffer = null;
  const patFallbackAudio = new Audio('pato.mp3');

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function loadPatBuffer() {
    try {
      const ctx = getAudioContext();
      if (!patBuffer && ctx) {
        fetch('pato.mp3')
          .then(res => res.arrayBuffer())
          .then(arr => ctx.decodeAudioData(arr))
          .then(buf => { patBuffer = buf; })
          .catch(() => {});
      }
    } catch (_) {}
  }

  // Pre-load audio buffer early
  window.addEventListener('pointerdown', loadPatBuffer, { once: true });
  window.addEventListener('touchstart', loadPatBuffer, { once: true });
  window.addEventListener('mouseenter', loadPatBuffer, { once: true });

  function playPatSound() {
    if (!soundOn) return;
    try {
      const ctx = getAudioContext();
      if (ctx && patBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = patBuffer;
        // Subtle micro-pitch variation for lively tactile feedback
        source.playbackRate.value = 0.97 + Math.random() * 0.06;
        const gain = ctx.createGain();
        gain.gain.value = PAT_VOLUME;
        source.connect(gain).connect(ctx.destination);
        source.start(0);
        return;
      }
    } catch (_) {}

    try {
      const a = patFallbackAudio.cloneNode();
      a.volume = PAT_VOLUME;
      a.play().catch(() => {});
    } catch (_) {}
  }

  function getCatHeadScreenPos() {
    if (typeof camera === 'undefined' || !camera) {
      return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.42 };
    }
    const squish = (typeof patSquish !== 'undefined') ? patSquish : 0;
    const headWorldY = 1.38 - squish * 0.32;
    const pullX = (typeof catHeadPullX !== 'undefined') ? catHeadPullX : 0;
    const pullY = (typeof catHeadPullY !== 'undefined') ? catHeadPullY : 0;
    const headVec = new THREE.Vector3(pullX, headWorldY + pullY, 0);
    headVec.project(camera);
    return {
      x: (headVec.x * 0.5 + 0.5) * window.innerWidth,
      y: (-(headVec.y * 0.5) + 0.5) * window.innerHeight
    };
  }

  function updatePetHandPosition() {
    if (typeof petHandEl === 'undefined' || !petHandEl || typeof camera === 'undefined' || !camera) return;
    const headPos = getCatHeadScreenPos();
    petHandEl.style.left = `${headPos.x}px`;
    petHandEl.style.top = `${headPos.y}px`;
  }

  function doPat() {
    lastPatTime = performance.now();

    // Add squish downward velocity impulse (clamped to prevent physics explosion on rapid tap spam)
    patVelocity = Math.min(4.0, patVelocity + 2.4);

    // Play signature pat-pat sound
    playPatSound();

    // Subtle tactile haptic click on mobile
    if (navigator.vibrate && userInteracted) {
      try { navigator.vibrate(15); } catch (_) {}
    }

    // Momentary playful spin boost on pat
    patSpinBoost = 0.22;

    // Ensure hand is positioned directly on the cat head before activating
    updatePetHandPosition();

    // Show and maintain meme petting hand smoothly (exact 1 GIF cycle = 200ms)
    if (petHandEl) {
      clearTimeout(handHideTimeout);
      if (!petHandEl.classList.contains('active')) {
        petHandEl.src = 'pet_hand.gif';
      }
      petHandEl.classList.add('active');

      handHideTimeout = setTimeout(() => {
        if (!isPatHolding && petHandEl) {
          petHandEl.classList.remove('active');
        }
      }, 220);
    }
  }

  function dismissMobileHint() {
    const hint = document.getElementById('mobile-tap-hint');
    if (hint && !hint.classList.contains('dismissed')) {
      hint.classList.add('dismissed');
    }
  }

  function startPatting(clientX, clientY) {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    dismissMobileHint();
    tryUnlockAudio();
    if (!modelGroup || !camera) return;

    const headPos = getCatHeadScreenPos();
    const distToHead = Math.hypot(clientX - headPos.x, clientY - headPos.y);

    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(modelGroup.children, true);

    const isMobile = window.innerWidth <= 768;
    const hitRadius = isMobile ? 120 : HEAD_MAGNETIC_RADIUS;

    if (hits.length > 0 || distToHead < hitRadius) {
      loadPatBuffer();
      isPatHolding = true;
      doPat(); // Single crisp pat for tap

      // Continuous rapid patting ONLY if user actually holds down (> 280ms)
      clearTimeout(patHoldTimeout);
      clearInterval(patInterval);
      patHoldTimeout = setTimeout(() => {
        if (isPatHolding) {
          patInterval = setInterval(() => {
            if (isPatHolding) {
              doPat();
            } else {
              clearInterval(patInterval);
              patInterval = null;
            }
          }, 200);
        }
      }, 280);
    }
  }

  function stopPatting() {
    isPatHolding = false;
    clearTimeout(patHoldTimeout);
    patHoldTimeout = null;
    if (patInterval) {
      clearInterval(patInterval);
      patInterval = null;
    }
    if (petHandEl) {
      clearTimeout(handHideTimeout);
      const elapsed = performance.now() - lastPatTime;
      const remainingStroke = Math.max(0, 200 - (elapsed % 200));
      handHideTimeout = setTimeout(() => {
        if (!isPatHolding && petHandEl) {
          petHandEl.classList.remove('active');
        }
      }, Math.min(remainingStroke, 200));
    }
  }

  // ── Mobile Swipe-to-Spin & Interaction State ──
  let catManualRotY = 0;
  let catSwipeSpinVelocity = 0;
  let touchStartX = 0;
  let touchLastX = 0;
  let touchStartY = 0;
  let isSwipingVertically = false;

  window.addEventListener('mousemove', e => {
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;

    if (modelGroup && camera) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(modelGroup.children, true);

      const headPos = getCatHeadScreenPos();
      const distToHead = Math.hypot(e.clientX - headPos.x, e.clientY - headPos.y);

      isHoveringCat = hits.length > 0;
      isNearCat = distToHead < HEAD_MAGNETIC_RADIUS;

      if (isHoveringCat || isNearCat) {
        document.body.style.cursor = 'pointer';

        if (cursorBadge) {
          cursorBadge.style.left = `${e.clientX}px`;
          cursorBadge.style.top = `${e.clientY}px`;
          cursorBadge.textContent = 'CLICK ME';
          if (!isPatHolding) {
            cursorBadge.classList.add('visible');
          } else {
            cursorBadge.classList.remove('visible');
          }
        }
      } else {
        if (!isPatHolding) {
          document.body.style.cursor = '';
          cursorBadge?.classList.remove('visible');
        }
      }
    }
  });

  window.addEventListener('mouseleave', () => {
    isHoveringCat = false;
    isNearCat = false;
    mx = 0;
    my = 0;
    mouseClientX = -9999;
    mouseClientY = -9999;
    document.body.style.cursor = '';
    cursorBadge?.classList.remove('visible');
    stopPatting();
  });

  // Hold-to-pat & click on desktop
  window.addEventListener('mousedown', e => {
    // Ignore synthetic mouse events fired right after touch
    if (performance.now() - lastTouchEndTime < 650) return;
    if (e.target && e.target.closest && e.target.closest('a, button, input, .scheme-bar')) return;
    startPatting(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => {
    if (performance.now() - lastTouchEndTime < 650) return;
    stopPatting();
  });

  // Hold-to-pat & swipe-to-spin / swipe-to-scroll on mobile
  window.addEventListener('touchstart', e => {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    dismissMobileHint();

    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchLastX = touch.clientX;
      touchStartY = touch.clientY;
      isSwipingVertically = false;

      if (e.target && e.target.closest && e.target.closest('a, button, input, .scheme-bar')) return;
      mx = (touch.clientX / window.innerWidth - 0.5) * 2;
      my = (touch.clientY / window.innerHeight - 0.5) * 2;

      // Only start patting if touch is on/near the cat
      const headPos = getCatHeadScreenPos();
      const distToHead = Math.hypot(touch.clientX - headPos.x, touch.clientY - headPos.y);
      const isMobile = window.innerWidth <= 768;
      const hitRadius = isMobile ? 120 : HEAD_MAGNETIC_RADIUS;

      if (distToHead < hitRadius) {
        startPatting(touch.clientX, touch.clientY);
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    lastTouchEndTime = performance.now();
    stopPatting();
  }, { passive: true });

  window.addEventListener('touchcancel', () => {
    lastTouchEndTime = performance.now();
    stopPatting();
  }, { passive: true });

  // Prevent mobile long-press context menu & selection bubble on 3D canvas / hero
  window.addEventListener('contextmenu', e => {
    if (e.target && (e.target.id === 'gl' || (e.target.closest && (e.target.closest('.hero-bg') || e.target.closest('.hero') || e.target.closest('.petpet-hand'))))) {
      e.preventDefault();
    }
  });

  window.addEventListener('touchmove', e => {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      mx = (touch.clientX / window.innerWidth - 0.5) * 2;
      my = (touch.clientY / window.innerHeight - 0.5) * 2;

      const totalDx = touch.clientX - touchStartX;
      const totalDy = touch.clientY - touchStartY;
      const stepDx = touch.clientX - touchLastX;
      touchLastX = touch.clientX;

      // 1. Swipe up on Hero to open Works section ("синяя шапка")
      if (!isSwipingVertically && window.scrollY < 80 && totalDy < -45 && Math.abs(totalDy) > Math.abs(totalDx) * 1.1) {
        isSwipingVertically = true;
        stopPatting();
        const works = document.getElementById('works');
        if (works) {
          works.scrollIntoView({ behavior: 'smooth' });
          setTimeout(runWorksEntranceAnimations, 250);
        }
      }

      // If finger moved significantly (> 16px), cancel patting so scrolling/swiping isn't interrupted
      if (Math.hypot(totalDx, totalDy) > 16 && isPatHolding) {
        stopPatting();
      }

      // 2. Swipe horizontally to spin cat with inertia
      if (!isSwipingVertically && Math.abs(totalDx) > 10 && Math.abs(stepDx) > Math.abs(totalDy) * 0.4) {
        catSwipeSpinVelocity += stepDx * 0.007;
        catSwipeSpinVelocity = Math.max(-0.24, Math.min(0.24, catSwipeSpinVelocity));
      }
    }
  }, { passive: true });

  // Gyroscope tilt
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
      if (e.gamma !== null && e.beta !== null) {
        mx = Math.min(Math.max(e.gamma / 25, -1), 1);
        my = Math.min(Math.max((e.beta - 45) / 25, -1), 1);
      }
    }, { passive: true });
  }

  // ── nic0martins.com 1:1 3D Entrance Reveal System ──
  const wireframeMeshes = [];
  const uProgress = { value: -0.2 };
  let loaderState = 'idle'; // 'wireframe' -> 'reveal' -> 'blinkOut' -> 'done'
  let stateStartTime = 0;
  let modelReadyForReveal = false;
  let modelRevealStarted = false;
  let entranceHeroReady = false;

  window.__revealDebug = {
    get state() { return loaderState; },
    get progress() { return uProgress.value; },
    get wireframeCount() { return wireframeMeshes.length; },
    get isStarted() { return modelRevealStarted; },
    get isModelReady() { return modelReadyForReveal; },
    get isHeroReady() { return entranceHeroReady; },
    get activeAction() { return activeAction; },
    get spinSpeed() { return currentSpinSpeed; },
    get isNearCat() { return isNearCat; },
    get isHoveringCat() { return isHoveringCat; },
    get headPull() { return { x: Number(catHeadPullX.toFixed(4)), y: Number(catHeadPullY.toFixed(4)) }; },
    get catRotation() {
      return modelGroup ? {
        x: Number(modelGroup.rotation.x.toFixed(4)),
        y: Number(modelGroup.rotation.y.toFixed(4)),
        z: Number(modelGroup.rotation.z.toFixed(4))
      } : null;
    }
  };

  window.triggerModelReveal = function() {
    entranceHeroReady = true;
    if (modelReadyForReveal && !modelRevealStarted) {
      modelRevealStarted = true;
      startNic0Reveal();
    }
  };

  function setupNic0Reveal(model) {
    wireframeMeshes.forEach(w => {
      if (w.parent) w.parent.remove(w);
      w.geometry?.dispose();
      w.material?.dispose();
    });
    wireframeMeshes.length = 0;

    model.traverse(child => {
      if (!child.isMesh) return;

      child.geometry = child.geometry.toNonIndexed();
      const pos = child.geometry.attributes.position;
      const count = pos.count;

      const bbox = new THREE.Box3().setFromBufferAttribute(pos);
      const size = bbox.getSize(new THREE.Vector3());
      const voxelSize = 0.045 * Math.max(size.x, size.y, size.z);
      const voxelMap = new Map();
      const faceRandom = new Float32Array(count);

      for (let f = 0; f < count / 3; f++) {
        const base = 3 * f;
        const cx = (pos.getX(base) + pos.getX(base + 1) + pos.getX(base + 2)) / 3;
        const cy = (pos.getY(base) + pos.getY(base + 1) + pos.getY(base + 2)) / 3;
        const cz = (pos.getZ(base) + pos.getZ(base + 1) + pos.getZ(base + 2)) / 3;
        const key = `${Math.round(cx / voxelSize)},${Math.round(cy / voxelSize)},${Math.round(cz / voxelSize)}`;
        if (!voxelMap.has(key)) voxelMap.set(key, Math.random());
        const r = voxelMap.get(key);
        faceRandom[base] = r;
        faceRandom[base + 1] = r;
        faceRandom[base + 2] = r;
      }
      child.geometry.setAttribute('faceRandom', new THREE.BufferAttribute(faceRandom, 1));

      const wireGeo = new THREE.WireframeGeometry(child.geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: 0x1337ff,
        transparent: true,
        opacity: 0,
        depthTest: false
      });
      const wireframe = new THREE.LineSegments(wireGeo, wireMat);
      wireframe.renderOrder = 2;
      child.add(wireframe);
      wireframeMeshes.push(wireframe);

      const mat = (Array.isArray(child.material) ? child.material[0] : child.material).clone();
      mat.side = THREE.DoubleSide;
      mat.onBeforeCompile = shader => {
        shader.uniforms.uProgress = uProgress;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           attribute float faceRandom;
           varying float vFaceRandom;`
        ).replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vFaceRandom = faceRandom;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           uniform float uProgress;
           varying float vFaceRandom;`
        ).replace(
          '#include <clipping_planes_fragment>',
          `if ( vFaceRandom > uProgress ) discard;
           #include <clipping_planes_fragment>`
        );
      };
      mat.needsUpdate = true;
      child.material = mat;
      child.frustumCulled = false;
    });
  }

  function startNic0Reveal() {
    loaderState = 'wireframe';
    stateStartTime = performance.now() / 1000;
    uProgress.value = -0.2;
    contactShadow.visible = false;
    gnd.visible = false;
    contactMat.opacity = 0;
    gndMat.opacity = 0;

    if (!document.hidden && window.titleTypewriter) {
      window.titleTypewriter.to('загрузка...', { typeSpeed: 32, eraseSpeed: 16, pause: 20 });
    }

    if (activeAction) {
      activeAction.time = 1.083;
      activeAction.paused = true;
    }

    const heroLayer = document.getElementById('hero-layer');
    if (heroLayer) {
      heroLayer.classList.remove('twist-flash');
      void heroLayer.offsetWidth;
      heroLayer.classList.add('twist-flash');
      setTimeout(() => heroLayer.classList.remove('twist-flash'), 500);
    }
  }

  function updateNic0Reveal() {
    if (loaderState === 'done' || loaderState === 'idle') return;

    const nowSec = performance.now() / 1000;
    const elapsed = nowSec - stateStartTime;

    // Stage 1: "wireframe" (fast strobe blinkIn 0.16s, hold until 0.22s)
    if (loaderState === 'wireframe') {
      const blinkIn = 0.16;
      const hold = 0.22;
      const isBlink = elapsed < blinkIn ? (elapsed % 0.10 < 0.05 ? 1 : 0) : 1;
      wireframeMeshes.forEach(w => {
        if (w.material) w.material.opacity = isBlink;
      });

      contactShadow.visible = false;
      gnd.visible = false;
      contactMat.opacity = 0;
      gndMat.opacity = 0;

      if (elapsed >= hold) {
        loaderState = 'reveal';
        stateStartTime = nowSec;
      }
      return;
    }

    // Stage 2: "reveal" (snappy voxelized polygon dissolve over 0.44s)
    if (loaderState === 'reveal') {
      const revealDuration = 0.44;
      const prog = Math.min(1.0, elapsed / revealDuration);
      uProgress.value = prog;

      wireframeMeshes.forEach(w => {
        if (w.material) w.material.opacity = 0.85;
      });

      // Shadow smoothly fades in under the cat as polygons solidify!
      contactShadow.visible = true;
      gnd.visible = true;
      contactMat.opacity = 0.85 * prog;
      gndMat.opacity = 0.12 * prog;

      if (prog >= 1.0) {
        loaderState = 'blinkOut';
        stateStartTime = nowSec;
      }
      return;
    }

    // Stage 3: "blinkOut" (rapid strobe flashes before popping off, 0.18s)
    if (loaderState === 'blinkOut') {
      contactShadow.visible = true;
      gnd.visible = true;
      contactMat.opacity = 0.85;
      gndMat.opacity = 0.12;

      const isFlash = (elapsed % 0.08 < 0.04) ? 1 : 0;
      wireframeMeshes.forEach(w => {
        if (w.material) w.material.opacity = isFlash;
      });

      if (elapsed >= 0.18) {
        wireframeMeshes.forEach(w => {
          if (w.parent) w.parent.remove(w);
          w.geometry?.dispose();
          w.material?.dispose();
        });
        wireframeMeshes.length = 0;

        uProgress.value = 2.0;

        if (activeAction) {
          activeAction.paused = false;
        }

        loaderState = 'done';
        window.__isSiteLoaded = true;
        if (!document.hidden && window.titleTypewriter) {
          window.titleTypewriter.to(window.MAIN_TITLE || 'малинка  —  сын шл...', { typeSpeed: 36, eraseSpeed: 18, pause: 30 });
        }
      }
      return;
    }
  }

  // ── Load GLB Model (check models/model.glb first!) ──
  const MODEL_PATHS = [
    'models/model.glb',
    'model.glb',
    'skipper.glb',
    'models/skipper.glb',
    'dance.glb',
    'models/dance.glb',
    'models/scene.gltf',
    'models/scene.glb',
  ];

  let loadAttempt = 0;
  const loader = new THREE.GLTFLoader();

  // Set up DRACO decoder
  try {
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/gltf/');
    loader.setDRACOLoader(dracoLoader);
  } catch (_) {}

  function tryLoadModel() {
    if (loadAttempt >= MODEL_PATHS.length) {
      console.log('GLB not found — building primitive Skipper');
      buildFallbackSkipper();
      return;
    }

    const path = MODEL_PATHS[loadAttempt];
    console.log(`Trying to load: ${path}`);

    loader.load(
      path,
      (gltf) => {
        console.log(`✓ Loaded model from: ${path}`);
        const model = gltf.scene;

        // Auto-scale & visual center calculation
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const targetHeight = 2.75;
        const targetWidth = 2.4;
        const scale = Math.min(targetHeight / (size.y || 1), targetWidth / (size.x || 1));
        model.scale.setScalar(scale);

        const visualCenterY = 0.85;
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale + visualCenterY;
        model.position.z = -center.z * scale;

        const floorY = visualCenterY - (size.y * scale) / 2;
        contactShadow.position.set(0, floorY + 0.005, 0);
        contactShadow.scale.set(size.x * scale * 1.6, size.z * scale * 0.9, 1);
        gnd.position.y = floorY;

        // Enable shadows & prepare nic0martins 1:1 reveal
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        setupNic0Reveal(model);

        modelGroup = new THREE.Group();
        modelGroup.add(model);
        modelGroup.userData.isGLB = true;

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);

          const clip = gltf.animations.find(c => c.name.toLowerCase().includes('take') || c.name.toLowerCase().includes('dance')) || gltf.animations[0];

          activeAction = mixer.clipAction(clip);
          activeAction.setEffectiveTimeScale(0.11);
          activeAction.play();
          activeAction.time = 1.083;
          activeAction.paused = true;

          modelGroup.userData.hasNativeAnimation = true;
          modelGroup.userData.isOiiaCat = clip.name.includes('Take 001');
          console.log(`🎉 Loaded animation clip "${clip.name}" with 1:1 nic0martins entrance reveal!`);
        }

        scene.add(modelGroup);
        updatePetHandPosition();

        modelReadyForReveal = true;
        if (entranceHeroReady && !modelRevealStarted) {
          modelRevealStarted = true;
          startNic0Reveal();
        }
      },
      undefined,
      () => {
        loadAttempt++;
        tryLoadModel();
      }
    );
  }

  tryLoadModel();

  // ── Fallback: Primitive Skipper ──
  function buildFallbackSkipper() {
    const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.55 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.5 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.45 });
    const eyeW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const eyeB = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.2 });

    const g = new THREE.Group();

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.48, 24, 20);
    bodyGeo.scale(1, 1.25, 0.85);
    const body = new THREE.Mesh(bodyGeo, black);
    body.position.y = 0.75;
    body.castShadow = true;
    g.add(body);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(0.39, 20, 18);
    bellyGeo.scale(0.8, 1.2, 0.7);
    const belly = new THREE.Mesh(bellyGeo, white);
    belly.position.set(0, 0.73, 0.12);
    g.add(belly);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 20, 18);
    headGeo.scale(1, 0.92, 0.9);
    const head = new THREE.Mesh(headGeo, black);
    head.position.y = 1.45;
    head.castShadow = true;
    g.add(head);

    // Face
    const faceGeo = new THREE.SphereGeometry(0.24, 16, 14);
    faceGeo.scale(0.85, 0.75, 0.6);
    const face = new THREE.Mesh(faceGeo, white);
    face.position.set(0, 1.42, 0.12);
    g.add(face);

    // Flat top
    g.add(Object.assign(
      new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.34), black),
      { position: new THREE.Vector3(0, 1.72, -0.02) }
    ));

    // Eyes
    function eye(x) {
      const eg = new THREE.Group();
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), eyeW);
      s.position.z = 0.18;
      eg.add(s);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeB);
      p.position.z = 0.25;
      eg.add(p);
      eg.position.set(x, 1.48, 0);
      return eg;
    }
    g.add(eye(-0.1), eye(0.1));

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.07, 0.18, 8);
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, orange);
    beak.position.set(0, 1.38, 0.3);
    g.add(beak);

    // Flippers
    function flipper(side) {
      const fg = new THREE.Group();
      const fGeo = new THREE.BoxGeometry(0.12, 0.52, 0.08);
      fGeo.translate(0, -0.26, 0);
      fg.add(new THREE.Mesh(fGeo, black));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), black);
      tip.position.y = -0.52;
      fg.add(tip);
      fg.position.set(side * 0.48, 1.05, 0);
      fg.rotation.z = side * 0.15;
      return fg;
    }
    const flipL = flipper(-1), flipR = flipper(1);
    g.add(flipL, flipR);

    // Feet
    function foot(x) {
      const fGeo = new THREE.BoxGeometry(0.16, 0.06, 0.22);
      fGeo.translate(0, 0, 0.04);
      const f = new THREE.Mesh(fGeo, orange);
      f.position.set(x, 0.03, 0.05);
      f.castShadow = true;
      return f;
    }
    const footL = foot(-0.14), footR = foot(0.14);
    g.add(footL, footR);

    // Legs
    function leg(x) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), black);
      l.position.set(x, 0.15, 0);
      return l;
    }
    const legL = leg(-0.14), legR = leg(0.14);
    g.add(legL, legR);

    // Tail
    const tailGeo = new THREE.ConeGeometry(0.06, 0.12, 6);
    tailGeo.rotateX(-0.3);
    const tail = new THREE.Mesh(tailGeo, black);
    tail.position.set(0, 0.42, -0.38);
    g.add(tail);

    setupNic0Reveal(g);
    modelGroup = g;
    scene.add(g);
    g.userData = { body, head, beak, flipL, flipR, footL, footR, legL, legR, tail };
    modelReadyForReveal = true;
    if (entranceHeroReady && !modelRevealStarted) {
      modelRevealStarted = true;
      startNic0Reveal();
    }
  }

  // ── Animation loop ──
  const clock = new THREE.Clock();
  let dancePhase = 0, phaseTimer = 0;
  const PHASE_DUR = 3.5;

  // Battery saver observer: pause Three.js rendering when hero is scrolled out of view
  let isHeroVisible = true;
  if (typeof IntersectionObserver !== 'undefined') {
    const heroEl = document.getElementById('hero');
    if (heroEl) {
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isHeroVisible = entry.isIntersecting;
        });
      }, { threshold: [0, 0.02] });
      heroObserver.observe(heroEl);
    }
  }

  function animate() {
    requestAnimationFrame(animate);

    // Battery saver: skip rendering when user has scrolled down into works
    if (!isHeroVisible) return;

    const dt = Math.min(clock.getDelta(), 0.1); // Must be called BEFORE getElapsedTime
    const t = clock.getElapsedTime();

    // 1:1 nic0martins appearance reveal
    updateNic0Reveal();

    if (!modelGroup) {
      renderer.render(scene, camera);
      return;
    }

    // ── Spin Speed: smooth slowdown when hovering cat / near head ──
    patSpinBoost *= 0.93; // smooth decay for pat-pat burst

    let targetSpinSpeed = 0.11; // normal ambient spin
    if (isHoveringCat) {
      targetSpinSpeed = 0.024; // extra slow rotation when cursor is on the cat
    } else if (isNearCat && mouseClientX > -1000) {
      const headPos = getCatHeadScreenPos();
      const distToHead = Math.hypot(mouseClientX - headPos.x, mouseClientY - headPos.y);
      const factor = Math.max(0, Math.min(1, distToHead / HEAD_MAGNETIC_RADIUS));
      // Smoothly blends from 0.11 down to 0.024 as cursor approaches
      targetSpinSpeed = 0.024 + factor * (0.11 - 0.024);
    }

    currentSpinSpeed += (targetSpinSpeed + patSpinBoost - currentSpinSpeed) * 0.07;

    // Update skeletal/GLTF animations if present
    if (mixer && loaderState === 'done') {
      if (activeAction) {
        activeAction.setEffectiveTimeScale(currentSpinSpeed);
      }
      mixer.update(dt);

      // Seamless Oiiaioooooiai spin loop (1.083s -> 5.916s)
      if (activeAction && modelGroup.userData.isOiiaCat) {
        if (activeAction.time < 1.083) {
          activeAction.time = 1.083;
        } else if (activeAction.time >= 5.916) {
          activeAction.time = 1.083 + (activeAction.time - 5.916);
        }
      }
    }

    // ── 3D Magnetic Cat Head Pull towards Cursor when nearby ──
    let targetPullX = 0;
    let targetPullY = 0;
    if ((isNearCat || isHoveringCat) && mouseClientX > -1000) {
      const headPos = getCatHeadScreenPos();
      const dx = mouseClientX - headPos.x;
      const dy = mouseClientY - headPos.y;
      const distToHead = Math.hypot(dx, dy);
      const leanFactor = Math.pow(Math.max(0, 1 - distToHead / (HEAD_MAGNETIC_RADIUS * 1.35)), 1.2);
      targetPullX = (dx / window.innerWidth) * 0.28 * leanFactor;
      targetPullY = (-dy / window.innerHeight) * 0.18 * leanFactor;
    }
    catHeadPullX += (targetPullX - catHeadPullX) * 0.08;
    catHeadPullY += (targetPullY - catHeadPullY) * 0.08;

    // ── Spring Physics for "пат-пат" squish ──
    if (modelGroup) {
      const dtClamped = Math.min(dt, 0.05);
      const springK = 280; // snappy, elastic bounce
      const damping = 16;  // smooth decay
      const force = -springK * patSquish - damping * patVelocity;
      patVelocity += force * dtClamped;
      patSquish += patVelocity * dtClamped;

      // Squish deformation: compresses Y, bulges X and Z (volume conservation)
      const sy = Math.max(0.35, 1 - patSquish * 0.42);
      const sxz = Math.max(0.6, 1 + patSquish * 0.30);
      modelGroup.scale.set(sxz, sy, sxz);
      modelGroup.position.x = catHeadPullX;
      modelGroup.position.y = -patSquish * 0.22 + catHeadPullY;

      // Position petpet meme hand right on the cat head in screen space
      updatePetHandPosition();
    }

    // Upright rotation with swipe-to-spin angular momentum
    catManualRotY += catSwipeSpinVelocity;
    catSwipeSpinVelocity *= 0.93;
    if (Math.abs(catSwipeSpinVelocity) < 0.0001) catSwipeSpinVelocity = 0;

    modelGroup.rotation.set(0, catManualRotY, 0);

    // ── GLB MODEL DANCE ──
    if (modelGroup.userData.isGLB) {
      // If the model already came with its own animation (dance/mocap), let it play smoothly!
      if (modelGroup.userData.hasNativeAnimation) {
        renderer.render(scene, camera);
        return;
      }

      // Try to find separate parts on first frame
      if (!modelGroup.userData._partsScanned) {
        modelGroup.userData._partsScanned = true;
        modelGroup.userData.parts = [];
        const allMeshes = [];
        modelGroup.traverse(c => { if (c.isMesh) allMeshes.push(c); });

        // If model has multiple meshes, try to identify upper/lower by Y position
        if (allMeshes.length > 1) {
          const box = new THREE.Box3().setFromObject(modelGroup);
          const midY = (box.min.y + box.max.y) / 2;

          allMeshes.forEach(m => {
            const mBox = new THREE.Box3().setFromObject(m);
            const mCenterY = (mBox.min.y + mBox.max.y) / 2;
            const mCenterX = (mBox.min.x + mBox.max.x) / 2;
            modelGroup.userData.parts.push({
              mesh: m,
              isUpper: mCenterY > midY,
              isLeft: mCenterX < 0,
              isRight: mCenterX > 0,
              origPos: m.position.clone(),
              origRot: m.rotation.clone(),
            });
          });
          console.log(`Found ${allMeshes.length} separate meshes — animating parts independently`);
        }
      }

      const parts = modelGroup.userData.parts || [];
      const hasParts = parts.length > 1;

      // ── Beat math ──
      const bpm = 3.6;
      const b = t * bpm;
      // Sharp kick (pow for snappier hits)
      const kick = Math.pow(Math.abs(Math.sin(b * Math.PI)), 4);
      // Smooth swing
      const swing = Math.sin(b * Math.PI);
      const dblSwing = Math.sin(b * Math.PI * 2);
      // Quick accent (triangle wave for sharp direction changes)
      const tri = Math.abs(((b % 1) - 0.5) * 2);

      // ── Squash & stretch (always active) ──
      const squashAmt = kick * 0.12;
      modelGroup.scale.set(
        1 + squashAmt * 0.5,   // widen on impact
        1 - squashAmt,          // squash on impact
        1 + squashAmt * 0.5
      );

      // ── Bounce (jump with hang time) ──
      const jumpHeight = 0.18;
      const jumpCurve = Math.pow(Math.max(0, Math.sin(b * Math.PI)), 0.6);
      modelGroup.position.y = jumpCurve * jumpHeight;

      // ── Per-phase moves ──
      switch (dancePhase) {
        case 0: // Funky side-to-side with sharp snaps
          modelGroup.rotation.z = swing * 0.2;
          modelGroup.rotation.x = dblSwing * 0.08;
          modelGroup.position.x = swing * 0.12;
          // Parts: upper body counter-rotates
          if (hasParts) parts.forEach(p => {
            if (p.isUpper) p.mesh.rotation.z = p.origRot.z - swing * 0.1;
          });
          break;

        case 1: // Head-bang pump
          modelGroup.rotation.x = -0.1 + kick * 0.3;
          modelGroup.rotation.z = dblSwing * 0.08;
          modelGroup.position.x = 0;
          if (hasParts) parts.forEach(p => {
            if (p.isUpper) p.mesh.rotation.x = p.origRot.x + kick * 0.15;
          });
          break;

        case 2: // Spin twist (fast Y rotation)
          modelGroup.rotation.y = b * 2.0; // continuous spin
          modelGroup.rotation.z = dblSwing * 0.06;
          modelGroup.position.x = 0;
          break;

        case 3: // Lateral slide + lean
          modelGroup.position.x = swing * 0.25;
          modelGroup.rotation.z = -swing * 0.18; // lean opposite to movement
          modelGroup.rotation.x = kick * 0.06;
          if (hasParts) parts.forEach(p => {
            if (p.isUpper) {
              p.mesh.rotation.z = p.origRot.z + swing * 0.08;
            }
          });
          break;

        case 4: // Robot / isolations
          const isoX = Math.round(swing * 3) / 3 * 0.1; // quantized steps
          const isoZ = Math.round(dblSwing * 3) / 3 * 0.15;
          modelGroup.position.x = isoX;
          modelGroup.rotation.z = isoZ;
          modelGroup.rotation.x = kick * 0.12;
          if (hasParts) parts.forEach(p => {
            if (p.isUpper) {
              p.mesh.rotation.y = p.origRot.y + Math.round(dblSwing * 2) / 2 * 0.3;
            }
          });
          break;
      }

      // ── Reset scale on non-kick frames ──
      if (kick < 0.01) {
        modelGroup.scale.set(1, 1, 1);
      }

      // ── Smooth position.x decay on phase switch ──
      if (dancePhase === 2) {
        modelGroup.position.x *= 0.85;
      }
    }

    // ── FALLBACK PRIMITIVE DANCE ──
    if (modelGroup.userData && modelGroup.userData.body) {
      const u = modelGroup.userData;

      modelGroup.position.y = bounce * 0.08;
      u.head.position.y = 1.45 + bounce * 0.03;
      u.beak.scale.y = 1 + bounce * 0.15;
      u.tail.rotation.y = Math.sin(beat * Math.PI * 2) * 0.2;

      switch (dancePhase % 4) {
        case 0:
          modelGroup.rotation.z = Math.sin(beat * Math.PI) * 0.1;
          u.flipL.rotation.z = -0.15 + Math.sin(beat * Math.PI) * 0.5;
          u.flipR.rotation.z = 0.15 - Math.sin(beat * Math.PI) * 0.5;
          u.head.rotation.z = Math.sin(beat * Math.PI * 2) * 0.08;
          u.head.rotation.y = Math.sin(beat * Math.PI) * 0.12;
          break;
        case 1:
          u.flipL.rotation.z = -0.15 + Math.sin(beat * Math.PI + 0.5) * 0.7;
          u.flipL.rotation.x = Math.sin(beat * Math.PI * 2) * 0.3;
          u.flipR.rotation.z = 0.15 - Math.sin(beat * Math.PI + 1.0) * 0.7;
          u.flipR.rotation.x = Math.sin(beat * Math.PI * 2 + 1) * 0.3;
          u.head.rotation.y = Math.sin(beat * Math.PI * 2) * 0.1;
          break;
        case 2:
          modelGroup.rotation.z = 0;
          u.flipL.rotation.z = -0.3;
          u.flipR.rotation.z = 0.3;
          u.flipL.rotation.x = Math.sin(beat * Math.PI) * 0.2;
          u.flipR.rotation.x = -Math.sin(beat * Math.PI) * 0.2;
          u.head.rotation.y = -Math.sin(beat * Math.PI) * 0.2;
          break;
        case 3:
          modelGroup.rotation.z = Math.sin(beat * Math.PI * 2) * 0.12;
          u.flipL.rotation.z = -0.15 + Math.sin(beat * Math.PI * 2) * 0.35;
          u.flipR.rotation.z = 0.15 - Math.sin(beat * Math.PI * 2 + Math.PI) * 0.35;
          u.footL.position.y = 0.03 + Math.max(0, Math.sin(beat * Math.PI * 2)) * 0.06;
          u.footR.position.y = 0.03 + Math.max(0, Math.sin(beat * Math.PI * 2 + Math.PI)) * 0.06;
          u.legL.position.y = 0.15 + Math.max(0, Math.sin(beat * Math.PI * 2)) * 0.06;
          u.legR.position.y = 0.15 + Math.max(0, Math.sin(beat * Math.PI * 2 + Math.PI)) * 0.06;
          break;
      }

      if (dancePhase % 4 !== 3) {
        u.footL.position.y = 0.03;
        u.footR.position.y = 0.03;
        u.legL.position.y = 0.15;
        u.legR.position.y = 0.15;
      }
    }

    // Light orbit
    rim.position.x = Math.sin(t * 0.4) * 4;
    rim.position.z = Math.cos(t * 0.4) * 3;

    renderer.render(scene, camera);
  }

  animate();
})();

/* ──────────────────────────────────────────
   DYNAMIC PAGE TITLE & CONSOLE EASTER EGG
   ────────────────────────────────────────── */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.titleTypewriter?.to(window.AWAY_TITLE || 'куда ушел, вернись...', { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
  } else {
    const returnTarget = window.__isSiteLoaded
      ? (window.MAIN_TITLE || 'малинка  —  сын шл...')
      : (helloIntroFinished ? 'загрузка...' : currentHelloWord);
    window.titleTypewriter?.to(returnTarget, { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
  }
});

window.addEventListener('blur', () => {
  window.titleTypewriter?.to(window.AWAY_TITLE || 'куда ушел, вернись...', { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
});

window.addEventListener('focus', () => {
  const returnTarget = window.__isSiteLoaded
    ? (window.MAIN_TITLE || 'малинка  —  сын шл...')
    : (helloIntroFinished ? 'загрузка...' : currentHelloWord);
    window.titleTypewriter?.to(returnTarget, { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
});

console.log("че ты пялишь? код на гитхабе)");

