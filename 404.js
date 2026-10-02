/* ═══════════════════════════════════════════════════════════════
   404.js — Caveman Cable 404 (Animation by Markus Magnusson)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────
     1. EXTRACT PROJECT PARAM (SEARCH / HASH / STORAGE)
     ────────────────────────────────────────── */
  let projectName = '';

  // 1. Search parameters
  const searchParams = new URLSearchParams(window.location.search);
  projectName = searchParams.get('p') || searchParams.get('project') || '';

  // 2. Hash fallback (preserved during clean URL server redirects)
  if (!projectName && window.location.hash) {
    const hashClean = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hashClean);
    projectName = hashParams.get('p') || hashParams.get('project') || hashClean;
  }

  // 3. SessionStorage fallback
  if (!projectName) {
    projectName = sessionStorage.getItem('current_project') || '';
  }

  if (projectName) {
    projectName = decodeURIComponent(projectName.replace(/\+/g, ' ')).trim();
  }

  const projectChipEl = document.getElementById('project-chip');
  const projectMentionEl = document.getElementById('project-mention');

  if (projectName) {
    if (projectChipEl) projectChipEl.textContent = projectName;
    if (projectMentionEl) projectMentionEl.textContent = `«${projectName}»`;
  } else {
    if (projectChipEl) projectChipEl.textContent = 'Секретный проект';
    if (projectMentionEl) projectMentionEl.textContent = 'этот проект';
  }

  /* ──────────────────────────────────────────
     2. REAL-TIME TAB TITLE TYPEWRITER (ROCK-SOLID WEB WORKER)
     ────────────────────────────────────────── */
  const MAIN_404_TITLE = '404: обрыв кабеля...';
  const AWAY_404_TITLE = 'куда ушел, кабель искрит...';
  const INVISIBLE_TITLE_CHAR = '\u200E'; // Left-to-Right Mark: 0-width invisible character preventing Chromium URL collapse

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

      // Time-based phase scheduling: completely immune to browser tab throttling!
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
          // Erasing phase (time-based interpolation)
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

  setTimeout(() => {
    titleTypewriter.to(MAIN_404_TITLE, { typeSpeed: 36, eraseSpeed: 18, pause: 20 });
  }, 100);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      titleTypewriter.to(AWAY_404_TITLE, { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
    } else {
      titleTypewriter.to(MAIN_404_TITLE, { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
    }
  });

  window.addEventListener('blur', () => {
    titleTypewriter.to(AWAY_404_TITLE, { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
  });

  window.addEventListener('focus', () => {
    titleTypewriter.to(MAIN_404_TITLE, { typeSpeed: 30, eraseSpeed: 16, pause: 20 });
  });

  /* ──────────────────────────────────────────
     3. WEB AUDIO SFX & TACTILE CLICKS
     ────────────────────────────────────────── */
  let audioCtx = null;
  function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function tick() {
    try {
      const ctx = ensureAudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 850 + Math.random() * 400;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  function btnClick() {
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

  const UNLOCK_EVENTS = ['click', 'pointerdown', 'mousedown', 'touchstart', 'keydown'];
  UNLOCK_EVENTS.forEach(ev => {
    window.addEventListener(ev, () => ensureAudioCtx(), { passive: true, once: true });
  });

  /* ──────────────────────────────────────────
     4. ROCK-SOLID TEXT SCRAMBLE (BUG-FREE)
     ────────────────────────────────────────── */
  const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#01';

  function attachHoverScramble(el) {
    const target = el.querySelector('[data-scramble]') || (el.hasAttribute('data-scramble') ? el : null) || el;
    if (!target) return;
    const originalHTML = target.getAttribute('data-original-html') || target.innerHTML;
    target.setAttribute('data-original-html', originalHTML);
    const originalText = target.textContent.trim();
    if (!originalText || target.querySelector('input')) return;

    let timer = null;
    let isScrambling = false;
    let lastScrambleEndTime = 0;

    function endScramble() {
      clearInterval(timer);
      target.innerHTML = target.getAttribute('data-original-html') || originalHTML;
      el.style.minWidth = '';
      isScrambling = false;
      lastScrambleEndTime = performance.now();
    }

    el.addEventListener('mouseenter', () => {
      // Cooldown & in-progress check prevents endless edge jitter loop
      if (isScrambling || (performance.now() - lastScrambleEndTime < 220)) return;
      isScrambling = true;

      // Lock width so proportional font character swaps don't shift button boundaries under the cursor
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        el.style.minWidth = `${Math.ceil(rect.width)}px`;
      }

      let frame = 0;
      const totalFrames = 8;
      clearInterval(timer);

      timer = setInterval(() => {
        frame++;
        if (frame >= totalFrames) {
          endScramble();
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
      if (!isScrambling) {
        target.innerHTML = target.getAttribute('data-original-html') || originalHTML;
        el.style.minWidth = '';
      }
    });
  }

  document.querySelectorAll('.chip-link, [data-scramble]').forEach(el => {
    el.addEventListener('mouseenter', tick);
    el.addEventListener('click', btnClick);
    attachHoverScramble(el);
  });

  /* ──────────────────────────────────────────
     5. GIF-SYNCHRONIZED SITUATIONAL SPEECH ENGINE
     Animation duration: 336 frames * 40ms = 13440ms
     ────────────────────────────────────────── */
  const LOOP_DURATION = 13440;
  const speechEl = document.getElementById('caveman-speech');
  const gifEl = document.getElementById('caveman-gif');
  const cavemanCardEl = document.getElementById('caveman-card');

  // Situational quote pools matching Markus Magnusson's animation phases:
  const QUOTES_CHEWING = [
    '*Хрум-хрум... причмокивает* 🦷',
    '*Чавкает*... на вкус как 100 Мбит/с',
    '*Ням-ням*... медная жила без соли 🍝',
    '*Хрустит зубами*... зачищаю оптоволокно!',
    '*Причмокивает*... тьфу, статический заряд! ⚡',
    '*Чавк-чавк*... кошачий зуб в кабеле?! 🐾',
    '*Хрум-хрум*... оптика хрустит на зубах!',
    '*Жуёт провод*... вкус цифровой эпохи!',
    '*Причмокивает*... не, это точно не сосиска 🍖',
    '*Хрустит изоляцией*... витая пара со вкусом мамонта 🦣',
    '*Чавк*... пятая категория, ням-ням!',
    '*Причмокивает*... оптоволокно колется, зараза!',
    '*Грызёт*... так вот ты какой, Bitrate!',
    '*Хрум-хрум*... пинг стал чуть сочнее 🪨',
    '*Чавкает*... кот перегрыз, а мне доедать?! 🐱',
    '*Жуёт*... на зубах скрипит кремний!',
    '*Причмокивает*... ммм, привкус потерянных пакетов 📦',
    '*Хрусть*... о, медная жилка пошла!',
    '*Чавк-чавк*... экранированный! Тяжело идёт!',
    '*Причмокивает*... зубы вместо стриппера — классика 🦷',
    '*Жуёт кабель*... багов нет, но провод солёный!',
    '*Хрум*... скорость передачи данных: 2 байта за укус',
    '*Причмокивает*... тьфу, кошачья шерсть на разъёме! 🐾',
    '*Чавк*... перекусил кабель — перекусил и сам 🥪'
  ];

  const QUOTES_PULLING = [
    'Тяяяянем... провод короткий! 🧗',
    'Где Wi-Fi в этой пещере?! 🦣',
    'Кот, отдай второй конец провода! 🐾',
    'Ping: 45 000 лет до н.э. ⌛',
    'Ловлю 5G над пещерой... ноль палочек!',
    'Кто так натянул патч-корд?!',
    'Куда уходит этот кабель?!',
    'Тяну трафик из будущего... не тянется! 🚀',
    'Патч-корд внатяг! Сейчас лопнет!',
    'Связь с сервером потеряна в плейстоцене 🦣',
    'Кто наступил на магистральный кабель?!',
    'Провайдер «Неандерталь Телеком», ответьте! 📞',
    'Тяну репозиторий прямо из неолита... 🪨',
    'Разрабы, удлините провод до прода! 🔌',
    'DNS не резолвится через костёр! 🔥',
    'Дотянуться бы до 2026 года...',
    'Шевелитесь, пакеты, солнце садится! ☀️',
    'Где роутер?! В соседнем племени?! 🗿',
    'Тяну кабель... кажется, на том конце мамонт! 🦣',
    'Высоко тяну, пинг не гляжу!',
    'Широкополосный доступ в каменном веке... ⏳',
    'Сигнал уходит в облака, верните обратно! ☁️',
    'Дотягиваю трафик до вашего экрана...',
    'Кто свернул бухту кабеля узлом?! 🪢'
  ];

  const QUOTES_PLUGGING = [
    'Да втыкайся ты уже! 🔌',
    'Где искра?! Где контакт?! ⚡',
    'Пытаюсь запустить сервачок 🪨',
    'Почему не стыкуется?! 🦣',
    'Электричество ещё не открыли... 🕯️',
    'Пока проекта нету... искрит!',
    'Семь раз отмерь, один раз воткни!',
    'Опять распиновку перепутал?! ⚡',
    'Искру высек — интернет не завёлся! 🔥',
    'Контакт есть! А сайта пока нет! 🔌',
    'Давай, родимый, ещё один вольт! ⚡',
    'Разъём не той эпохи! Не лезет!',
    'Ща как закоротит на всю пещеру! 💥',
    'Горит! Работает! А, нет, показалось...',
    'Инициализирую протокол передачи огня 🔥',
    'Пробивает на массу! Руки трясутся! ⚡',
    'Сисадмин каменного века за работой 🪨',
    'Коротит, но красиво! 🎆',
    'Вставил! Теперь ждём деплой! 🚀',
    'Штекер в гнездо... или гнездо в штекер?!',
    'Почти законнектился... держите мамонта! 🦣',
    'Искра пошла — проект загружается... почти!',
    'Контакты окислились за 40 000 лет! ⌛',
    'Замыкаю цепь надежды на релиз! ⚡'
  ];

  const QUOTES_CLICKED = [
    'Не отвлекай, я кабель чиню! 🔌',
    'Кот, это ты кликаешь?! 🐾',
    'Осторожно, 220 вольт палеолита! ⚡',
    'Ты кликаешь, а интернет не появляется!',
    'Ой! Чуть провод не уронил! 🪨',
    'Клик-клик... а провод кто держать будет?!',
    'Ай! Током ударит, отойди от экрана! ⚡',
    'Ты лучше в Telegram админу кликни! 💬',
    'Я тебе не тачскрин, я первобытный! 🦣',
    'Кликаешь? А проект от этого быстрее не появится! 😉',
    'Щекотно вообще-то! Дай кабель дожевать! 🦷',
    'Тыкай в кнопку «На главную», а не в меня! 👈',
    'Руки прочь от сетевого оборудования! ⚠️',
    'Если ещё раз кликнешь — отключу Wi-Fi в пещере! 📴',
    'Эй! Я тут тонкую калибровку оптики провожу!',
    'Клик зафиксирован, пинг вырос на 500ms 📈',
    'Я дикий сисадмин, я могу и укусить! 🦴',
    'Кликай не кликай, а сервер на дровах! 🪵'
  ];

  function getPool(basePool, dynamicFn) {
    if (!dynamicFn) return basePool;
    const extra = dynamicFn();
    return extra && extra.length ? [...basePool, ...extra] : basePool;
  }

  function getExtraPulling() {
    if (!projectName) return [];
    return [
      `Дотягиваю кабель до «${projectName}»... 🧗`,
      `Ищу сервер «${projectName}»... пока глухо! 🔍`,
      `Кто спрятал «${projectName}» в кустах?! 🦣`
    ];
  }

  function getExtraPlugging() {
    if (!projectName) return [];
    return [
      `Воткну кабель — и «${projectName}» взлетит! 🚀`,
      `«${projectName}» скоро будет! Искры уже летят! ⚡`
    ];
  }

  function pickRandom(arr, exclude) {
    const pool = arr.filter(item => item !== exclude);
    return pool[Math.floor(Math.random() * pool.length)] || arr[0];
  }

  function chewSound() {
    try {
      const ctx = ensureAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (_) {}
  }

  function sparkSound() {
    try {
      const ctx = ensureAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (_) {}
  }

  let loopStartTime = performance.now();
  let cachedBlobUrl = null;
  let lastLoopCycle = -1;
  let activeCyclePhase = null;
  let currentQuotePhaseTriggered = false;
  let nextQuoteAllowedTime = performance.now() + 2000; // Small delay before first quote on initial load
  let currentQuoteText = '';
  let userOverrideUntil = 0;
  let clickBubbleTimeout = null;

  function showBubble(text) {
    if (!speechEl) return;
    currentQuoteText = text;
    speechEl.textContent = text;
    speechEl.classList.add('show');
  }

  function hideBubble() {
    if (!speechEl) return;
    speechEl.classList.remove('show');
  }

  function timelineTick() {
    requestAnimationFrame(timelineTick);

    if (document.hidden) return;
    const now = performance.now();
    if (now < userOverrideUntil) return;

    const totalElapsed = now - loopStartTime;
    const cycle = Math.floor(totalElapsed / LOOP_DURATION);
    const elapsed = totalElapsed % LOOP_DURATION;

    // New loop iteration starts (each loop is 13.44 seconds)
    if (cycle !== lastLoopCycle) {
      lastLoopCycle = cycle;
      currentQuotePhaseTriggered = false;

      // If we are currently under cooldown, this entire cycle stays completely silent!
      if (now < nextQuoteAllowedTime) {
        activeCyclePhase = null;
      } else {
        // Cooldown passed: pick AT MOST ONE phase to comment on during this entire cycle
        const phases = ['chewing', 'pulling', 'plugging'];
        activeCyclePhase = phases[Math.floor(Math.random() * phases.length)];
      }
    }

    // PHASE 1: CHEWING (2100ms - 5800ms)
    // Caveman actively bites, chews, and smacks his lips on the cable!
    if (elapsed >= 2100 && elapsed < 5800) {
      if (activeCyclePhase === 'chewing' && !currentQuotePhaseTriggered) {
        currentQuotePhaseTriggered = true;
        showBubble(pickRandom(QUOTES_CHEWING, currentQuoteText));
        chewSound();
        // Generous calm cooldown: next speech only after 22 to 38 seconds (~2-3 loops of silence)
        nextQuoteAllowedTime = now + 22000 + Math.random() * 16000;
      }
    }
    // INTER-PHASE 1 -> 2 (5800ms - 6900ms): Calm pause
    else if (elapsed >= 5800 && elapsed < 6900) {
      if (now >= userOverrideUntil) hideBubble();
    }
    // PHASE 2: PULLING / STRETCHING (6900ms - 9500ms)
    // Caveman raises both arms high to the sky, pulling hard!
    else if (elapsed >= 6900 && elapsed < 9500) {
      if (activeCyclePhase === 'pulling' && !currentQuotePhaseTriggered) {
        currentQuotePhaseTriggered = true;
        showBubble(pickRandom(getPool(QUOTES_PULLING, getExtraPulling), currentQuoteText));
        tick();
        // Generous calm cooldown: next speech only after 22 to 38 seconds
        nextQuoteAllowedTime = now + 22000 + Math.random() * 16000;
      }
    }
    // INTER-PHASE 2 -> 3 (9500ms - 10300ms): Calm pause
    else if (elapsed >= 9500 && elapsed < 10300) {
      if (now >= userOverrideUntil) hideBubble();
    }
    // PHASE 3: SQUATTING & PLUGGING (10300ms - 12600ms)
    // Caveman squats down low to ground, slamming plugs together like flint!
    else if (elapsed >= 10300 && elapsed < 12600) {
      if (activeCyclePhase === 'plugging' && !currentQuotePhaseTriggered) {
        currentQuotePhaseTriggered = true;
        showBubble(pickRandom(getPool(QUOTES_PLUGGING, getExtraPlugging), currentQuoteText));
        sparkSound();
        // Generous calm cooldown: next speech only after 22 to 38 seconds
        nextQuoteAllowedTime = now + 22000 + Math.random() * 16000;
      }
    }
    // INTER-PHASE 3 -> 0 (12600ms - 13440ms & 0 - 2100ms): Standing back up / calm
    else if (elapsed >= 12600 || elapsed < 2100) {
      if (now >= userOverrideUntil) hideBubble();
    }
  }

  // Restart GIF playback to frame 0 and sync loopStartTime
  function resyncGifPlayback() {
    if (!gifEl || !cachedBlobUrl) return;
    loopStartTime = performance.now();
    lastLoopCycle = -1;
    activeCyclePhase = null;
    currentQuotePhaseTriggered = false;
    gifEl.src = cachedBlobUrl;
  }

  // Load GIF once via blob for zero-latency frame 0 instantiation
  if (gifEl) {
    fetch('markus_magnusson.gif')
      .then(r => r.blob())
      .then(blob => {
        cachedBlobUrl = URL.createObjectURL(blob);
        gifEl.onload = () => {
          loopStartTime = performance.now();
          timelineTick();
        };
        gifEl.src = cachedBlobUrl;
      })
      .catch(() => {
        loopStartTime = performance.now();
        timelineTick();
      });
  } else {
    timelineTick();
  }

  // Resync on tab focus to maintain millisecond synchronization & give calm buffer
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (cachedBlobUrl) resyncGifPlayback();
      hideBubble();
      activeCyclePhase = null;
      // Calm silence on tab switch before any auto speech
      nextQuoteAllowedTime = Math.max(nextQuoteAllowedTime, performance.now() + 6000);
    }
  });

  // Interactive Easter Egg: clicking on caveman triggers funny reaction
  if (cavemanCardEl) {
    cavemanCardEl.addEventListener('click', () => {
      userOverrideUntil = performance.now() + 2400;
      showBubble(pickRandom(QUOTES_CLICKED, currentQuoteText));
      tick();
      // Push next random speech further back so clicking doesn't collide with scheduled speech
      nextQuoteAllowedTime = performance.now() + 18000;
      clearTimeout(clickBubbleTimeout);
      clickBubbleTimeout = setTimeout(() => {
        if (performance.now() >= userOverrideUntil) {
          hideBubble();
        }
      }, 2400);
    });
  }

})();
