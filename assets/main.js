/* Trama — disegni e piccoli movimenti del sito.
   - vaso in apertura che si stampa strato per strato
   - quattro forme del generatore (girano al passaggio del mouse)
   - primo piano della texture a trama
   - modulo contatti
   Tutto rispetta prefers-reduced-motion e il tema chiaro/scuro. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkMq = window.matchMedia("(prefers-color-scheme: dark)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var TAU = Math.PI * 2;

  /* ---------- colori dal CSS ---------- */
  var C = {};
  function hexToRgb(h) {
    h = h.trim().replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function readColors() {
    var s = getComputedStyle(root);
    function v(name) { return s.getPropertyValue(name).trim() || "#888888"; }
    C.lit = hexToRgb(v("--fil-lit"));
    C.shade = hexToRgb(v("--fil-shade"));
    C.accent = v("--accent");
    C.ink = v("--ink");
    C.plate = v("--plate");
    C.grid = v("--plate-grid");
    C.bins = [];
    for (var b = 0; b < BINS; b++) {
      var t = b / (BINS - 1);
      C.bins.push("rgb(" + [0, 1, 2].map(function (k) {
        return Math.round(C.shade[k] + (C.lit[k] - C.shade[k]) * t);
      }).join(",") + ")");
    }
  }
  var BINS = 8;

  /* ---------- utilità ---------- */
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function profile(ctrl, t) {
    // Catmull-Rom sui punti di controllo del profilo (raggio relativo per altezza)
    var n = ctrl.length - 1, x = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
    var p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n, i + 2)];
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  }
  function rng(seed) {
    return function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }

  /* ---------- texture Voronoi su cilindro ---------- */
  function makeVoronoi(count, seed) {
    var r = rng(seed), pts = [];
    for (var i = 0; i < count; i++) pts.push([r(), r() * 1.5]);
    return function (th, t) {
      var u = ((th / TAU) % 1 + 1) % 1, v = t * 1.5, d1 = 9, d2 = 9;
      for (var i = 0; i < pts.length; i++) {
        var du = Math.abs(u - pts[i][0]); if (du > 0.5) du = 1 - du;
        var dv = v - pts[i][1], d = Math.sqrt(du * du * 2.2 + dv * dv);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
      }
      return 0.05 * (1 - smooth(0, 0.05, d2 - d1));
    };
  }

  /* ---------- le forme ---------- */
  var STYLES = {
    // apertura: texture "a trama", la fase si inverte ogni 4 strati come un tessuto
    trama: {
      ctrl: [0.60, 0.84, 0.96, 0.84, 0.66, 0.72], layers: 150, samples: 150,
      tex: function (th, t, i) { return 0.024 * Math.sin(36 * th + (Math.floor(i / 4) % 2) * Math.PI); }
    },
    spirale: {
      ctrl: [0.56, 0.74, 0.88, 0.82, 0.62, 0.70], layers: 110, samples: 110,
      tex: function (th, t) { var c = 0.5 + 0.5 * Math.cos(12 * (th + t * 2.094)); return 0.06 * c * c; }
    },
    onde: {
      ctrl: [0.70, 0.92, 0.80, 0.66, 0.72, 0.86], layers: 110, samples: 110,
      tex: function (th, t) { return 0.04 * Math.sin(7 * th) * Math.sin(t * Math.PI * 6); }
    },
    voronoi: {
      ctrl: [0.58, 0.84, 0.92, 0.84, 0.64, 0.62], layers: 110, samples: 110,
      tex: makeVoronoi(28, 7)
    },
    costine: {
      ctrl: [0.52, 0.56, 0.62, 0.72, 0.86, 0.98], layers: 110, samples: 120,
      tex: function (th) { return 0.05 * Math.pow(Math.abs(Math.cos(9 * th)), 6); }
    }
  };

  /* ---------- tela con densità di pixel corretta ---------- */
  function fit(canvas) {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, W: r.width, H: r.height };
  }

  /* ---------- disegno di un vaso a strati ----------
     opts.progress: 0..1 quanto è stato stampato; opts.rot: rotazione; opts.plate: piatto di stampa */
  var LIGHT = Math.PI / 2 + 0.75; // luce da davanti a sinistra

  function drawVase(canvas, style, opts) {
    var f = fit(canvas), ctx = f.ctx, W = f.W, H = f.H;
    var S = STYLES[style];
    var progress = opts.progress == null ? 1 : opts.progress;
    var rot = opts.rot || 0;
    var N = S.layers, M = S.samples;
    var k = 0.26;                                  // schiacciamento dell'ellisse (vista dall'alto)
    var Hv = H * (opts.plate ? 0.60 : 0.66);       // altezza del vaso
    var R = Math.min(W * 0.30, Hv * 0.40);         // raggio massimo
    var baseY = H * (opts.plate ? 0.80 : 0.86);
    var cx = W / 2;
    var gap = Hv / N;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (opts.plate) {
      var rx = Math.min(W * 0.46, R * 2.1), ry = rx * k;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, baseY, rx, ry, 0, 0, TAU);
      ctx.fillStyle = C.plate; ctx.fill();
      ctx.clip();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var g = -6; g <= 6; g++) {
        var gx = cx + (g / 6) * rx;
        ctx.moveTo(gx, baseY - ry); ctx.lineTo(gx, baseY + ry);
        var gy = baseY + (g / 6) * ry;
        ctx.moveTo(cx - rx, gy); ctx.lineTo(cx + rx, gy);
      }
      ctx.stroke();
      ctx.restore();
    }

    var total = progress * N;
    var done = Math.floor(total);                  // strati completi
    var frac = total - done;                       // avanzamento dello strato in corso
    if (progress >= 1) { done = N; frac = 0; }

    var paths = [];
    for (var b = 0; b < BINS; b++) paths.push(new Path2D());
    var rs = new Float32Array(M + 3), xs = new Float32Array(M + 1), ys = new Float32Array(M + 1);

    function radiusAt(th, t, i) { return R * (profile(S.ctrl, t) + S.tex(th - rot, t, i)); }

    for (var i = 0; i < done; i++) {
      var t = i / (N - 1), y = baseY - t * Hv;
      var dth = Math.PI / M;
      for (var j = -1; j <= M + 1; j++) rs[j + 1] = radiusAt(j * dth, t, i);
      for (j = 0; j <= M; j++) {
        var th = j * dth, r = rs[j + 1];
        xs[j] = cx + r * Math.cos(th);
        ys[j] = y + k * r * Math.sin(th);
      }
      var lastBin = -1;
      for (j = 0; j < M; j++) {
        var thm = (j + 0.5) * dth;
        var rm = (rs[j + 1] + rs[j + 2]) * 0.5;
        var dr = (rs[j + 2] - rs[j + 1]) / dth;
        var phi = thm - Math.atan2(dr, rm);
        var inten = 0.12 + 0.88 * Math.max(0, Math.cos(phi - LIGHT));
        var bin = Math.min(BINS - 1, Math.floor(inten * BINS));
        var p = paths[bin];
        if (bin !== lastBin) p.moveTo(xs[j], ys[j]);
        p.lineTo(xs[j + 1], ys[j + 1]);
        lastBin = bin;
      }
    }

    ctx.lineWidth = Math.max(0.8, gap * 0.62);
    for (b = 0; b < BINS; b++) { ctx.strokeStyle = C.bins[b]; ctx.stroke(paths[b]); }

    // bordo posteriore dell'ultimo strato completo: mostra l'apertura del vaso
    if (done > 0) {
      var ti = done - 1, tt = ti / (N - 1), yy = baseY - tt * Hv;
      ctx.beginPath();
      for (j = 0; j <= M; j++) {
        var thb = Math.PI + j * Math.PI / M, rb = radiusAt(thb, tt, ti);
        var bx = cx + rb * Math.cos(thb), by = yy + k * rb * Math.sin(thb);
        if (j === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
      }
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = C.bins[2];
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // strato in stampa e ugello
    if (opts.nozzle && done < N) {
      var tc = done / (N - 1), yc = baseY - tc * Hv;
      var end = frac * TAU, steps = Math.max(2, Math.round(frac * M * 2));
      ctx.beginPath();
      var nx = cx, ny = yc;
      for (j = 0; j <= steps; j++) {
        var thc = Math.PI / 2 + (j / steps) * end;
        var rc = radiusAt(thc, tc, done);
        nx = cx + rc * Math.cos(thc); ny = yc + k * rc * Math.sin(thc);
        if (j === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny);
      }
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = Math.max(1.2, gap * 0.8);
      ctx.stroke();
      // ugello
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(nx - 7, ny - 26); ctx.lineTo(nx + 7, ny - 26);
      ctx.lineTo(nx + 7, ny - 12); ctx.lineTo(nx + 2.5, ny - 4);
      ctx.lineTo(nx - 2.5, ny - 4); ctx.lineTo(nx - 7, ny - 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.arc(nx, ny, 2.6, 0, TAU); ctx.fill();
    }
  }

  /* ---------- apertura: il vaso che si stampa ---------- */
  var hero = document.getElementById("heroVase");
  var readout = document.getElementById("heroReadout");
  var reprint = document.getElementById("reprint");
  var REAL_LAYERS = 900, LAYER_MM = 0.2, PRINT_MS = 5600;
  var heroProgress = 1, heroRaf = 0, heroStart = 0;

  function fmt(n, d) { return n.toFixed(d).replace(".", ","); }
  function setReadout(p) {
    if (!readout) return;
    if (p >= 1) { readout.textContent = REAL_LAYERS + " strati · " + fmt(REAL_LAYERS * LAYER_MM, 0) + " mm · modalità vaso"; return; }
    var L = Math.max(1, Math.round(p * REAL_LAYERS));
    readout.textContent = "strato " + L + " / " + REAL_LAYERS + " · " + fmt(L * LAYER_MM, 1) + " mm";
  }
  function drawHero() {
    if (!hero) return;
    drawVase(hero, "trama", { progress: heroProgress, plate: true, nozzle: true });
    setReadout(heroProgress);
  }
  function printFrame(now) {
    if (!heroStart) heroStart = now;
    heroProgress = clamp((now - heroStart) / PRINT_MS, 0, 1);
    drawHero();
    if (heroProgress < 1) heroRaf = requestAnimationFrame(printFrame);
    else heroRaf = 0;
  }
  function startPrint() {
    cancelAnimationFrame(heroRaf);
    if (reduceMq.matches) { heroProgress = 1; drawHero(); return; }
    heroStart = 0; heroProgress = 0.04;
    heroRaf = requestAnimationFrame(printFrame);
  }
  if (reprint) reprint.addEventListener("click", startPrint);

  /* ---------- forme del generatore ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll(".form-card canvas"));
  var cardRot = new Map();
  function drawCard(c) { drawVase(c, c.dataset.style, { rot: cardRot.get(c) || 0 }); }
  cards.forEach(function (c) {
    cardRot.set(c, 0);
    if (!finePointer) return;
    var raf = 0, last = 0;
    function spin(now) {
      if (last) cardRot.set(c, cardRot.get(c) + (now - last) * 0.0009);
      last = now;
      drawCard(c);
      raf = requestAnimationFrame(spin);
    }
    c.addEventListener("pointerenter", function () {
      if (reduceMq.matches) return;
      last = 0; raf = requestAnimationFrame(spin);
    });
    c.addEventListener("pointerleave", function () { cancelAnimationFrame(raf); raf = 0; });
  });

  /* ---------- primo piano della trama ---------- */
  var fabric = document.getElementById("fabric");
  var fabricPhase = 0, fabricRaf = 0, fabricVisible = false, fabricLast = 0;
  function drawFabric() {
    if (!fabric) return;
    var f = fit(fabric), ctx = f.ctx, W = f.W, H = f.H;
    ctx.clearRect(0, 0, W, H);
    var rows = 14, gap = H / (rows + 1), amp = gap * 0.28, freq = TAU / (W / 7);
    var paths = [];
    for (var b = 0; b < BINS; b++) paths.push(new Path2D());
    var step = 3;
    for (var i = 0; i < rows; i++) {
      var y0 = gap * (i + 1), ph = (Math.floor(i / 3) % 2) * Math.PI + fabricPhase;
      var lastBin = -1, px = 0, py = y0 + amp * Math.sin(ph);
      for (var x = step; x <= W + step; x += step) {
        var a = freq * x + ph, y = y0 + amp * Math.sin(a);
        var slope = Math.cos(a);                        // -1..1
        var inten = clamp(0.55 - 0.45 * slope + 0.1 * Math.sin(a), 0, 1);
        var bin = Math.min(BINS - 1, Math.floor(inten * BINS));
        if (bin !== lastBin) paths[bin].moveTo(px, py);
        paths[bin].lineTo(x, y);
        lastBin = bin; px = x; py = y;
      }
    }
    ctx.lineCap = "round";
    ctx.lineWidth = gap * 0.78;
    for (b = 0; b < BINS; b++) { ctx.strokeStyle = C.bins[b]; ctx.stroke(paths[b]); }
  }
  function fabricLoop(now) {
    if (fabricLast) fabricPhase -= (now - fabricLast) * 0.00035;
    fabricLast = now;
    drawFabric();
    if (fabricVisible && !reduceMq.matches) fabricRaf = requestAnimationFrame(fabricLoop);
    else { fabricRaf = 0; fabricLast = 0; }
  }
  if (fabric && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      fabricVisible = entries[0].isIntersecting;
      if (fabricVisible && !fabricRaf && !reduceMq.matches) fabricRaf = requestAnimationFrame(fabricLoop);
    }).observe(fabric);
  }

  /* ---------- ridisegno: tema, dimensioni ---------- */
  function redrawAll() {
    readColors();
    drawHero();
    cards.forEach(drawCard);
    drawFabric();
  }
  function onTheme() { redrawAll(); }
  if (darkMq.addEventListener) darkMq.addEventListener("change", onTheme);
  new MutationObserver(onTheme).observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
  var resizeT = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(redrawAll, 120);
  });

  /* ---------- comparsa allo scorrimento ----------
     Le sezioni salgono e sfumano quando entrano nello schermo (stile in styles.css, "movimento").
     Si attiva solo se il movimento non è ridotto: altrimenti, o senza JavaScript, tutto resta visibile. */
  (function () {
    if (reduceMq.matches || !("IntersectionObserver" in window)) return;
    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal, .steps"));
    if (!items.length) return;
    // piccolo ritardo tra elementi vicini nello stesso gruppo, massimo quattro passi
    items.forEach(function (el) {
      if (!el.classList.contains("reveal")) return;
      var i = 0, s = el.previousElementSibling;
      while (s) { if (s.classList.contains("reveal")) i++; s = s.previousElementSibling; }
      if (i) el.style.setProperty("--d", (Math.min(i, 3) * 0.08).toFixed(2) + "s");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    // ciò che sta già sopra lo schermo (per esempio arrivando da un link #contatti) compare subito, senza animare
    // prima nasconde senza transizione ("ready"), poi attiva le transizioni al fotogramma successivo:
    // così al caricamento le sezioni non sfumano in uscita prima di comparire
    root.setAttribute("data-motion", "ready");
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < 0) el.classList.add("is-in"); else io.observe(el);
    });
    void root.offsetWidth;
    requestAnimationFrame(function () {
      if (root.hasAttribute("data-motion")) root.setAttribute("data-motion", "on");
    });
    if (reduceMq.addEventListener) reduceMq.addEventListener("change", function (e) {
      if (e.matches) root.removeAttribute("data-motion");
    });
  })();

  /* ---------- modulo contatti ---------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (el) {
        var valid = el.checkValidity();
        el.setAttribute("aria-invalid", valid ? "false" : "true");
        if (!valid && ok) { el.focus(); ok = false; }
      });
      if (!ok) { status.textContent = "Completa i campi evidenziati: nome, email e idea."; return; }
      var to = (form.dataset.to || "").trim();
      if (!to) {
        status.textContent = "Il modulo non è ancora collegato a un indirizzo email: per ora scrivici sui nostri canali.";
        return;
      }
      var d = new FormData(form);
      var body = "Nome: " + d.get("nome") + "\nEmail: " + d.get("email") + "\nTipo: " + d.get("tipo") + "\n\n" + d.get("idea");
      window.location.href = "mailto:" + encodeURIComponent(to) +
        "?subject=" + encodeURIComponent("Richiesta dal sito: " + d.get("tipo")) +
        "&body=" + encodeURIComponent(body);
      status.textContent = "Ti apriamo il programma di posta con il messaggio già scritto: controllalo e invialo.";
    });
  }

  /* ---------- avvio ---------- */
  function boot() {
    readColors();
    cards.forEach(drawCard);
    drawFabric();
    startPrint();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
