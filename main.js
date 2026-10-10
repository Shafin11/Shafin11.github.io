/* =============================================================
   Mohammad Omar Raihan — Portfolio interactions
   Plain JavaScript, no external libraries.
   ============================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4, nx: 0.5, ny: 0.4, moved: false };
  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.nx = e.clientX / window.innerWidth;
      mouse.ny = e.clientY / window.innerHeight;
      mouse.moved = true;
    },
    { passive: true }
  );

  const isLight = () => root.getAttribute("data-theme") === "light";

  // Live hue shared with canvases
  const hue = { current: 258, target: 258 };

  // Sets up a canvas sized to its CSS box at device pixel ratio
  function fitCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (canvas.width !== Math.round(w * DPR) || canvas.height !== Math.round(h * DPR)) {
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx, w, h };
  }

  // Runs a callback only while an element is on screen
  function whenVisible(el, onChange, margin = "100px") {
    if (!("IntersectionObserver" in window)) { onChange(true); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => onChange(en.isIntersecting)), { rootMargin: margin });
    io.observe(el);
  }

  // Seeded random so card art looks the same on every visit
  function seeded(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;

  /* ---------------------------------------------------------
     Year + clock
     --------------------------------------------------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const clockEl = $("#clock");
  function tickClock() {
    if (!clockEl) return;
    try {
      clockEl.textContent = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dhaka",
      }).format(new Date()) + " GMT+6";
    } catch (e) {
      clockEl.textContent = "";
    }
  }
  tickClock();
  setInterval(tickClock, 15000);

  /* ---------------------------------------------------------
     Theme toggle (with a circular reveal when supported)
     --------------------------------------------------------- */
  const themeBtn = $("#themeToggle");
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("or-theme", t); } catch (e) {}
    if (themeBtn) themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    if (metaTheme) metaTheme.setAttribute("content", t === "dark" ? "#0A0E1F" : "#F3F4FB");
    window.dispatchEvent(new CustomEvent("themechange"));
  }
  applyTheme(isLight() ? "light" : "dark");

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = isLight() ? "dark" : "light";
      const r = themeBtn.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      if (document.startViewTransition && !reduceMotion) {
        const vt = document.startViewTransition(() => applyTheme(next));
        vt.ready.then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
            { duration: 750, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" }
          );
        }).catch(() => {});
      } else {
        applyTheme(next);
      }
    });
  }

  /* ---------------------------------------------------------
     Loader
     --------------------------------------------------------- */
  const loader = $("#loader");
  const loaderCount = $("#loaderCount");
  const bands = loader ? $$(".loader__bands span", loader) : [];
  document.body.classList.add("is-loading");

  function finishIntro() {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    heroLettersIn();
  }

  function runLoader() {
    if (!loader) { finishIntro(); return; }
    if (reduceMotion) {
      loader.classList.add("is-hidden");
      finishIntro();
      return;
    }
    const duration = 1700;
    let start = null;
    let pageLoaded = document.readyState === "complete";
    window.addEventListener("load", () => (pageLoaded = true));

    function step(ts) {
      if (start === null) start = ts;
      let p = clamp((ts - start) / duration, 0, 1);
      if (!pageLoaded) p = Math.min(p, 0.9); // wait for images/fonts
      const shown = Math.round(easeOut(p) * 100);
      loaderCount.textContent = shown;
      bands.forEach((b, i) => {
        const local = clamp(easeOut(p) * 1.25 - i * 0.04, 0, 1);
        b.style.transform = `scaleY(${local})`;
      });
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        setTimeout(() => {
          loader.classList.add("is-done");
          setTimeout(() => loader.classList.add("is-gone"), 300);
          setTimeout(finishIntro, 350);
          setTimeout(() => loader.classList.add("is-hidden"), 1300);
        }, 180);
      }
    }
    requestAnimationFrame(step);
    // Safety net: never trap the visitor behind the loader
    setTimeout(() => (pageLoaded = true), 4000);
  }

  /* ---------------------------------------------------------
     Hero name: letters rise in, then react to the cursor
     --------------------------------------------------------- */
  const heroSplits = $$(".hero__name .split");
  heroSplits.forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-hidden", "true");
    // keep each word together so lines only break between words
    text.split(" ").forEach((word, wi, arr) => {
      const w = document.createElement("span");
      w.style.display = "inline-block";
      w.style.whiteSpace = "nowrap";
      [...word].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "char";
        s.textContent = ch;
        s.style.transform = "translateY(110%)";
        w.appendChild(s);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });
  const heroChars = $$(".hero__name .char");

  // start the intro only after the hero letters exist
  runLoader();

  function heroLettersIn() {
    heroChars.forEach((c, i) => {
      c.style.transition = `transform 1s cubic-bezier(0.22,1,0.36,1) ${0.03 * i}s`;
      c.style.transform = "translateY(0)";
    });
    setTimeout(() => heroChars.forEach((c) => (c.style.transition = "transform 0.45s cubic-bezier(0.22,1,0.36,1)")), 1600);
  }

  // Letters near the cursor lift a little
  const heroName = $(".hero__name");
  if (heroName && finePointer && !reduceMotion) {
    heroName.style.pointerEvents = "auto";
    heroName.addEventListener("pointermove", (e) => {
      heroChars.forEach((c) => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        const lift = clamp(1 - d / 160, 0, 1);
        c.style.transform = `translateY(${-lift * 14}px) rotate(${lift * -4}deg)`;
      });
    });
    heroName.addEventListener("pointerleave", () => heroChars.forEach((c) => (c.style.transform = "translateY(0)")));
  }

  /* ---------------------------------------------------------
     Rotating role words
     --------------------------------------------------------- */
  const words = $$("#rotator .rotator__word");
  if (words.length > 1 && !reduceMotion) {
    let wi = 0;
    setInterval(() => {
      const cur = words[wi];
      wi = (wi + 1) % words.length;
      const next = words[wi];
      cur.classList.remove("is-active");
      cur.classList.add("is-leaving");
      next.classList.remove("is-leaving");
      next.classList.add("is-active");
      setTimeout(() => cur.classList.remove("is-leaving"), 750);
    }, 2400);
  }

  /* ---------------------------------------------------------
     Spotlight gradient that follows the cursor on outlined text
     --------------------------------------------------------- */
  function trackSpot(container, target) {
    if (!container || !target) return;
    container.addEventListener("pointermove", (e) => {
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      target.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  }
  trackSpot($(".hero"), $(".hero__line--outline .split"));
  trackSpot($(".contact"), $(".contact__line--outline"));

  /* ---------------------------------------------------------
     Custom cursor
     --------------------------------------------------------- */
  const cursor = $(".cursor");
  const cDot = $(".cursor__dot");
  const cRing = $(".cursor__ring");
  const cLabel = $(".cursor__label");
  const ring = { x: mouse.x, y: mouse.y };

  if (cursor && finePointer) {
    document.body.classList.add("has-cursor");
    document.addEventListener("pointerover", (e) => {
      const labelled = e.target.closest("[data-cursor]");
      const interactive = e.target.closest("a, button, [role='tab']");
      if (labelled) {
        cLabel.textContent = labelled.getAttribute("data-cursor");
        cursor.classList.add("is-label");
        cursor.classList.remove("is-hover");
      } else if (interactive) {
        cursor.classList.add("is-hover");
        cursor.classList.remove("is-label");
      } else {
        cursor.classList.remove("is-hover", "is-label");
      }
    });
    document.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
    document.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
    document.addEventListener("pointerleave", () => cursor.style.opacity = "0");
    document.addEventListener("pointerenter", () => cursor.style.opacity = "1");
  } else if (cursor) {
    cursor.remove();
  }

  function updateCursor() {
    if (!cursor || !finePointer || !cursor.isConnected) return;
    cDot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    ring.x = lerp(ring.x, mouse.x, 0.18);
    ring.y = lerp(ring.y, mouse.y, 0.18);
    cRing.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
  }

  /* ---------------------------------------------------------
     Magnetic buttons
     --------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  /* ---------------------------------------------------------
     Aurora blobs follow the cursor softly
     --------------------------------------------------------- */
  const blobs = $$(".aurora__blob");
  const blobPos = blobs.map(() => ({ x: 0, y: 0 }));
  function updateAurora(t) {
    if (reduceMotion) return;
    blobs.forEach((b, i) => {
      const k = [0.06, -0.05, 0.04][i];
      const tx = (mouse.nx - 0.5) * innerWidth * k * 4 + Math.sin(t * 0.0002 + i * 2) * 60;
      const ty = (mouse.ny - 0.5) * innerHeight * k * 3 + Math.cos(t * 0.00018 + i) * 50;
      blobPos[i].x = lerp(blobPos[i].x, tx, 0.04);
      blobPos[i].y = lerp(blobPos[i].y, ty, 0.04);
      b.style.transform = `translate3d(${blobPos[i].x}px, ${blobPos[i].y}px, 0)`;
    });
  }

  /* ---------------------------------------------------------
     Header: hide on scroll down, active section pill
     --------------------------------------------------------- */
  const header = $("#header");
  const navLinks = $$(".nav__link");
  const navPill = $(".nav__pill");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  let lastY = window.scrollY;
  let activeId = "";

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    let found = false;
    navLinks.forEach((a) => {
      const on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-active", on);
      if (on && navPill) {
        found = true;
        navPill.style.width = a.offsetWidth + "px";
        navPill.style.transform = `translateX(${a.offsetLeft}px)`;
        navPill.style.opacity = "1";
      }
    });
    if (!found && navPill) navPill.style.opacity = "0";
  }

  function onScrollHeader(y) {
    if (header) {
      const goingDown = y > lastY && y > 160;
      const menuOpen = $("#menuPanel") && !$("#menuPanel").hidden;
      header.classList.toggle("is-hidden", goingDown && !menuOpen);
    }
    lastY = y;
    const mid = innerHeight * 0.4;
    let current = "";
    sections.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) current = s.id;
    });
    setActive(current);
  }
  window.addEventListener("resize", () => { const id = activeId; activeId = ""; setActive(id); });

  /* ---------------------------------------------------------
     Full-screen menu
     --------------------------------------------------------- */
  const menuBtn = $("#menuBtn");
  const menu = $("#menuPanel");
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    $(".menu-btn__label", menuBtn).textContent = open ? "Close" : "Menu";
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")));
      document.body.style.overflow = "hidden";
      const first = $("a", menu);
      if (first) setTimeout(() => first.focus(), 300);
    } else {
      menu.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 700);
    }
  }
  if (menuBtn) menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
  if (menu) $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ---------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }),
      { rootMargin: "0px 0px -12% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------------------------------------------------------
     Scroll-scrubbed paragraph (words light up as you read)
     --------------------------------------------------------- */
  const scrubEls = $$(".scrub-text");
  scrubEls.forEach((el) => {
    const parts = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    parts.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "word";
      s.textContent = w;
      el.appendChild(s);
      if (i < parts.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });
  function onScrollScrub() {
    scrubEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const start = innerHeight * 0.9;
      const end = innerHeight * 0.55;
      const p = clamp((start - r.top) / (start - end + r.height * 0.3), 0, 1);
      const ws = el.children;
      const lit = Math.round(p * ws.length);
      for (let i = 0; i < ws.length; i++) ws[i].classList.toggle("is-lit", i < lit);
    });
  }

  /* ---------------------------------------------------------
     Count-up numbers
     --------------------------------------------------------- */
  $$(".count").forEach((el) => {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const show = (v) => (el.textContent = v.toFixed(dec));
    if (reduceMotion) { show(to); return; }
    let done = false;
    whenVisible(el, (vis) => {
      if (!vis || done) return;
      done = true;
      const t0 = performance.now();
      const dur = 1400;
      (function f(now) {
        const p = clamp((now - t0) / dur, 0, 1);
        show(to * easeOut(p));
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    }, "0px");
  });

  /* ---------------------------------------------------------
     Portrait tilt
     --------------------------------------------------------- */
  const portrait = $("[data-tilt]");
  if (portrait && finePointer && !reduceMotion) {
    const frame = $(".portrait__frame", portrait);
    portrait.addEventListener("pointermove", (e) => {
      const r = portrait.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      frame.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
      frame.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
      frame.style.setProperty("--sx", `${px * 100}%`);
      frame.style.setProperty("--sy", `${py * 100}%`);
    });
    portrait.addEventListener("pointerleave", () => {
      frame.style.setProperty("--ry", "0deg");
      frame.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------------------------------------------------------
     Focus accordion
     --------------------------------------------------------- */
  const focusItems = $$(".focus__item");
  focusItems.forEach((item) => {
    const head = $(".focus__head", item);
    head.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      focusItems.forEach((o) => {
        o.classList.remove("is-open");
        $(".focus__head", o).setAttribute("aria-expanded", "false");
      });
      if (open) {
        item.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
      }
    });
    item.addEventListener("pointermove", (e) => {
      const r = item.getBoundingClientRect();
      item.style.setProperty("--mx", `${e.clientX - r.left}px`);
      item.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------------------------------------------------------
     HERO: rotating spectral network sphere ("data in motion")
     --------------------------------------------------------- */
  const hero = (function () {
    const canvas = $("#heroCanvas");
    if (!canvas) return null;
    let ctx, W, H;
    const small = () => innerWidth < 760;
    let N = small() ? 170 : 340;
    let pts = [];
    let edges = [];
    let adj = [];
    let pulses = [];
    let rotY = 0, rotX = -0.25, velY = 0.0022, tiltX = -0.25;
    let dragging = false, lastPX = 0, lastPY = 0;
    let visible = true;

    function build() {
      N = small() ? 170 : 340;
      pts = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        const jitter = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.06;
        pts.push({ x: Math.cos(th) * r * jitter, y: y * jitter, z: Math.sin(th) * r * jitter, sx: 0, sy: 0, sz: 0, ox: 0, oy: 0 });
      }
      // connect each point to its 3 nearest neighbours
      edges = [];
      adj = pts.map(() => []);
      const seen = new Set();
      for (let i = 0; i < N; i++) {
        const d = [];
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
          d.push([dx * dx + dy * dy + dz * dz, j]);
        }
        d.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < 3; k++) {
          const j = d[k][1];
          const key = i < j ? i + "-" + j : j + "-" + i;
          if (!seen.has(key)) { seen.add(key); edges.push([i, j]); adj[i].push(j); adj[j].push(i); }
        }
      }
      pulses = [];
      const P = small() ? 14 : 28;
      for (let p = 0; p < P; p++) {
        const a = Math.floor(Math.random() * N);
        pulses.push({ a, b: adj[a][Math.floor(Math.random() * adj[a].length)], t: Math.random(), speed: 0.012 + Math.random() * 0.018 });
      }
    }

    function resize() {
      const f = fitCanvas(canvas);
      ctx = f.ctx; W = f.w; H = f.h;
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true; lastPX = e.clientX; lastPY = e.clientY;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    window.addEventListener("pointerup", () => (dragging = false));
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      velY = (e.clientX - lastPX) * 0.0006;
      tiltX = clamp(tiltX + (e.clientY - lastPY) * 0.004, -1.1, 1.1);
      lastPX = e.clientX; lastPY = e.clientY;
    });
    if (finePointer) canvas.style.cursor = "grab";

    whenVisible(canvas, (v) => (visible = v), "0px");

    function draw(t) {
      if (!visible || !ctx) return;
      const light = isLight();
      const h0 = hue.current;
      ctx.clearRect(0, 0, W, H);

      const cx = small() ? W * 0.62 : W * 0.72;
      const cy = small() ? H * 0.36 : H * 0.5;
      const R = small() ? Math.min(W, H) * 0.4 : Math.min(W * 0.32, H * 0.4);
      const fov = 2.6;

      if (!dragging) {
        velY = lerp(velY, 0.0022 + (mouse.nx - 0.5) * 0.004, 0.02);
        tiltX = lerp(tiltX, -0.25 + (mouse.ny - 0.5) * 0.6, 0.02);
      }
      rotY += reduceMotion ? 0 : velY;
      rotX = lerp(rotX, tiltX, 0.08);

      const cyR = Math.cos(rotY), syR = Math.sin(rotY);
      const cxR = Math.cos(rotX), sxR = Math.sin(rotX);
      const breathe = 1 + Math.sin(t * 0.0008) * 0.02;

      // canvas sits at the top of the hero, so convert the cursor into canvas space once
      const heroTop = canvas.getBoundingClientRect().top;
      const mx = mouse.x, my = mouse.y - heroTop;
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        let x = p.x * cyR + p.z * syR;
        let z = -p.x * syR + p.z * cyR;
        const y = p.y * cxR - z * sxR;
        z = p.y * sxR + z * cxR;
        const s = fov / (fov + z);
        const px = cx + x * R * s * breathe;
        const py = cy + y * R * s * breathe;
        // push away from the cursor
        const dx = px - mx, dy = py - my;
        const dist = Math.hypot(dx, dy);
        const push = dist < 130 ? (1 - dist / 130) * 26 : 0;
        p.ox = lerp(p.ox, dist ? (dx / dist) * push : 0, 0.15);
        p.oy = lerp(p.oy, dist ? (dy / dist) * push : 0, 0.15);
        p.sx = px + p.ox; p.sy = py + p.oy; p.sz = z; p.s = s;
      }

      // edges
      ctx.lineWidth = 1;
      for (let e = 0; e < edges.length; e++) {
        const a = pts[edges[e][0]], b = pts[edges[e][1]];
        const depth = (a.sz + b.sz) * 0.5; // -1 (front) .. 1 (back)
        const alpha = (light ? 0.34 : 0.32) * (1 - (depth + 1) * 0.38);
        ctx.strokeStyle = hsl(h0 + a.y * 70 + 20, light ? 70 : 90, light ? 50 : 66, alpha);
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }

      // nodes
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const front = 1 - (p.sz + 1) * 0.5; // 1 = front
        const r = (1.1 + front * 2.1) * p.s;
        ctx.fillStyle = hsl(h0 + p.y * 70 + 20, light ? 75 : 95, light ? 48 : 70, 0.35 + front * 0.6);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
      }

      // travelling signals
      for (let k = 0; k < pulses.length; k++) {
        const q = pulses[k];
        q.t += reduceMotion ? 0 : q.speed;
        if (q.t >= 1) {
          q.t = 0; q.a = q.b;
          const nb = adj[q.a];
          q.b = nb[Math.floor(Math.random() * nb.length)];
        }
        const a = pts[q.a], b = pts[q.b];
        const x = lerp(a.sx, b.sx, q.t), y = lerp(a.sy, b.sy, q.t);
        const front = 1 - ((a.sz + b.sz) * 0.5 + 1) * 0.5;
        const col = hsl(h0 + 150 + k * 9, 100, light ? 50 : 72, 0.5 + front * 0.5);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
        g.addColorStop(0, col);
        g.addColorStop(1, hsl(h0 + 150, 100, 70, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      }

      // soft orbit ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.35);
      ctx.strokeStyle = hsl(h0 + 60, 90, light ? 50 : 70, light ? 0.22 : 0.18);
      ctx.setLineDash([2, 9]);
      ctx.beginPath(); ctx.ellipse(0, 0, R * 1.32, R * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const oa = t * 0.0006;
      ctx.fillStyle = hsl(h0 + 60, 100, light ? 50 : 72, 0.9);
      ctx.beginPath(); ctx.arc(Math.cos(oa) * R * 1.32, Math.sin(oa) * R * 0.36, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    build();
    resize();
    let lastSmall = small();
    window.addEventListener("resize", () => {
      resize();
      if (small() !== lastSmall) { lastSmall = small(); build(); }
    });
    return { draw };
  })();

  /* ---------------------------------------------------------
     RESEARCH 1: two data types meeting in one shared space
     --------------------------------------------------------- */
  const grn = (function () {
    const canvas = $("#grnCanvas");
    if (!canvas) return null;
    let ctx, W, H;
    const G = 30;
    const rand = seeded(42);
    const genes = [];
    const clusters = [[0.36, 0.42], [0.62, 0.36], [0.44, 0.7], [0.66, 0.66]];
    for (let i = 0; i < G; i++) {
      const c = clusters[i % clusters.length];
      const ang = rand() * Math.PI * 2, rad = 0.03 + rand() * 0.085;
      genes.push({
        ax: 0.06 + rand() * 0.22, ay: 0.2 + rand() * 0.65,   // RNA-seq start (left)
        bx: 0.72 + rand() * 0.22, by: 0.2 + rand() * 0.65,   // CRISPR start (right)
        lx: c[0] + Math.cos(ang) * rad, ly: c[1] + Math.sin(ang) * rad, // shared space
        cl: i % clusters.length, ph: rand() * 6.28,
      });
    }
    // regulatory links: nearest neighbours inside the shared space
    const links = [];
    genes.forEach((g, i) => {
      const d = genes.map((o, j) => [Math.hypot(g.lx - o.lx, g.ly - o.ly), j]).filter((x) => x[1] !== i).sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < 2; k++) {
        const j = d[k][1];
        if (!links.some((l) => (l[0] === j && l[1] === i))) links.push([i, j, rand()]);
      }
    });

    let start = null;
    let visible = false;
    let hover = -1;

    function resize() { const f = fitCanvas(canvas); ctx = f.ctx; W = f.w; H = f.h; }
    resize();
    window.addEventListener("resize", resize);

    whenVisible(canvas, (v) => {
      visible = v;
      if (v && start === null) start = performance.now();
    }, "-10% 0px");
    const replay = $("#grnReplay");
    if (replay) replay.addEventListener("click", () => (start = performance.now()));

    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
      let best = -1, bd = 0.05;
      genes.forEach((g, i) => { const d = Math.hypot(g.cx - mx, g.cy - my); if (d < bd) { bd = d; best = i; } });
      hover = best;
    });
    canvas.addEventListener("pointerleave", () => (hover = -1));

    function draw(now) {
      if (!visible || !ctx) return;
      const light = isLight();
      const h0 = hue.current;
      const el = start === null ? 0 : (now - start) / 1000;
      const tMerge = reduceMotion ? 1 : easeInOut(clamp((el - 0.4) / 2.4, 0, 1));
      const tLink = reduceMotion ? 1 : clamp((el - 2.8) / 1.6, 0, 1);
      ctx.clearRect(0, 0, W, H);

      // shared-space halo
      const haloA = tMerge;
      if (haloA > 0) {
        const g = ctx.createRadialGradient(W * 0.52, H * 0.53, 0, W * 0.52, H * 0.53, Math.min(W, H) * 0.42);
        g.addColorStop(0, hsl(h0 + 70, 90, light ? 60 : 60, 0.16 * haloA));
        g.addColorStop(1, hsl(h0 + 70, 90, 60, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = hsl(h0 + 70, 80, light ? 45 : 70, 0.3 * haloA);
        ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.ellipse(W * 0.52, H * 0.53, W * 0.27, H * 0.31, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = light ? "rgba(14,18,48,0.6)" : "rgba(238,240,255,0.65)";
        ctx.font = "600 12px Manrope, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.globalAlpha = haloA;
        ctx.fillText("Shared 128-D space", W * 0.52, H * 0.53 + H * 0.31 + 20);
        ctx.globalAlpha = 1;
      }

      const ca = hsl(h0, 92, light ? 52 : 68);
      const cb = hsl(h0 + 150, 92, light ? 48 : 66);

      // positions
      genes.forEach((g) => {
        const wob = Math.sin(now * 0.0012 + g.ph) * 0.006;
        const ax = lerp(g.ax, g.lx - 0.012, tMerge), ay = lerp(g.ay, g.ly, tMerge) + wob;
        const bx = lerp(g.bx, g.lx + 0.012, tMerge), by = lerp(g.by, g.ly, tMerge) - wob;
        g.pa = [ax * W, ay * H]; g.pb = [bx * W, by * H];
        g.cx = (ax + bx) / 2; g.cy = (ay + by) / 2;
      });

      // pairing threads during the merge
      if (tMerge > 0 && tMerge < 1) {
        ctx.lineWidth = 1;
        genes.forEach((g) => {
          ctx.strokeStyle = hsl(h0 + 70, 70, light ? 50 : 70, 0.15 * (1 - tMerge));
          ctx.beginPath(); ctx.moveTo(g.pa[0], g.pa[1]); ctx.lineTo(g.pb[0], g.pb[1]); ctx.stroke();
        });
      }

      // regulatory links grow in
      if (tLink > 0) {
        links.forEach((l, k) => {
          const local = clamp(tLink * 1.6 - l[2] * 0.6, 0, 1);
          if (local <= 0) return;
          const a = genes[l[0]], b = genes[l[1]];
          const x1 = a.cx * W, y1 = a.cy * H, x2 = lerp(x1, b.cx * W, local), y2 = lerp(y1, b.cy * H, local);
          const hl = hover === l[0] || hover === l[1];
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, ca); grad.addColorStop(1, cb);
          ctx.strokeStyle = grad;
          ctx.globalAlpha = hover >= 0 && !hl ? 0.15 : 0.75;
          ctx.lineWidth = hl ? 2.4 : 1.4;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.globalAlpha = 1;
          void k;
        });
      }

      // nodes
      genes.forEach((g, i) => {
        const dim = hover >= 0 && hover !== i && !links.some((l) => (l[0] === hover && l[1] === i) || (l[1] === hover && l[0] === i));
        ctx.globalAlpha = dim ? 0.3 : 1;
        const big = hover === i ? 2 : 0;
        ctx.fillStyle = ca;
        ctx.beginPath(); ctx.arc(g.pa[0], g.pa[1], 5 + big, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cb;
        ctx.beginPath(); ctx.arc(g.pb[0], g.pb[1], 5 + big, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // side captions before the merge
      if (tMerge < 1) {
        ctx.globalAlpha = 1 - tMerge;
        ctx.font = "700 13px Manrope, Inter, sans-serif";
        ctx.fillStyle = ca; ctx.textAlign = "left";
        ctx.fillText("Expression", W * 0.06, H * 0.9);
        ctx.fillStyle = cb; ctx.textAlign = "right";
        ctx.fillText("Dependency", W * 0.94, H * 0.9);
        ctx.globalAlpha = 1;
      }
    }
    return { draw };
  })();

  /* ---------------------------------------------------------
     RESEARCH 2: PM2.5 model results (real numbers from the paper)
     --------------------------------------------------------- */
  (function pmChart() {
    const wrap = $("#pmBars");
    if (!wrap) return;
    const models = ["Persistence baseline", "Linear Regression", "Decision Tree", "Random Forest", "XGBoost"];
    const data = {
      r2: { vals: [0.94, 0.95, 0.85, 0.94, 0.93], better: "high", hint: "R² · higher is better", dec: 2 },
      rmse: { vals: [19.62, 19.19, 31.95, 20.12, 21.99], better: "low", hint: "RMSE in µg/m³ · lower is better", dec: 2 },
      mae: { vals: [9.99, 10.15, 17.08, 10.41, 11.31], better: "low", hint: "MAE in µg/m³ · lower is better", dec: 2 },
    };
    const hint = $("#chartHint");
    wrap.innerHTML = models.map((m) => `
      <div class="bar" role="listitem">
        <span class="bar__label">${m}</span>
        <span class="bar__track"><span class="bar__fill"></span></span>
        <span class="bar__value">0</span>
      </div>`).join("");
    const rows = $$(".bar", wrap);
    let metric = "r2";
    let shown = false;
    const current = models.map(() => 0);

    function render(animate = true) {
      const d = data[metric];
      const max = Math.max(...d.vals);
      const bestVal = d.better === "high" ? Math.max(...d.vals) : Math.min(...d.vals);
      if (hint) hint.textContent = d.hint;
      rows.forEach((row, i) => {
        const v = d.vals[i];
        const width = metric === "r2" ? v * 100 : (v / max) * 100;
        $(".bar__fill", row).style.width = shown ? width + "%" : "0%";
        row.classList.toggle("is-best", v === bestVal);
        const valEl = $(".bar__value", row);
        const from = current[i];
        const to = shown ? v : 0;
        if (!animate || reduceMotion) { valEl.textContent = to.toFixed(d.dec); current[i] = to; return; }
        const t0 = performance.now();
        (function f(now) {
          const p = clamp((now - t0) / 900, 0, 1);
          const val = lerp(from, to, easeOut(p));
          valEl.textContent = val.toFixed(d.dec);
          current[i] = val;
          if (p < 1) requestAnimationFrame(f);
        })(t0);
      });
    }
    render(false);
    whenVisible(wrap, (v) => { if (v && !shown) { shown = true; render(); } }, "-10% 0px");

    $$(".metric-tabs [role='tab']").forEach((tab) => {
      tab.addEventListener("click", () => {
        metric = tab.dataset.metric;
        $$(".metric-tabs [role='tab']").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
        render();
      });
    });
  })();

  /* ---------------------------------------------------------
     WORK: vertical scroll drives a horizontal track (desktop)
     --------------------------------------------------------- */
  const work = (function () {
    const section = $("#work");
    const track = $("#workTrack");
    const sticky = $(".work__sticky");
    const bar = $("#workProgress");
    if (!section || !track) return null;
    let distance = 0;
    let enabled = false;
    let x = 0, targetX = 0;

    function measure() {
      enabled = innerWidth > 900;
      if (!enabled) { section.style.height = ""; track.style.transform = ""; return; }
      distance = Math.max(0, track.scrollWidth - innerWidth);
      section.style.height = `${distance + innerHeight}px`;
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);

    // Drag the cards: dragging maps to page scroll so both stay in sync
    let dragging = false, lastX = 0, moved = 0;
    track.addEventListener("pointerdown", (e) => {
      if (!enabled || e.pointerType !== "mouse") return;
      dragging = true; lastX = e.clientX; moved = 0;
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
      window.scrollBy(0, -dx * 1.2);
    });
    window.addEventListener("pointerup", () => (dragging = false));
    track.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); moved = 0; } }, true);
    track.addEventListener("dragstart", (e) => e.preventDefault());

    function onScroll() {
      if (!enabled) return;
      const top = section.getBoundingClientRect().top;
      const p = clamp(-top / Math.max(1, distance), 0, 1);
      targetX = -p * distance;
      if (bar) bar.style.transform = `scaleX(${p})`;
    }
    function frame() {
      if (!enabled) return;
      x = reduceMotion ? targetX : lerp(x, targetX, 0.14);
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    }
    void sticky;
    return { onScroll, frame, measure };
  })();

  /* ---------------------------------------------------------
     Card art: small generated visuals for each project
     --------------------------------------------------------- */
  const arts = $$("canvas[data-art]").map((canvas) => {
    const kind = canvas.dataset.art;
    const state = { canvas, kind, visible: false, hover: false, ctx: null, w: 0, h: 0, seed: kind.length * 977 };
    const size = () => { const f = fitCanvas(canvas); state.ctx = f.ctx; state.w = f.w; state.h = f.h; };
    size();
    window.addEventListener("resize", size);
    whenVisible(canvas, (v) => (state.visible = v));
    const card = canvas.closest(".card");
    if (card) {
      card.addEventListener("pointerenter", () => (state.hover = true));
      card.addEventListener("pointerleave", () => (state.hover = false));
    }
    return state;
  });

  // Draws a circle the way the midpoint algorithm does: one pixel block at a time
  function midpointCircle(ctx, cx, cy, r, px) {
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      const pts = [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]];
      for (const [a, b] of pts) ctx.fillRect(cx + a * px, cy + b * px, px, px);
      y++;
      if (err < 0) err += 2 * y + 1;
      else { x--; err += 2 * (y - x) + 1; }
    }
  }

  const fishState = { big: { x: 0.3, y: 0.5, r: 7 }, small: [] };
  for (let i = 0; i < 6; i++) fishState.small.push({ x: Math.random(), y: 0.2 + Math.random() * 0.6, v: 0.0015 + Math.random() * 0.002, r: 2 + Math.floor(Math.random() * 2) });

  function drawArt(a, t) {
    const { ctx, w, h, kind } = a;
    if (!ctx) return;
    const light = isLight();
    const h0 = hue.current;
    const speed = a.hover ? 2.2 : 1;
    const rand = seeded(a.seed);
    ctx.clearRect(0, 0, w, h);

    if (kind === "eurosat") {
      // land-cover tiles, with a classifier scan line sweeping across
      const classes = ["#2f7d4f", "#3fa96a", "#9fd36b", "#e7c15a", "#c98b5e", "#8a8fa3", "#3d7fd1", "#1f4f9e", "#d9785f", "#6c6f85"];
      const cols = 14, rows = 9, cw = w / cols, ch = h / rows;
      const scan = ((t * 0.00012 * speed) % 1.2) * w;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const n = Math.sin(c * 0.55 + r * 0.32) + Math.cos(c * 0.21 - r * 0.6) + rand() * 0.8;
        const idx = Math.abs(Math.floor(n * 3)) % classes.length;
        const x = c * cw, y = r * ch;
        ctx.fillStyle = classes[idx];
        ctx.globalAlpha = x < scan ? 1 : 0.4;
        ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      }
      ctx.globalAlpha = 1;
      const g = ctx.createLinearGradient(scan - 50, 0, scan, 0);
      g.addColorStop(0, hsl(h0 + 70, 100, 70, 0));
      g.addColorStop(1, hsl(h0 + 70, 100, 75, 0.8));
      ctx.fillStyle = g; ctx.fillRect(scan - 50, 0, 50, h);
      ctx.fillStyle = "#fff"; ctx.fillRect(scan - 1, 0, 2, h);
      return;
    }

    if (kind === "regression") {
      const pad = 26;
      ctx.strokeStyle = light ? "rgba(14,18,48,.15)" : "rgba(238,240,255,.14)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = pad + (i * (h - pad * 2)) / 4; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }
      const prog = (Math.sin(t * 0.0009 * speed) + 1) / 2;
      for (let i = 0; i < 46; i++) {
        const xr = rand(), noise = (rand() - 0.5) * 0.38;
        const yr = clamp(0.12 + xr * 0.76 + noise, 0.04, 0.96);
        const x = pad + xr * (w - pad * 2), y = h - pad - yr * (h - pad * 2);
        const ly = h - pad - (0.12 + xr * 0.76) * (h - pad * 2);
        ctx.strokeStyle = hsl(h0 + 150, 90, 65, 0.35 * prog);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, ly); ctx.stroke();
        ctx.fillStyle = hsl(h0 + xr * 120, 90, light ? 52 : 68, 0.9);
        ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
      }
      const lg = ctx.createLinearGradient(pad, 0, w - pad, 0);
      lg.addColorStop(0, hsl(h0, 95, 66)); lg.addColorStop(1, hsl(h0 + 150, 95, 66));
      ctx.strokeStyle = lg; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(pad, h - pad - 0.12 * (h - pad * 2)); ctx.lineTo(w - pad, h - pad - 0.88 * (h - pad * 2)); ctx.stroke();
      return;
    }

    if (kind === "matrix") {
      // correlation-style heatmap with a soft shimmer
      const n = 8, pad = 20, size = Math.min(w, h) - pad * 2, cell = size / n;
      const ox = (w - size) / 2, oy = (h - size) / 2;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const base = i === j ? 1 : Math.abs(Math.sin((i + 1) * (j + 2) * 1.7)) * 0.75;
        const wave = (Math.sin(t * 0.0016 * speed - (i + j) * 0.5) + 1) / 2;
        const v = clamp(base * 0.75 + wave * 0.25, 0, 1);
        ctx.fillStyle = hsl(h0 + v * 150, 85, light ? 92 - v * 45 : 18 + v * 50);
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(ox + i * cell + 2, oy + j * cell + 2, cell - 4, cell - 4, 5) : ctx.rect(ox + i * cell + 2, oy + j * cell + 2, cell - 4, cell - 4);
        ctx.fill();
      }
      return;
    }

    if (kind === "shop") {
      const cols = 4, rows = 2, gap = 12, pad = 18;
      const cw = (w - pad * 2 - gap * (cols - 1)) / cols, ch = (h - pad * 2 - gap) / rows;
      const active = Math.floor(t * 0.0012 * speed) % (cols * rows);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = r * cols + c, x = pad + c * (cw + gap), y = pad + r * (ch + gap);
        const on = k === active;
        ctx.fillStyle = light ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.06)";
        ctx.strokeStyle = on ? hsl(h0 + 70, 95, 62) : (light ? "rgba(14,18,48,.1)" : "rgba(238,240,255,.1)");
        ctx.lineWidth = on ? 2 : 1;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, cw, ch, 10) : ctx.rect(x, y, cw, ch); ctx.fill(); ctx.stroke();
        // a simple shirt shape
        const sx = x + cw / 2, sy = y + ch * 0.42, s = Math.min(cw, ch) * 0.22;
        ctx.fillStyle = hsl(h0 + k * 40, 85, light ? 60 : 66, on ? 1 : 0.75);
        ctx.beginPath();
        ctx.moveTo(sx - s, sy - s * 0.7); ctx.lineTo(sx - s * 0.4, sy - s); ctx.lineTo(sx + s * 0.4, sy - s); ctx.lineTo(sx + s, sy - s * 0.7);
        ctx.lineTo(sx + s * 0.75, sy - s * 0.2); ctx.lineTo(sx + s * 0.55, sy - s * 0.3); ctx.lineTo(sx + s * 0.55, sy + s); ctx.lineTo(sx - s * 0.55, sy + s);
        ctx.lineTo(sx - s * 0.55, sy - s * 0.3); ctx.lineTo(sx - s * 0.75, sy - s * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = light ? "rgba(14,18,48,.25)" : "rgba(238,240,255,.25)";
        ctx.fillRect(x + 10, y + ch - 20, cw * 0.5, 5);
        if (on) { ctx.fillStyle = hsl(h0 + 70, 95, 62); ctx.fillRect(x + 10, y + ch - 11, cw * 0.3, 5); }
      }
      return;
    }

    if (kind === "er") {
      const ents = [["Book", 0.2, 0.25], ["Copy", 0.5, 0.18], ["Member", 0.8, 0.25], ["Borrow", 0.5, 0.55], ["Payment", 0.78, 0.8], ["Vendor", 0.22, 0.8]];
      const rels = [[0, 1], [1, 3], [2, 3], [3, 4], [0, 5], [2, 4]];
      ctx.lineWidth = 1.5;
      rels.forEach(([a, b], i) => {
        const A = ents[a], B = ents[b];
        ctx.strokeStyle = light ? "rgba(14,18,48,.25)" : "rgba(238,240,255,.22)";
        ctx.beginPath(); ctx.moveTo(A[1] * w, A[2] * h); ctx.lineTo(B[1] * w, B[2] * h); ctx.stroke();
        const p = ((t * 0.0004 * speed) + i * 0.17) % 1;
        ctx.fillStyle = hsl(h0 + i * 30, 100, light ? 50 : 70);
        ctx.beginPath(); ctx.arc(lerp(A[1] * w, B[1] * w, p), lerp(A[2] * h, B[2] * h, p), 3.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.font = "700 12px Manrope, Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ents.forEach(([name, x, y], i) => {
        const bw = 74, bh = 30;
        ctx.fillStyle = light ? "#fff" : "#151b3b";
        ctx.strokeStyle = hsl(h0 + i * 30, 90, light ? 50 : 66);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x * w - bw / 2, y * h - bh / 2, bw, bh, 8) : ctx.rect(x * w - bw / 2, y * h - bh / 2, bw, bh);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = light ? "#0e1230" : "#eef0ff";
        ctx.fillText(name, x * w, y * h + 1);
      });
      return;
    }

    if (kind === "fish") {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, light ? "#cfe9ff" : "#0b2a4a"); g.addColorStop(1, light ? "#8fc3f0" : "#06162c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const px = 3;
      const f = fishState;
      // the big fish chases the nearest small fish
      let target = f.small[0], bd = 9;
      f.small.forEach((s) => { const d = Math.hypot(s.x - f.big.x, s.y - f.big.y); if (d < bd) { bd = d; target = s; } });
      f.big.x = lerp(f.big.x, target.x, 0.012 * speed);
      f.big.y = lerp(f.big.y, target.y, 0.012 * speed);
      f.small.forEach((s) => {
        s.x += s.v * speed; if (s.x > 1.05) s.x = -0.05;
        if (Math.hypot((s.x - f.big.x) * w, (s.y - f.big.y) * h) < f.big.r * px) { s.x = -0.05; s.y = 0.15 + Math.random() * 0.7; }
        ctx.fillStyle = hsl(h0 + 120, 90, 65);
        midpointCircle(ctx, Math.round(s.x * w), Math.round(s.y * h), s.r, px);
      });
      ctx.fillStyle = hsl(h0 + 20, 95, 66);
      midpointCircle(ctx, Math.round(f.big.x * w), Math.round(f.big.y * h), f.big.r, px);
      ctx.fillRect(Math.round(f.big.x * w) + 6, Math.round(f.big.y * h) - 6, px * 2, px * 2);
      return;
    }
  }

  /* ---------------------------------------------------------
     JOURNEY timeline: line draws as you scroll
     --------------------------------------------------------- */
  const timeline = $("#timeline");
  const tlFill = $("#timelineFill");
  const tlItems = $$(".tl");
  function onScrollTimeline() {
    if (!timeline) return;
    const r = timeline.getBoundingClientRect();
    const mid = innerHeight * 0.62;
    const p = clamp((mid - r.top) / r.height, 0, 1);
    if (tlFill) tlFill.style.transform = `scaleY(${p})`;
    tlItems.forEach((it) => {
      const d = $(".tl__dot", it).getBoundingClientRect();
      it.classList.toggle("is-on", d.top < mid || reduceMotion);
    });
  }

  /* ---------------------------------------------------------
     SKILLS: physics bubbles you can grab and throw
     --------------------------------------------------------- */
  const SKILLS = [
    ["Python", "lang", 1.35], ["Java", "lang", 1], ["C++", "lang", 1], ["JavaScript", "lang", 1.1], ["SQL", "lang", 1.1],
    ["scikit-learn", "ml", 1.25], ["PyTorch", "ml", 1.2], ["pandas", "ml", 1.15], ["NumPy", "ml", 1.05], ["XGBoost", "ml", 1.05],
    ["Matplotlib", "ml", 1], ["Seaborn", "ml", 0.95], ["Jupyter", "ml", 0.95], ["Colab", "ml", 0.9], ["Looker Studio", "ml", 1],
    ["Django", "web", 1.2], ["HTML", "web", 0.95], ["CSS", "web", 0.9], ["Bootstrap", "web", 0.95], ["jQuery", "web", 0.9],
    ["MySQL", "web", 1.1], ["MariaDB", "web", 1], ["SQLite", "web", 0.95],
    ["Git", "tools", 1], ["GitHub", "tools", 1.05], ["PyOpenGL", "tools", 0.95], ["MS Office", "tools", 0.95], ["Google Workspace", "tools", 1.05], ["Prompt Engineering", "tools", 1.05],
    ["Troubleshooting", "it", 1.1], ["Networking", "it", 1], ["User accounts", "it", 0.95], ["IT support", "it", 1.05],
  ];
  const GROUP_HUE = { lang: 0, ml: 60, web: 130, tools: 205, it: 285 };
  const GROUP_NAME = { lang: "Languages", ml: "ML & data", web: "Web & databases", tools: "Tools", it: "IT" };

  // Accessible list + reduced-motion fallback
  const skillList = $("#skillList");
  if (skillList) {
    const groups = Object.keys(GROUP_NAME);
    skillList.innerHTML = groups.map((g) => `<div><h3 class="soft__title" style="font-size:1rem;margin:10px 0">${GROUP_NAME[g]}</h3><ul class="chips">${SKILLS.filter((s) => s[1] === g).map((s) => `<li>${s[0]}</li>`).join("")}</ul></div>`).join("");
  }

  // Ticker
  const tickerRow = $("#tickerRow");
  if (tickerRow) {
    const items = ["Machine learning", "Data analysis", "Research", "Python", "PyTorch", "scikit-learn", "Django", "SQL", "IT operations", "Project management"];
    const html = items.map((t) => `<span class="ticker__item">${t}<i class="ticker__star"></i></span>`).join("");
    tickerRow.innerHTML = html + html;
  }

  const bubbles = (function () {
    const box = $("#bubbles");
    const canvas = $("#bubbleCanvas");
    if (!box || !canvas || reduceMotion) return null;
    let ctx, W, H;
    let started = false, visible = false;
    let group = "all";
    let grabbed = null, grabOff = { x: 0, y: 0 }, lastP = { x: 0, y: 0, t: 0 }, throwV = { x: 0, y: 0 };
    const local = { x: -999, y: -999, inside: false };
    const balls = [];

    function radiusFor(w) { const base = W < 600 ? clamp(W / 15, 19, 30) : clamp(W / 21, 28, 48); return base * w; }

    function resize() {
      const f = fitCanvas(canvas); ctx = f.ctx; W = f.w; H = f.h;
      balls.forEach((b) => { b.r0 = radiusFor(b.w); });
    }

    function spawn() {
      SKILLS.forEach(([label, g, w], i) => {
        balls.push({
          label, g, w, r0: 0, r: 0,
          x: 60 + Math.random() * (W - 120), y: -40 - i * 18 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 4, vy: 0, scale: 1,
        });
      });
      resize();
      balls.forEach((b) => (b.r = b.r0));
    }

    resize();
    window.addEventListener("resize", resize);
    whenVisible(box, (v) => {
      visible = v;
      if (v && !started) { started = true; spawn(); }
    }, "0px");

    // Filters
    $$(".filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        group = btn.dataset.group;
        $$(".filter").forEach((b) => { const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
        // give the chosen group a little hop
        balls.forEach((b) => { if (group === "all" || b.g === group) { b.vy -= 7 + Math.random() * 5; b.vx += (Math.random() - 0.5) * 6; } });
      });
    });

    function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function pick(p) {
      for (let i = balls.length - 1; i >= 0; i--) { const b = balls[i]; if (Math.hypot(b.x - p.x, b.y - p.y) < b.r) return b; }
      return null;
    }

    canvas.addEventListener("pointerdown", (e) => {
      const p = pos(e);
      const b = pick(p);
      if (!b) return;
      if (e.pointerType === "touch") { b.vy -= 12; b.vx += (Math.random() - 0.5) * 8; return; }
      grabbed = b; grabOff = { x: b.x - p.x, y: b.y - p.y }; lastP = { x: p.x, y: p.y, t: performance.now() };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pos(e);
      local.x = p.x; local.y = p.y; local.inside = true;
      if (grabbed) {
        const now = performance.now(), dt = Math.max(16, now - lastP.t);
        throwV = { x: ((p.x - lastP.x) / dt) * 16, y: ((p.y - lastP.y) / dt) * 16 };
        lastP = { x: p.x, y: p.y, t: now };
        grabbed.x = p.x + grabOff.x; grabbed.y = p.y + grabOff.y;
        grabbed.vx = throwV.x; grabbed.vy = throwV.y;
      }
    });
    canvas.addEventListener("pointerleave", () => (local.inside = false));
    window.addEventListener("pointerup", () => { if (grabbed) { grabbed.vx = throwV.x * 1.3; grabbed.vy = throwV.y * 1.3; } grabbed = null; });

    function step() {
      const G = 0.42, damp = 0.995, bounce = 0.55;
      balls.forEach((b) => {
        const on = group === "all" || b.g === group;
        b.scale = lerp(b.scale, on ? 1 : 0.62, 0.12);
        b.r = b.r0 * b.scale;
        if (b === grabbed) return;
        b.vy += G; b.vx *= damp; b.vy *= damp;
        // cursor pushes bubbles away
        if (local.inside && !grabbed) {
          const dx = b.x - local.x, dy = b.y - local.y, d = Math.hypot(dx, dy);
          if (d < b.r + 40 && d > 0) { const f = (1 - d / (b.r + 40)) * 1.6; b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
        }
        b.x += b.vx; b.y += b.vy;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * bounce; }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * bounce; }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * bounce; b.vx *= 0.96; }
        if (b.y < b.r && b.vy < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * bounce; }
      });
      // circle collisions
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < balls.length; i++) {
          const a = balls[i];
          for (let j = i + 1; j < balls.length; j++) {
            const b = balls[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const min = a.r + b.r + 2;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min || d2 === 0) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, overlap = (min - d) / 2;
            const aFixed = a === grabbed, bFixed = b === grabbed;
            if (!aFixed) { a.x -= nx * overlap * (bFixed ? 2 : 1); a.y -= ny * overlap * (bFixed ? 2 : 1); }
            if (!bFixed) { b.x += nx * overlap * (aFixed ? 2 : 1); b.y += ny * overlap * (aFixed ? 2 : 1); }
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) {
              const imp = -(1 + 0.4) * rv / 2;
              if (!aFixed) { a.vx -= imp * nx; a.vy -= imp * ny; }
              if (!bFixed) { b.vx += imp * nx; b.vy += imp * ny; }
            }
          }
        }
      }
      // keep everything inside the box after collisions
      balls.forEach((b) => {
        if (b === grabbed) return;
        b.x = clamp(b.x, b.r, W - b.r);
        if (b.y > H - b.r) b.y = H - b.r;
      });
    }

    function draw() {
      if (!started || !visible || !ctx) return;
      step();
      const light = isLight();
      const h0 = hue.current;
      ctx.clearRect(0, 0, W, H);
      balls.forEach((b) => {
        const on = group === "all" || b.g === group;
        const hh = h0 + GROUP_HUE[b.g];
        const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
        if (on) {
          g.addColorStop(0, hsl(hh, 100, light ? 72 : 76));
          g.addColorStop(1, hsl(hh + 25, 90, light ? 52 : 52));
        } else {
          g.addColorStop(0, light ? "rgba(14,18,48,.10)" : "rgba(238,240,255,.10)");
          g.addColorStop(1, light ? "rgba(14,18,48,.06)" : "rgba(238,240,255,.05)");
        }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        if (b === grabbed) { ctx.strokeStyle = light ? "#0e1230" : "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
        // label
        const fs = clamp(b.r * 0.34, 9, 17);
        ctx.font = `700 ${fs}px Manrope, Inter, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = on ? "#0a0e1f" : (light ? "rgba(14,18,48,.45)" : "rgba(238,240,255,.4)");
        const words = b.label.split(" ");
        if (words.length > 1 && ctx.measureText(b.label).width > b.r * 1.7) {
          ctx.fillText(words[0], b.x, b.y - fs * 0.55);
          ctx.fillText(words.slice(1).join(" "), b.x, b.y + fs * 0.6);
        } else {
          ctx.fillText(b.label, b.x, b.y + 1);
        }
      });
    }
    return { draw };
  })();

  /* ---------------------------------------------------------
     Copy email
     --------------------------------------------------------- */
  const toast = $("#toast");
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-shown"), 2200);
  }
  // Every email button copies the address. mailto: links fail on computers
  // without a mail app, so copying always works.
  const EMAIL = "omarshafin12@gmail.com";
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }
  $$("[data-copy-email]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const done = () => showToast("Email copied: " + EMAIL);
      const fail = () => (fallbackCopy(EMAIL) ? done() : showToast(EMAIL));
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(EMAIL).then(done, fail);
        else fail();
      } catch (e) { fail(); }
    });
  });

  /* ---------------------------------------------------------
     CV download. On the live site the link downloads normally.
     Inside a Claude preview, downloads go through the viewer.
     --------------------------------------------------------- */
  let downloadsApi = null;
  try {
    if (window.claude && typeof window.claude.use === "function") {
      window.claude.use("downloads").then((ns) => (downloadsApi = ns)).catch(() => {});
    }
  } catch (e) {}
  $$("[data-cv]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (!downloadsApi) return; // normal browser download
      e.preventDefault();
      fetch(link.getAttribute("href"))
        .then((r) => r.blob())
        .then((blob) => downloadsApi.save({ filename: "Mohammad_Omar_Raihan_CV.pdf", data: blob }))
        .then(() => showToast("CV saved"))
        .catch((err) => { if (!err || err.code !== "declined") showToast("Couldn't save the CV here. Try again on the live site."); });
    });
  });

  /* ---------------------------------------------------------
     Small storage helpers (storage can be blocked, so never trust it)
     --------------------------------------------------------- */
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------------------------------------------------------
     WEATHER: live conditions in Dhaka (Open-Meteo, no key needed)
     --------------------------------------------------------- */
  const WX_URL = "https://api.open-meteo.com/v1/forecast?latitude=23.8103&longitude=90.4125" +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
    "&timezone=Asia%2FDhaka&forecast_days=5";

  function wxDescribe(code) {
    if (code === 0) return ["Clear sky", "clear"];
    if (code === 1) return ["Mainly clear", "partly"];
    if (code === 2) return ["Partly cloudy", "partly"];
    if (code === 3) return ["Overcast", "cloudy"];
    if (code === 45 || code === 48) return ["Foggy", "fog"];
    if (code >= 51 && code <= 57) return ["Drizzle", "drizzle"];
    if (code >= 61 && code <= 67) return [code === 61 ? "Light rain" : code >= 65 ? "Heavy rain" : "Rain", "rain"];
    if (code >= 71 && code <= 77) return ["Snow", "snow"];
    if (code >= 80 && code <= 82) return ["Rain showers", "rain"];
    if (code >= 95) return ["Thunderstorm", "storm"];
    return ["Cloudy", "cloudy"];
  }

  function wxIcon(kind, day) {
    const cloud = (cls, tx, ty, s) =>
      `<path class="cloud ${cls}" transform="translate(${tx} ${ty}) scale(${s})" d="M14 36h34a12 12 0 0 0 1-24 17 17 0 0 0-32-3 11 11 0 0 0-3 27z"/>`;
    const sun = (cx, cy, r) => {
      let rays = "";
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        rays += `<line x1="${(cx + Math.cos(a) * (r + 7)).toFixed(1)}" y1="${(cy + Math.sin(a) * (r + 7)).toFixed(1)}" x2="${(cx + Math.cos(a) * (r + 15)).toFixed(1)}" y2="${(cy + Math.sin(a) * (r + 15)).toFixed(1)}"/>`;
      }
      return `<g class="sun-rays" style="transform-origin:${cx}px ${cy}px">${rays}</g><circle class="sun-core" cx="${cx}" cy="${cy}" r="${r}"/>`;
    };
    const moon = (x, y, s) => `<path class="moon" transform="translate(${x} ${y}) scale(${s})" d="M30 2a24 24 0 1 0 22 33A20 20 0 0 1 30 2z"/>` +
      `<circle class="star" cx="${x + 62 * s}" cy="${y + 8 * s}" r="2"/><circle class="star" cx="${x + 70 * s}" cy="${y + 30 * s}" r="1.6"/><circle class="star" cx="${x + 54 * s}" cy="${y + 44 * s}" r="1.4"/>`;
    let inner = "";
    if (kind === "clear") inner = day ? sun(50, 50, 18) : moon(22, 22, 1.05);
    else if (kind === "partly") inner = (day ? sun(36, 36, 14) : moon(14, 12, 0.8)) + `<g class="drift">${cloud("", 26, 38, 1.05)}</g>`;
    else if (kind === "cloudy") inner = `<g class="drift-slow">${cloud("cloud--back", 30, 22, 0.95)}</g><g class="drift">${cloud("", 14, 38, 1.1)}</g>`;
    else if (kind === "fog") inner = `<g class="drift">${cloud("cloud--back", 20, 18, 1.05)}</g><line class="fog-line" x1="18" y1="68" x2="82" y2="68"/><line class="fog-line" x1="26" y1="80" x2="74" y2="80"/>`;
    else if (kind === "drizzle" || kind === "rain") inner = `<g class="drift">${cloud("", 18, 18, 1.1)}</g><line class="drop" x1="36" y1="66" x2="33" y2="76"/><line class="drop" x1="52" y1="66" x2="49" y2="76"/><line class="drop" x1="68" y1="66" x2="65" y2="76"/>`;
    else if (kind === "storm") inner = `<g class="drift">${cloud("cloud--back", 18, 16, 1.1)}</g><path class="bolt" d="M52 54l-12 20h10l-6 18 18-26H51l7-12z"/><line class="drop" x1="32" y1="66" x2="29" y2="76"/><line class="drop" x1="72" y1="66" x2="69" y2="76"/>`;
    else if (kind === "snow") inner = `<g class="drift">${cloud("", 18, 18, 1.1)}</g><circle class="flake" cx="36" cy="72" r="3"/><circle class="flake" cx="52" cy="72" r="3"/><circle class="flake" cx="68" cy="72" r="3"/>`;
    return `<svg class="wxi" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  }

  (function weatherWidget() {
    const box = $("#wx");
    if (!box) return;
    const el = (id) => document.getElementById(id);
    const chip = el("heroWx");
    const fmtTime = (iso) => {
      // "2026-10-10T05:51" -> "5:51 am"
      const [h, m] = iso.slice(11, 16).split(":").map(Number);
      return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
    };
    const dhakaNow = () => {
      try { return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date()); }
      catch (e) { return ""; }
    };

    function skyFor(kind, day) {
      const p = day ? "day-" : "night-";
      if (kind === "storm") return p + "storm";
      if (kind === "rain" || kind === "drizzle") return p + "rain";
      if (kind === "fog") return day ? "day-fog" : "night-cloudy";
      if (kind === "clear" || kind === "partly") return p + "clear";
      return p + "cloudy";
    }

    function render(data, note) {
      const c = data.current, d = data.daily;
      const [label, kind] = wxDescribe(c.weather_code);
      const day = c.is_day === 1;
      box.dataset.sky = skyFor(kind, day);
      el("wxIcon").innerHTML = wxIcon(kind, day);
      el("wxTemp").textContent = Math.round(c.temperature_2m);
      el("wxCond").textContent = label;
      el("wxFeels").textContent = `Feels like ${Math.round(c.apparent_temperature)}°C`;
      el("wxHum").textContent = `${Math.round(c.relative_humidity_2m)}%`;
      el("wxWind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
      el("wxRain").textContent = d.precipitation_probability_max && d.precipitation_probability_max[0] != null ? `${d.precipitation_probability_max[0]}%` : "–";
      el("wxSun").textContent = `${fmtTime(d.sunrise[0])} · ${fmtTime(d.sunset[0])}`;
      el("wxDays").innerHTML = d.time.map((date, i) => {
        const [dl, dk] = wxDescribe(d.weather_code[i]);
        let name = "Today";
        if (i > 0) {
          try { name = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z")); } catch (e) { name = date.slice(5); }
        }
        const rain = d.precipitation_probability_max ? d.precipitation_probability_max[i] : null;
        return `<li class="wx__day" title="${dl}">
          <span class="wx__day-name">${name}</span>
          ${wxIcon(dk, true)}
          <span class="wx__day-temp">${Math.round(d.temperature_2m_max[i])}°<span>${Math.round(d.temperature_2m_min[i])}°</span></span>
          <span class="wx__day-rain">${rain != null ? rain + "% rain" : dl}</span>
        </li>`;
      }).join("");
      el("wxUpdated").textContent = note || `Updated ${dhakaNow()} Dhaka time`;
      box.dataset.state = "ready";
      if (chip) {
        chip.innerHTML = `${wxIcon(kind, day)}<span>${Math.round(c.temperature_2m)}°C ${label}</span>`;
        chip.hidden = false;
        chip.setAttribute("aria-label", `Dhaka weather: ${Math.round(c.temperature_2m)} degrees, ${label}. Open forecast`);
      }
    }

    function showError() {
      box.dataset.state = "error";
      box.dataset.sky = "day-cloudy";
      el("wxIcon").innerHTML = wxIcon("cloudy", true);
      el("wxTemp").textContent = "--";
      // The Claude preview blocks outside websites, so explain that case plainly
      const inPreview = !!(window.claude && typeof window.claude.use === "function");
      el("wxCond").textContent = inPreview ? "Live weather is off in this preview" : "Live weather isn't available right now";
      el("wxFeels").textContent = "";
      el("wxUpdated").textContent = inPreview
        ? "This preview can't contact outside websites. Open the website itself and the live Dhaka weather loads automatically."
        : "Couldn't reach the weather service. Check your connection, then press Refresh.";
      if (chip) chip.hidden = true;
    }

    let busy = false;
    function load(force) {
      const cached = store.get("or-wx-v1");
      if (!force && cached && Date.now() - cached.t < 10 * 60 * 1000) { render(cached.data); return; }
      if (busy) return;
      busy = true;
      box.classList.add("is-busy");
      const ctrl = "AbortController" in window ? new AbortController() : null;
      const timer = setTimeout(() => ctrl && ctrl.abort(), 9000);
      fetch(WX_URL, ctrl ? { signal: ctrl.signal } : {})
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then((data) => {
          if (!data || !data.current || !data.daily) throw new Error("bad data");
          store.set("or-wx-v1", { t: Date.now(), data });
          render(data);
        })
        .catch(() => {
          if (cached) {
            const t = new Date(cached.t);
            let when = "";
            try { when = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(t); } catch (e) {}
            render(cached.data, `Showing the reading from ${when}. Press Refresh to try again.`);
          } else {
            showError();
          }
        })
        .finally(() => { clearTimeout(timer); busy = false; box.classList.remove("is-busy"); });
    }

    const refresh = el("wxRefresh");
    if (refresh) refresh.addEventListener("click", () => load(true));
    load(false);
    setInterval(() => { if (!document.hidden) load(true); }, 10 * 60 * 1000);
  })();

  /* ---------------------------------------------------------
     PLAY: three mini games
     --------------------------------------------------------- */
  const games = (function () {
    const section = $("#play");
    if (!section) return null;
    const stops = [];

    /* ---- tabs ---- */
    const tabs = $$(".arcade__tab", section);
    function selectTab(tab) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      stops.forEach((fn) => fn());
      window.dispatchEvent(new Event("resize"));
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => selectTab(t));
      t.addEventListener("keydown", (e) => {
        let j = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + tabs.length) % tabs.length;
        if (j !== null) { e.preventDefault(); tabs[j].focus(); selectTab(tabs[j]); }
      });
    });

    const setMsg = (el, text, kind) => {
      el.textContent = text;
      el.classList.toggle("is-good", kind === "good");
      el.classList.toggle("is-bad", kind === "bad");
    };

    /* ---- Game 1: Fit the line ---- */
    const fit = (function () {
      const canvas = $("#fitCanvas");
      if (!canvas) return null;
      const r2El = $("#fitR2"), bestEl = $("#fitBest"), scoreEl = $("#fitScore"), msg = $("#fitMsg");
      const showBtn = $("#fitShow"), newBtn = $("#fitNew");
      const XL = 0.06, XR = 0.94, PAD = 26;
      let ctx, W, H, pts = [], hL = 0.5, hR = 0.5, best = { a: 0, b: 0, r2: 0 }, showBest = false, touched = false, drag = null, visible = false;

      const X = (x) => PAD + x * (W - PAD * 2);
      const Y = (y) => H - PAD - y * (H - PAD * 2);
      const invY = (py) => (H - PAD - py) / (H - PAD * 2);
      const lineY = (x) => hL + ((hR - hL) * (x - XL)) / (XR - XL);

      function newData() {
        const r = Math.random;
        const slope = (0.35 + r() * 0.75) * (r() < 0.5 ? -1 : 1);
        const icpt = slope > 0 ? 0.08 + r() * 0.2 : 0.75 + r() * 0.15;
        pts = [];
        for (let i = 0; i < 16; i++) {
          const x = clamp(0.06 + (i / 15) * 0.88 + (r() - 0.5) * 0.03, 0.03, 0.97);
          const y = clamp(icpt + slope * x * 0.85 + (r() - 0.5) * 0.26, 0.04, 0.96);
          pts.push({ x, y });
        }
        const n = pts.length;
        const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
        let sxy = 0, sxx = 0, sst = 0;
        pts.forEach((p) => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; sst += (p.y - my) ** 2; });
        const b = sxy / sxx, a = my - b * mx;
        let ssr = 0;
        pts.forEach((p) => (ssr += (p.y - (a + b * p.x)) ** 2));
        best = { a, b, r2: 1 - ssr / sst, sst, my };
        hL = 0.5; hR = 0.5; touched = false; showBest = false;
        showBtn.setAttribute("aria-pressed", "false");
        showBtn.textContent = "Show best fit";
        bestEl.textContent = best.r2.toFixed(2);
        update();
      }

      function userR2() {
        let ssr = 0;
        pts.forEach((p) => (ssr += (p.y - lineY(p.x)) ** 2));
        return 1 - ssr / best.sst;
      }

      function update() {
        const r2 = userR2();
        r2El.textContent = r2 < -9.99 ? "< -9" : r2.toFixed(2);
        const pct = Math.round(clamp(r2 / best.r2, 0, 1) * 100);
        scoreEl.textContent = pct + "%";
        if (!touched) setMsg(msg, "Move a handle to start.");
        else if (pct >= 98) setMsg(msg, "Spot on. That's the least-squares line.", "good");
        else if (pct >= 90) setMsg(msg, "Very close. Fine-tune a little more.", "good");
        else if (pct >= 70) setMsg(msg, "Getting there. Follow the middle of the cloud.");
        else setMsg(msg, "Keep adjusting. Try to make the error lines short.", "bad");
      }

      function resize() { const f = fitCanvas(canvas); ctx = f.ctx; W = f.w; H = f.h; }

      function draw() {
        if (!ctx || !visible || canvas.offsetParent === null) return;
        const light = isLight();
        const h0 = hue.current;
        ctx.clearRect(0, 0, W, H);
        // grid
        ctx.strokeStyle = light ? "rgba(14,18,48,.08)" : "rgba(238,240,255,.08)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
          const gx = PAD + (i * (W - PAD * 2)) / 5, gy = PAD + (i * (H - PAD * 2)) / 5;
          ctx.beginPath(); ctx.moveTo(gx, PAD); ctx.lineTo(gx, H - PAD); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(PAD, gy); ctx.lineTo(W - PAD, gy); ctx.stroke();
        }
        // residuals
        ctx.strokeStyle = hsl(h0 + 150, 90, light ? 45 : 70, 0.5);
        ctx.setLineDash([3, 4]);
        pts.forEach((p) => { ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y)); ctx.lineTo(X(p.x), Y(lineY(p.x))); ctx.stroke(); });
        ctx.setLineDash([]);
        // best fit
        if (showBest) {
          ctx.strokeStyle = light ? "rgba(14,18,48,.55)" : "rgba(238,240,255,.6)";
          ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.moveTo(X(0), Y(best.a)); ctx.lineTo(X(1), Y(best.a + best.b)); ctx.stroke();
          ctx.setLineDash([]);
        }
        // user line
        const g = ctx.createLinearGradient(X(0), 0, X(1), 0);
        g.addColorStop(0, hsl(h0, 95, light ? 52 : 66)); g.addColorStop(1, hsl(h0 + 150, 95, light ? 45 : 66));
        ctx.strokeStyle = g; ctx.lineWidth = 3.5; ctx.lineCap = "round";
        const yAt = (x) => hL + ((hR - hL) * (x - XL)) / (XR - XL);
        ctx.beginPath(); ctx.moveTo(X(0), Y(yAt(0))); ctx.lineTo(X(1), Y(yAt(1))); ctx.stroke();
        // points
        pts.forEach((p, i) => {
          ctx.fillStyle = hsl(h0 + 40 + i * 6, 90, light ? 50 : 68);
          ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 6, 0, Math.PI * 2); ctx.fill();
        });
        // handles
        [[XL, hL, 0], [XR, hR, 1]].forEach(([x, y, k]) => {
          const cx = X(x), cy = Y(y);
          ctx.fillStyle = hsl(h0 + k * 150, 95, light ? 52 : 66, 0.25);
          ctx.beginPath(); ctx.arc(cx, cy, drag === k ? 22 : 18, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = light ? "#fff" : "#0a0e1f";
          ctx.strokeStyle = hsl(h0 + k * 150, 95, light ? 50 : 66);
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          if (!touched) {
            ctx.fillStyle = light ? "rgba(14,18,48,.6)" : "rgba(238,240,255,.75)";
            ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx - 6, cy - 22); ctx.lineTo(cx + 6, cy - 22); ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx, cy + 30); ctx.lineTo(cx - 6, cy + 22); ctx.lineTo(cx + 6, cy + 22); ctx.fill();
          }
        });
      }

      function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      canvas.addEventListener("pointerdown", (e) => {
        const p = pos(e);
        const dL = Math.hypot(p.x - X(XL), p.y - Y(hL)), dR = Math.hypot(p.x - X(XR), p.y - Y(hR));
        if (Math.min(dL, dR) < 40) drag = dL < dR ? 0 : 1;
        else drag = p.x < W / 2 ? 0 : 1;
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        move(p);
      });
      function move(p) {
        if (drag === null) return;
        const y = clamp(invY(p.y), -0.1, 1.1);
        if (drag === 0) hL = y; else hR = y;
        touched = true;
        update();
      }
      canvas.addEventListener("pointermove", (e) => move(pos(e)));
      const up = () => (drag = null);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);

      showBtn.addEventListener("click", () => {
        showBest = !showBest;
        showBtn.setAttribute("aria-pressed", String(showBest));
        showBtn.textContent = showBest ? "Hide best fit" : "Show best fit";
      });
      newBtn.addEventListener("click", newData);

      resize();
      window.addEventListener("resize", resize);
      whenVisible(canvas, (v) => { visible = v; if (v) resize(); });
      newData();
      return { draw };
    })();

    /* ---- Game 2: Bit flipper ---- */
    (function bitFlipper() {
      const wrap = $("#bits");
      if (!wrap) return;
      const weights = [128, 64, 32, 16, 8, 4, 2, 1];
      const stage = $(".game__stage--bits");
      const scoreEl = $("#bitsScore"), timeEl = $("#bitsTime"), bestEl = $("#bitsBest"), msg = $("#bitsMsg");
      const targetEl = $("#bitsTarget"), valueEl = $("#bitsValue"), startBtn = $("#bitsStart");
      let value = 0, target = 0, score = 0, time = 60, running = false, timer = null, best = store.get("or-bits-best", 0);
      bestEl.textContent = best;

      const btns = weights.map((w, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "bit"; b.disabled = true;
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-label", `Bit worth ${w}`);
        b.innerHTML = `<span class="bit__v">0</span><span class="bit__w">${w}</span>`;
        b.addEventListener("click", () => toggle(i));
        wrap.appendChild(b);
        return b;
      });

      function paint() {
        btns.forEach((b, i) => {
          const on = (value & weights[i]) !== 0;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-pressed", String(on));
          b.firstChild.textContent = on ? "1" : "0";
        });
        valueEl.textContent = value;
      }
      function newTarget() {
        let t;
        do { t = 1 + Math.floor(Math.random() * 255); } while (t === target);
        target = t; targetEl.textContent = target;
        value = 0; paint();
      }
      function toggle(i) {
        if (!running) return;
        value ^= weights[i];
        paint();
        if (value === target) {
          score++; scoreEl.textContent = score;
          setMsg(msg, `Correct. ${target} is ${target.toString(2).padStart(8, "0")} in binary.`, "good");
          stage.classList.remove("is-solved"); void stage.offsetWidth; stage.classList.add("is-solved");
          btns.forEach((b) => (b.disabled = true));
          setTimeout(() => { if (running) { btns.forEach((b) => (b.disabled = false)); newTarget(); } }, 450);
        }
      }
      function end(silent) {
        if (!running) return;
        running = false; clearInterval(timer);
        btns.forEach((b) => (b.disabled = true));
        startBtn.textContent = "Play again";
        if (silent) { setMsg(msg, "Game paused. Press Play again to start over."); return; }
        if (score > best) { best = score; store.set("or-bits-best", best); bestEl.textContent = best; setMsg(msg, `Time's up. New best: ${score} solved!`, "good"); }
        else setMsg(msg, `Time's up. You solved ${score}. Best is ${best}.`);
      }
      function start() {
        running = true; score = 0; time = 60;
        scoreEl.textContent = 0; timeEl.textContent = "60s";
        btns.forEach((b) => (b.disabled = false));
        startBtn.textContent = "Restart";
        setMsg(msg, "Go! Flip bits to match the target.");
        newTarget();
        clearInterval(timer);
        timer = setInterval(() => {
          time--; timeEl.textContent = time + "s";
          if (time <= 0) end(false);
        }, 1000);
        btns[0].focus({ preventScroll: true });
      }
      startBtn.addEventListener("click", () => { if (running) end(true); start(); });
      stops.push(() => end(true));
    })();

    /* ---- Game 3: Bug hunt ---- */
    (function bugHunt() {
      const grid = $("#racks");
      if (!grid) return;
      const scoreEl = $("#bugsScore"), healthEl = $("#bugsHealth"), bestEl = $("#bugsBest"), msg = $("#bugsMsg");
      const timeEl = $("#bugsTime"), startBtn = $("#bugsStart"), bar = $("#bugsBar"), barWrap = bar.parentElement;
      const BUG = `<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="23" rx="10" ry="12"/><circle cx="20" cy="9" r="5.5"/><path d="M10 17L3 12M10 23H2M10 29l-7 5M30 17l7-5M30 23h8M30 29l7 5M17 5l-3-4M23 5l3-4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M20 12v23" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>`;
      let score = 0, health = 100, time = 40, running = false, spawnT = null, tickT = null, best = store.get("or-bugs-best", 0);
      const lives = new Map();
      bestEl.textContent = best;

      const racks = [];
      for (let i = 0; i < 16; i++) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "rack";
        b.setAttribute("aria-label", `Server ${i + 1}`);
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); hit(i); });
        b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(i); } });
        grid.appendChild(b); racks.push(b);
      }

      function paintHealth() {
        healthEl.textContent = health + "%";
        bar.style.width = health + "%";
        barWrap.classList.toggle("is-low", health <= 30);
      }
      function clearBug(i) {
        const r = racks[i];
        r.classList.remove("has-bug");
        r.innerHTML = "";
        r.setAttribute("aria-label", `Server ${i + 1}`);
        clearTimeout(lives.get(i)); lives.delete(i);
      }
      function spawn() {
        if (!running) return;
        const free = racks.map((r, i) => i).filter((i) => !lives.has(i));
        if (free.length) {
          const i = free[Math.floor(Math.random() * free.length)];
          const r = racks[i];
          r.classList.add("has-bug");
          r.innerHTML = `<span class="bug">${BUG}</span>`;
          r.setAttribute("aria-label", `Server ${i + 1}, bug found. Press to fix`);
          const life = Math.max(800, 1600 - score * 22);
          lives.set(i, setTimeout(() => {
            clearBug(i);
            if (!running) return;
            health = Math.max(0, health - 10); paintHealth();
            setMsg(msg, "A bug got away!", "bad");
            if (health <= 0) end("crash");
          }, life));
        }
        spawnT = setTimeout(spawn, Math.max(380, 900 - score * 16));
      }
      function hit(i) {
        if (!running) return;
        const r = racks[i];
        if (lives.has(i)) {
          clearBug(i);
          score++; scoreEl.textContent = score;
          r.classList.remove("is-fixed"); void r.offsetWidth; r.classList.add("is-fixed");
          if (score % 5 === 0) setMsg(msg, `${score} bugs fixed. They're getting faster.`, "good");
        } else {
          r.classList.remove("is-miss"); void r.offsetWidth; r.classList.add("is-miss");
        }
      }
      function end(reason) {
        if (!running) return;
        running = false;
        clearTimeout(spawnT); clearInterval(tickT);
        [...lives.keys()].forEach(clearBug);
        startBtn.textContent = "Play again";
        if (reason === "pause") { setMsg(msg, "Game paused. Press Play again to start over."); return; }
        const lead = reason === "crash" ? "System crashed." : "Time's up.";
        if (score > best) { best = score; store.set("or-bugs-best", best); bestEl.textContent = best; setMsg(msg, `${lead} New best: ${score} bugs fixed!`, "good"); }
        else setMsg(msg, `${lead} You fixed ${score}. Best is ${best}.`, reason === "crash" ? "bad" : undefined);
      }
      function start() {
        running = true; score = 0; health = 100; time = 40;
        scoreEl.textContent = 0; timeEl.textContent = "40s"; paintHealth();
        startBtn.textContent = "Restart";
        setMsg(msg, "Servers online. Watch for bugs!");
        clearTimeout(spawnT); clearInterval(tickT);
        spawnT = setTimeout(spawn, 500);
        tickT = setInterval(() => { time--; timeEl.textContent = time + "s"; if (time <= 0) end("time"); }, 1000);
      }
      startBtn.addEventListener("click", () => { if (running) end("pause"); start(); });
      stops.push(() => end("pause"));
      paintHealth();
    })();

    // stop running games when the section scrolls far away
    whenVisible(section, (v) => { if (!v) stops.forEach((fn) => fn()); }, "200px");

    return { draw: () => fit && fit.draw() };
  })();

  /* ---------------------------------------------------------
     Main loop: scroll-driven updates + animations
     --------------------------------------------------------- */
  const progressBar = $("#progressBar");
  let lastScroll = -1;

  function onScroll() {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = y / max;
    if (progressBar) progressBar.style.transform = `scaleX(${p})`;
    onScrollHeader(y);
    onScrollScrub();
    onScrollTimeline();
    if (work) work.onScroll();
    // hue target: cursor sweeps a 120° band, scrolling travels the full spectrum
    hue.scroll = p;
  }

  function loop(t) {
    const y = window.scrollY;
    if (y !== lastScroll) { lastScroll = y; onScroll(); }

    hue.target = 235 + (mouse.nx - 0.5) * 120 + (hue.scroll || 0) * 200;
    hue.current = reduceMotion ? hue.target : lerp(hue.current, hue.target, 0.04);
    root.style.setProperty("--h", hue.current.toFixed(1));

    updateCursor();
    updateAurora(t);
    if (hero) hero.draw(t);
    if (grn) grn.draw(t);
    if (work) work.frame();
    arts.forEach((a) => { if (a.visible) drawArt(a, t); });
    if (bubbles) bubbles.draw();
    if (games) games.draw();
    requestAnimationFrame(loop);
  }

  // Draw card art once even if motion is reduced
  if (reduceMotion) arts.forEach((a) => drawArt(a, 1000));
  onScroll();
  requestAnimationFrame(loop);

  window.addEventListener("resize", () => { lastScroll = -1; });
})();
