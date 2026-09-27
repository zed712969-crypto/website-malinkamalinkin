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
        output += `<span class="scr">${rc}</span>`;
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
  const els = document.querySelectorAll('[data-enter]');
  const STEP = 55; // ms between elements

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

// Run on load
runEntranceAnimations();

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
   3. SOUND
   ────────────────────────────────────────── */
const btnSound = document.getElementById('btn-sound');
let soundOn = true, audioCtx = null;

function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

btnSound.addEventListener('click', () => {
  soundOn = !soundOn;
  btnSound.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
  if (soundOn) btnClick();
});

// Crisp, audible UI hover tick (louder: 0.09 instead of 0.02)
function tick() {
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

// Attach hover and click feedback to all buttons and chips
const interactiveButtons = document.querySelectorAll('.chip-link, .sw, #btn-scroll, #btn-sound, .scroll-hint');
interactiveButtons.forEach(el => {
  el.addEventListener('mouseenter', tick);
  el.addEventListener('click', btnClick);
});

/* ──────────────────────────────────────────
   4. SCROLL HINT
   ────────────────────────────────────────── */
document.getElementById('btn-scroll')?.addEventListener('click', () => {
  worksEl.scrollIntoView({ behavior: 'smooth' });
});

/* ──────────────────────────────────────────
   5. THREE.JS — SKIPPER (GLB MODEL + FALLBACK)
      Polygon-by-polygon reveal + click rebuild
   ────────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('gl');
  if (!canvas) return;

  const cursorBadge = document.getElementById('cursor-badge');
  const petHandEl = document.getElementById('pet-hand');

  // State variables for petting & squish
  let patSquish = 0;
  let patVelocity = 0;
  let isPatHolding = false;
  let patInterval = null;
  let handHideTimeout = null;
  let lastPatTime = 0;

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
    opacity: 0.85,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), contactMat);
  contactShadow.rotation.x = -Math.PI / 2;
  scene.add(contactShadow);

  // ── Dynamic Ground shadow receiver ──
  const gndMat = new THREE.ShadowMaterial({ opacity: 0.12 });
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), gndMat);
  gnd.rotation.x = -Math.PI / 2;
  gnd.receiveShadow = true;
  scene.add(gnd);

  // ── Mouse tracking & Hover "CLICK ME" badge ──
  let mx = 0, my = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let modelGroup = null;
  let mixer = null;
  let activeAction = null;
  let isHoveringCat = false;

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

  function updatePetHandPosition() {
    if (typeof petHandEl === 'undefined' || !petHandEl || typeof camera === 'undefined' || !camera) return;

    // Central vertical axis is at X=0, Z=0.
    // Top of the cat's head is at Y = 1.38 in world space, compressed by patSquish.
    // Because X=0 and Z=0, this point stays perfectly centered and NEVER orbits with the spinning cat!
    const squish = (typeof patSquish !== 'undefined') ? patSquish : 0;
    const headWorldY = 1.38 - squish * 0.32;
    const headVec = new THREE.Vector3(0, headWorldY, 0);
    headVec.project(camera);

    const screenX = (headVec.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-(headVec.y * 0.5) + 0.5) * window.innerHeight;

    petHandEl.style.left = `${screenX}px`;
    petHandEl.style.top = `${screenY}px`;
  }

  function doPat() {
    lastPatTime = performance.now();

    // Add squish downward velocity impulse
    patVelocity += 2.8;

    // Play signature pat-pat sound
    playPatSound();

    // Ensure hand is positioned directly on the cat head before activating
    updatePetHandPosition();

    // Show and maintain meme petting hand smoothly
    if (petHandEl) {
      clearTimeout(handHideTimeout);
      if (!petHandEl.classList.contains('active')) {
        petHandEl.src = 'pet_hand.gif?t=' + Date.now();
        petHandEl.classList.add('active');
      }
      // Keep hand active for at least one full stroke
      handHideTimeout = setTimeout(() => {
        if (!isPatHolding && petHandEl) {
          petHandEl.classList.remove('active');
        }
      }, 260);
    }

    // Cute slight spin boost
    if (activeAction) {
      activeAction.timeScale = 0.32;
      clearTimeout(activeAction._patTimeout);
      activeAction._patTimeout = setTimeout(() => {
        if (activeAction) activeAction.timeScale = 0.11;
      }, 700);
    }
  }

  function startPatting(clientX, clientY) {
    if (!modelGroup || !camera) return;

    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(modelGroup.children, true);

    if (hits.length > 0) {
      loadPatBuffer();
      isPatHolding = true;
      doPat();

      // Continuous rapid patting if held down (200ms per pat matches GIF loop & Tuna tempo)
      clearInterval(patInterval);
      patInterval = setInterval(() => {
        if (isPatHolding) {
          doPat();
        } else {
          clearInterval(patInterval);
          patInterval = null;
        }
      }, 200);
    }
  }

  function stopPatting() {
    if (!isPatHolding && !patInterval) return;
    isPatHolding = false;
    if (patInterval) {
      clearInterval(patInterval);
      patInterval = null;
    }
    if (petHandEl) {
      clearTimeout(handHideTimeout);
      // Ensure the hand finishes its current stroke so it never abruptly cuts off!
      const elapsed = performance.now() - lastPatTime;
      const remainingStroke = Math.max(0, 200 - elapsed);
      handHideTimeout = setTimeout(() => {
        if (!isPatHolding && petHandEl) {
          petHandEl.classList.remove('active');
        }
      }, remainingStroke + 50);
    }
  }

  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;

    if (cursorBadge) {
      cursorBadge.style.left = `${e.clientX}px`;
      cursorBadge.style.top = `${e.clientY}px`;
    }

    if (modelGroup && camera) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(modelGroup.children, true);

      if (hits.length > 0) {
        if (!isHoveringCat) {
          isHoveringCat = true;
          document.body.style.cursor = 'pointer';
          if (cursorBadge) {
            cursorBadge.textContent = 'CLICK ME';
            cursorBadge.classList.add('visible');
          }
        }
      } else {
        if (isHoveringCat && !isPatHolding) {
          isHoveringCat = false;
          document.body.style.cursor = '';
          cursorBadge?.classList.remove('visible');
        }
      }
    }
  });

  window.addEventListener('mouseleave', () => {
    isHoveringCat = false;
    document.body.style.cursor = '';
    cursorBadge?.classList.remove('visible');
    stopPatting();
  });

  // Hold-to-pat & click on desktop
  canvas.addEventListener('mousedown', e => {
    startPatting(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', stopPatting);

  // Hold-to-pat & tap on mobile
  canvas.addEventListener('touchstart', e => {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      mx = (touch.clientX / window.innerWidth - 0.5) * 2;
      my = (touch.clientY / window.innerHeight - 0.5) * 2;
      startPatting(touch.clientX, touch.clientY);
    }
  }, { passive: true });

  window.addEventListener('touchend', stopPatting);
  window.addEventListener('touchcancel', stopPatting);

  window.addEventListener('touchmove', e => {
    if (e.touches && e.touches[0]) {
      mx = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
      my = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
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

  // ── Polygon-by-polygon reveal system ──
  const revealMeshes = []; // { mesh, total, revealed }
  let revealProgress = 0;
  let revealActive = false;
  const REVEAL_SPEED = 0.012; // fraction per frame (60fps ~ 1.4s total)

  function startReveal() {
    revealProgress = 0;
    revealActive = true;
    revealMeshes.forEach(rm => {
      rm.mesh.geometry.setDrawRange(0, 0);
      rm.mesh.visible = true;
    });

    // TwistFlash on the hero layer
    const heroLayer = document.getElementById('hero-layer');
    heroLayer.classList.remove('twist-flash');
    void heroLayer.offsetWidth; // force reflow
    heroLayer.classList.add('twist-flash');
    setTimeout(() => heroLayer.classList.remove('twist-flash'), 500);
  }

  function updateReveal() {
    if (!revealActive) return;
    revealProgress += REVEAL_SPEED;
    if (revealProgress >= 1) {
      revealProgress = 1;
      revealActive = false;
      revealMeshes.forEach(rm => {
        rm.mesh.geometry.setDrawRange(0, Infinity);
      });
      return;
    }

    // Ease-out for smoother feel
    const eased = 1 - Math.pow(1 - revealProgress, 3);

    revealMeshes.forEach(rm => {
      const count = Math.floor(rm.total * eased);
      rm.mesh.geometry.setDrawRange(0, count);
    });
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

        // Target visual height for hero section (~70-75% screen height)
        // size.y is the actual character height
        const targetHeight = 2.75;
        const targetWidth = 2.4;
        const scale = Math.min(targetHeight / (size.y || 1), targetWidth / (size.x || 1));
        model.scale.setScalar(scale);

        // Center horizontally (X), depth (Z), and place vertically in the screen's visual sweet spot
        const visualCenterY = 0.85;
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale + visualCenterY;
        model.position.z = -center.z * scale;

        // Ground shadow positioning directly under the paws/base
        const floorY = visualCenterY - (size.y * scale) / 2;
        contactShadow.position.set(0, floorY + 0.005, 0);
        contactShadow.scale.set(size.x * scale * 1.6, size.z * scale * 0.9, 1);
        gnd.position.y = floorY;

        // Enable shadows & collect meshes for reveal
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              child.material = child.material.clone();
              child.material.side = THREE.DoubleSide;
              if (child.material.roughness !== undefined) {
                child.material.roughness = Math.max(child.material.roughness, 0.45);
              }
              child.material.metalness = 0.0;
            }

            const geo = child.geometry;
            const total = geo.index ? geo.index.count : geo.attributes.position.count;
            geo.setDrawRange(0, 0);
            revealMeshes.push({ mesh: child, total });
          }
        });

        modelGroup = new THREE.Group();
        modelGroup.add(model);
        modelGroup.userData.isGLB = true;

        // Check and play animation clips (including Take 001)
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);

          const clip = gltf.animations.find(c => c.name.toLowerCase().includes('take') || c.name.toLowerCase().includes('dance')) || gltf.animations[0];

          activeAction = mixer.clipAction(clip);
          activeAction.setEffectiveTimeScale(0.11); // Ultra-chill, slow-mo majestic spin tempo
          activeAction.play();

          // Start right at the iconic spinning sequence (t = 1.083s) so it doesn't wait in the static pose!
          activeAction.time = 1.083;

          modelGroup.userData.hasNativeAnimation = true;
          modelGroup.userData.isOiiaCat = clip.name.includes('Take 001');
          console.log(`🎉 Playing animation clip "${clip.name}" (${clip.duration.toFixed(2)}s) with seamless Oiia spin loop!`);
        }

        scene.add(modelGroup);
        updatePetHandPosition();

        // Start polygon reveal
        startReveal();
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

    // Register all meshes for polygon reveal
    g.traverse(child => {
      if (child.isMesh) {
        const geo = child.geometry;
        const total = geo.index ? geo.index.count : geo.attributes.position.count;
        geo.setDrawRange(0, 0);
        revealMeshes.push({ mesh: child, total });
      }
    });

    modelGroup = g;
    scene.add(g);

    // Store references for animation
    g.userData = { body, head, beak, flipL, flipR, footL, footR, legL, legR, tail };

    startReveal();
  }

  // ── Animation loop ──
  const clock = new THREE.Clock();
  let dancePhase = 0, phaseTimer = 0;
  const PHASE_DUR = 3.5;

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta(); // Must be called BEFORE getElapsedTime
    const t = clock.getElapsedTime();

    // Polygon reveal
    updateReveal();

    if (!modelGroup) {
      renderer.render(scene, camera);
      return;
    }

    // Update skeletal/GLTF animations if present
    if (mixer) {
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
      modelGroup.position.y = -patSquish * 0.22;

      // Position petpet meme hand right on the cat head in screen space
      updatePetHandPosition();
    }

    // Mouse follow (smooth subtle tilt towards cursor)
    modelGroup.rotation.y += (mx * 0.25 - modelGroup.rotation.y) * 0.04;
    modelGroup.rotation.x += (-my * 0.1 - modelGroup.rotation.x) * 0.04;

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
const ORIG_TITLE = "малинка  —  сын шл...";
const AWAY_TITLE = "куда ушел, вернись...";

document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? AWAY_TITLE : ORIG_TITLE;
});

window.addEventListener('blur', () => {
  document.title = AWAY_TITLE;
});

window.addEventListener('focus', () => {
  document.title = ORIG_TITLE;
});

console.log("че ты пялишь? код на гитхабе)");

