/* Trama — disegni e piccoli movimenti del sito.
   - vaso in apertura che si stampa strato per strato
   - catalogo: vaso, statuetta, lampada, bomboniera disegnati a strati (girano al passaggio del mouse)
   - le sei trame di Trama G-code Studio, stampate strato per strato
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
    // gli stessi colori per il vaso in WebGL (valori da 0 a 1)
    C.gl = { lit: rgb01(C.lit), shade: rgb01(C.shade), accent: rgb01(hexToRgb(C.accent)), plate: rgb01(hexToRgb(C.plate)), grid: rgb01(hexToRgb(C.grid)) };
    for (var b = 0; b < BINS; b++) {
      var t = b / (BINS - 1);
      C.bins.push("rgb(" + [0, 1, 2].map(function (k) {
        return Math.round(C.shade[k] + (C.lit[k] - C.shade[k]) * t);
      }).join(",") + ")");
    }
  }
  var BINS = 8;
  function rgb01(c) { return [c[0] / 255, c[1] / 255, c[2] / 255]; }

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
    },

    /* Catalogo: oggetti diversi disegnati con gli stessi strati.
       r(th, t, i, a) dà il raggio relativo intero; a = altezza / raggio massimo, serve per teste e pomelli tondi.
       h: altezza relativa (la bomboniera è più piccola); glow: luce calda dentro il paralume [altezza, raggio]. */
    statuetta: {
      layers: 124, samples: 110,
      r: function (th, t, i, a) {
        if (t < 0.012) return 0.60;                                   // basamento
        if (t < 0.06) return 0.64;
        if (t < 0.075) return 0.58;
        var head = 0.145 * a * 0.68 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.855) / 0.145, 2)));
        if (t > 0.665) return Math.max(t < 0.76 ? 0.11 : 0, head);    // collo e testa
        var r;
        if (t < 0.42) r = 0.22 + 0.20 * Math.pow(1 - (t - 0.075) / 0.345, 1.6);   // veste, si stringe in vita
        else if (t < 0.60) r = 0.22 + 0.13 * smooth(0.42, 0.60, t);                // busto
        else r = Math.max(0.11, 0.35 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.60) / 0.065, 2)))); // spalle
        var e = 0.10 + 0.52 * smooth(0.36, 0.58, t);                  // sezione ovale: spalle larghe, corpo sottile
        return r * (1 + e * Math.cos(2 * th));
      }
    },
    lampada: {
      layers: 120, samples: 120, glow: [0.66, 1.05],
      r: function (th, t) {
        if (t < 0.03) return 0.46;                                     // piede
        if (t < 0.07) return 0.14 + 0.32 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.03) / 0.04, 2)));
        if (t < 0.44) return 0.055;                                    // stelo
        var s = (t - 0.44) / 0.56;                                     // paralume a costine
        return 0.92 - 0.30 * s + 0.024 * Math.sin(28 * th);
      }
    },
    bomboniera: {
      layers: 90, samples: 120, h: 0.62,
      r: function (th, t, i, a) {
        if (t < 0.56) return 0.74 + 0.08 * Math.sin(Math.PI * t / 0.56) + 0.016 * Math.cos(16 * th); // scatolina
        if (t < 0.60) return 0.70;                                     // fessura del coperchio
        if (t < 0.66) return 0.80;                                     // bordo del coperchio
        if (t < 0.88) { var s = (t - 0.66) / 0.22; return 0.78 * Math.sqrt(1 - 0.88 * s * s); } // coperchio
        var knob = 0.06 * a * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.94) / 0.06, 2)));
        return Math.max(t < 0.92 ? 0.12 : 0, knob);                    // pomello
      }
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
    var sh = S.h || 1;                             // oggetti più piccoli (bomboniera)
    var Hv = H * (opts.plate ? 0.60 : 0.66);       // altezza del vaso
    var R = Math.min(W * 0.30, Hv * 0.40) * sh;    // raggio massimo
    Hv *= sh;
    var asp = Hv / R;                              // per le parti tonde (teste, pomelli)
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

    function radiusAt(th, t, i) {
      var u = th - rot;
      return R * (S.r ? S.r(u, t, i, asp) : profile(S.ctrl, t) + S.tex(u, t, i));
    }

    // luce calda dentro il paralume: passa tra uno strato e l'altro
    if (S.glow) {
      var gy = baseY - S.glow[0] * Hv, gr = R * S.glow[1], ac = hexToRgb(C.accent).join(",");
      var grd = ctx.createRadialGradient(cx, gy, 0, cx, gy, gr);
      grd.addColorStop(0, "rgba(" + ac + ",0.45)");
      grd.addColorStop(0.55, "rgba(" + ac + ",0.16)");
      grd.addColorStop(1, "rgba(" + ac + ",0)");
      ctx.fillStyle = grd;
      ctx.fillRect(cx - gr, gy - gr, gr * 2, gr * 2);
    }

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

  /* ---------- apertura in 3D: il vaso vero, in WebGL ----------
     Niente librerie: una superficie di rivoluzione con la stessa forma e la stessa texture "trama"
     del disegno 2D, due file di vertici per strato (solco e cresta) così si vedono gli strati.
     Il vaso ruota piano e segue il mouse; su telefono si gira trascinando col dito.
     Se WebGL non c'è, resta il disegno 2D. Con il movimento ridotto: vaso intero, fermo. */
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNor;",
    "uniform mat4 uModel; uniform mat4 uViewProj;",
    "varying vec3 vN; varying vec3 vP;",
    "void main() {",
    "  vP = aPos; vN = mat3(uModel) * aNor;",
    "  gl_Position = uViewProj * uModel * vec4(aPos, 1.0);",
    "}"
  ].join("\n");
  var FS = [
    "precision mediump float;",
    "uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uAccent; uniform vec3 uPlate; uniform vec3 uGrid;",
    "uniform vec3 uLight; uniform float uMode; uniform float uPrintY; uniform float uLayerH; uniform float uFrac;",
    "varying vec3 vN; varying vec3 vP;",
    "void main() {",
    "  if (uMode > 0.5) {",                                  // piatto di stampa con la griglia
    "    vec2 g = abs(fract(vP.xz * 6.0 + 0.5) - 0.5) / fwidthSafe(vP.xz * 6.0);",
    "    float line = 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);",
    "    gl_FragColor = vec4(mix(uPlate, uGrid, line * 0.9), 1.0);",
    "    return;",
    "  }",
    "  if (vP.y > uPrintY + uLayerH) discard;",               // sopra lo strato in stampa: non ancora stampato
    "  vec3 n = normalize(vN); float inside = 1.0;",
    "  if (!gl_FrontFacing) { n = -n; inside = 0.55; }",
    "  float k = 0.12 + 0.88 * max(0.0, dot(n, uLight));",
    "  vec3 col = mix(uShade, uLit, k * inside);",
    "  vec3 v = vec3(0.0, 0.35, 0.94);",                       // verso chi guarda
    "  float spec = pow(max(dot(n, normalize(uLight + v)), 0.0), 28.0) * 0.35 * inside;",
    "  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.18 * inside;",
    "  col = mix(col, vec3(1.0), spec) + (uLit - col) * rim;",
    "  if (vP.y > uPrintY) {",                                // strato in stampa: bronzo, avanza col giro dell'ugello
    "    float a = fract(atan(vP.z, vP.x) / 6.2831853 - 0.25);",
    "    if (a > uFrac) discard;",
    "    col = uAccent;",
    "  }",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function makeHero3D(old) {
    var canvas = document.createElement("canvas");
    var gl = null;
    try { gl = canvas.getContext("webgl", { antialias: true, alpha: true }); } catch (e) { gl = null; }
    if (!gl) return null;
    var deriv = gl.getExtension("OES_standard_derivatives");
    var fs = (deriv ? "#extension GL_OES_standard_derivatives : enable\n#define fwidthSafe(x) fwidth(x)\n"
                    : "#define fwidthSafe(x) vec2(0.02)\n") + FS;
    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VS), fsh = shader(gl.FRAGMENT_SHADER, fs);
    if (!vs || !fsh) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fsh); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

    /* geometria del vaso: altezza 1, raggio come nel disegno 2D (0,4 dell'altezza) */
    var S = STYLES.trama, N = S.layers;
    var small = Math.min(window.innerWidth, window.innerHeight) < 600;
    var M = small ? 96 : 144, ROWS = N * 2 + 1, COLS = M + 1;
    var pos = new Float32Array(ROWS * COLS * 3), nor = new Float32Array(ROWS * COLS * 3);
    var r, row, j;
    for (row = 0; row < ROWS; row++) {
      var y = row / (ROWS - 1), layer = Math.min(N - 1, row >> 1), groove = (row & 1) === 0;
      for (j = 0; j < COLS; j++) {
        var th = (j % M) / M * TAU;
        r = 0.4 * (profile(S.ctrl, y) + S.tex(th, y, layer)) * (groove ? 0.984 : 1);
        var o = (row * COLS + j) * 3;
        pos[o] = r * Math.cos(th); pos[o + 1] = y; pos[o + 2] = r * Math.sin(th);
      }
    }
    // normali dalle differenze tra vicini (lungo il giro e lungo l'altezza)
    for (row = 0; row < ROWS; row++) {
      var up = Math.min(ROWS - 1, row + 1), dn = Math.max(0, row - 1);
      for (j = 0; j < COLS; j++) {
        var jn = (j % M + 1) % M, jp = (j % M + M - 1) % M;
        var a = (row * COLS + jn) * 3, b = (row * COLS + jp) * 3, c = (up * COLS + j) * 3, d = (dn * COLS + j) * 3;
        var tx = pos[a] - pos[b], ty = pos[a + 1] - pos[b + 1], tz = pos[a + 2] - pos[b + 2];
        var vx = pos[c] - pos[d], vy = pos[c + 1] - pos[d + 1], vz = pos[c + 2] - pos[d + 2];
        var nx = vy * tz - vz * ty, ny = vz * tx - vx * tz, nz = vx * ty - vy * tx;
        var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1, q = (row * COLS + j) * 3;
        nor[q] = nx / l; nor[q + 1] = ny / l; nor[q + 2] = nz / l;
      }
    }
    var idx = new Uint16Array((ROWS - 1) * M * 6), n = 0;
    for (row = 0; row < ROWS - 1; row++) for (j = 0; j < M; j++) {
      var i0 = row * COLS + j, i1 = i0 + 1, i2 = i0 + COLS, i3 = i2 + 1;
      idx[n++] = i0; idx[n++] = i2; idx[n++] = i1; idx[n++] = i1; idx[n++] = i2; idx[n++] = i3;
    }
    // piatto: un disco sotto il vaso
    var PS = 72, ppos = new Float32Array((PS + 2) * 3), pnor = new Float32Array((PS + 2) * 3);
    for (j = 0; j <= PS; j++) {
      var pa = j / PS * TAU;
      ppos[(j + 1) * 3] = 0.74 * Math.cos(pa); ppos[(j + 1) * 3 + 1] = -0.004; ppos[(j + 1) * 3 + 2] = 0.74 * Math.sin(pa);
    }
    ppos[1] = -0.004;
    for (j = 0; j < PS + 2; j++) pnor[j * 3 + 1] = 1;

    function buf(data, target) { var bo = gl.createBuffer(); gl.bindBuffer(target || gl.ARRAY_BUFFER, bo); gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return bo; }
    var vPos = buf(pos), vNor = buf(nor), vIdx = buf(idx, gl.ELEMENT_ARRAY_BUFFER), pPos = buf(ppos), pNor = buf(pnor);
    var aPos = gl.getAttribLocation(prog, "aPos"), aNor = gl.getAttribLocation(prog, "aNor");
    var U = {};
    ["uModel", "uViewProj", "uLit", "uShade", "uAccent", "uPlate", "uGrid", "uLight", "uMode", "uPrintY", "uLayerH", "uFrac"]
      .forEach(function (u) { U[u] = gl.getUniformLocation(prog, u); });

    /* matrici 4x4, in colonna come vuole WebGL */
    function mul(a, b) {
      var o = new Float32Array(16);
      for (var c = 0; c < 4; c++) for (var r2 = 0; r2 < 4; r2++) {
        o[c * 4 + r2] = a[r2] * b[c * 4] + a[4 + r2] * b[c * 4 + 1] + a[8 + r2] * b[c * 4 + 2] + a[12 + r2] * b[c * 4 + 3];
      }
      return o;
    }
    function persp(fov, asp, nr, fr) {
      var f = 1 / Math.tan(fov / 2), m = new Float32Array(16);
      m[0] = f / asp; m[5] = f; m[10] = (fr + nr) / (nr - fr); m[11] = -1; m[14] = 2 * fr * nr / (nr - fr);
      return m;
    }
    function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
    function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
    function move(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }

    /* stato del movimento */
    var st = { yaw: -0.6, off: 0, offT: 0, tilt: 0, tiltT: 0, vel: 0, drag: null, last: 0, raf: 0, visible: true, gone: false, measure: null };

    function render(now) {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(small ? 1.5 : 2, window.devicePixelRatio || 1);
      var w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(prog);

      var asp = w / h;
      // inquadratura: il vaso (alto 1) occupa circa due terzi della scena, leggermente dall'alto
      var el = 0.34, dist = asp < 0.95 ? 4.1 : 3.7;
      var view = mul(move(0, -0.02, -dist), mul(rotX(el), move(0, -0.45, 0)));
      var vp = mul(persp(0.52, asp, 0.1, 20), view);
      var model = mul(rotX(st.tilt), rotY(st.yaw + st.off));
      gl.uniformMatrix4fv(U.uViewProj, false, vp);
      gl.uniformMatrix4fv(U.uModel, false, model);
      gl.uniform3fv(U.uLit, C.gl.lit); gl.uniform3fv(U.uShade, C.gl.shade); gl.uniform3fv(U.uAccent, C.gl.accent);
      gl.uniform3fv(U.uPlate, C.gl.plate); gl.uniform3fv(U.uGrid, C.gl.grid);
      // luce da davanti a sinistra e dall'alto, ferma: gli strati brillano mentre il vaso gira
      gl.uniform3fv(U.uLight, [-0.55, 0.45, 0.70]);

      var p = heroProgress, total = p * N, done = Math.floor(total);
      var layerH = 1 / N;
      gl.uniform1f(U.uLayerH, layerH);
      gl.uniform1f(U.uPrintY, p >= 1 ? 2 : done * layerH);
      gl.uniform1f(U.uFrac, p >= 1 ? 1 : total - done);

      // piatto
      gl.uniform1f(U.uMode, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, pPos); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, pNor); gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, PS + 2);
      // vaso
      gl.uniform1f(U.uMode, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, vPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, vNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIdx);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }

    function still() { return reduceMq.matches; }
    function frame(now) {
      st.raf = 0;
      var dt = st.last ? Math.min(0.05, (now - st.last) / 1000) : 0;
      st.last = now;
      if (!still()) {
        if (!st.drag) { st.yaw += dt * 0.22 + st.vel * dt; st.vel *= Math.pow(0.04, dt); }
        st.off += (st.offT - st.off) * Math.min(1, dt * 4);
        st.tilt += (st.tiltT - st.tilt) * Math.min(1, dt * 4);
      }
      render(now);
      if (st.visible && !still()) { st.measure(now); st.raf = requestAnimationFrame(frame); }
      else { st.last = 0; }
      if (st.gone) cancelAnimationFrame(st.raf);
    }
    function kick() { if (!st.raf && !st.gone) st.raf = requestAnimationFrame(frame); }

    // mouse: il vaso guarda verso il puntatore (poco: al massimo un terzo di giro e un filo d'inclinazione)
    if (finePointer) {
      window.addEventListener("pointermove", function (e) {
        if (still() || !st.visible || e.pointerType !== "mouse") return;
        var rc = canvas.getBoundingClientRect();
        st.offT = clamp((e.clientX - (rc.left + rc.width / 2)) / (rc.width * 1.2), -1, 1) * 0.9;
        st.tiltT = clamp((e.clientY - (rc.top + rc.height / 2)) / (rc.height * 1.2), -1, 1) * 0.16;
      }, { passive: true });
    }
    // dito (e mouse) sul vaso: trascinando lo si gira, poi continua per inerzia
    canvas.addEventListener("pointerdown", function (e) {
      if (still()) return;
      st.drag = { x: e.clientX, t: performance.now() };
      st.vel = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!st.drag) return;
      var now = performance.now(), dx = e.clientX - st.drag.x, dtm = Math.max(1, now - st.drag.t);
      var da = dx / Math.max(160, canvas.clientWidth) * Math.PI;
      st.yaw += da; st.vel = da / (dtm / 1000);
      st.drag.x = e.clientX; st.drag.t = now;
      kick();
    });
    function endDrag() { st.drag = null; st.vel = clamp(st.vel, -6, 6); }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        st.visible = en[0].isIntersecting;
        if (st.visible) kick();
      }).observe(canvas);
    }

    // il nuovo canvas prende il posto di quello 2D, con la stessa descrizione
    canvas.id = old.id;
    canvas.className = "is-3d";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Un vaso a strati che si stampa sul piatto della stampante e gira su se stesso");
    old.parentNode.replaceChild(canvas, old);

    // ritorno al disegno 2D: se la scheda grafica si ferma o se il telefono non regge il 3D
    function back2D() {
      if (st.gone) return;
      st.gone = true;
      st.visible = false;
      cancelAnimationFrame(st.raf);
      hero3d = null;
      if (canvas.parentNode) canvas.parentNode.replaceChild(old, canvas);
      hero = old;
      drawHero();
      var ext = gl.getExtension("WEBGL_lose_context");
      if (ext) try { ext.loseContext(); } catch (err) { /* niente */ }
    }
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); back2D(); });

    /* telefono lento: si misurano i primi fotogrammi in movimento (saltando i primi, che pagano l'avvio).
       Se la mediana supera 45 ms (meno di 22 fotogrammi al secondo) si torna al 2D, una volta sola.
       Le pause lunghe (scheda in secondo piano, vaso fuori schermo) non contano. */
    var probe = { skip: 12, times: [], prev: 0 };
    st.measure = function (now) {
      if (!probe) return;
      if (document.visibilityState !== "visible") { probe.prev = 0; return; }
      if (probe.prev) {
        var d = now - probe.prev;
        if (d < 250) {
          if (probe.skip > 0) probe.skip--;
          else probe.times.push(d);
        }
      }
      probe.prev = now;
      if (probe.times.length >= 40) {
        var t = probe.times.sort(function (a, b) { return a - b; })[20];
        probe = null;
        if (t > 45) back2D();
      }
    };

    return { canvas: canvas, draw: kick };
  }

  /* ---------- apertura: il vaso che si stampa ---------- */
  var hero = document.getElementById("heroVase");
  var readout = document.getElementById("heroReadout");
  var reprint = document.getElementById("reprint");
  var REAL_LAYERS = 900, LAYER_MM = 0.2, PRINT_MS = 5600;
  var heroProgress = 1, heroRaf = 0, heroStart = 0, hero3d = null;

  function fmt(n, d) { return n.toFixed(d).replace(".", ","); }
  function setReadout(p) {
    if (!readout) return;
    if (p >= 1) { readout.textContent = REAL_LAYERS + " strati · " + fmt(REAL_LAYERS * LAYER_MM, 0) + " mm · modalità vaso"; return; }
    var L = Math.max(1, Math.round(p * REAL_LAYERS));
    readout.textContent = "strato " + L + " / " + REAL_LAYERS + " · " + fmt(L * LAYER_MM, 1) + " mm";
  }
  function drawHero() {
    if (!hero) return;
    if (hero3d) hero3d.draw();
    else drawVase(hero, "trama", { progress: heroProgress, plate: true, nozzle: true });
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

  /* ---------- catalogo ---------- */
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
    c.addEventListener("pointerleave", function () {
      cancelAnimationFrame(raf); raf = 0;
      c.style.removeProperty("--tilt-x"); c.style.removeProperty("--tilt-y");
    });
    // la scheda si inclina un poco verso il puntatore (al massimo 5 gradi; stile in styles.css)
    c.addEventListener("pointermove", function (e) {
      if (reduceMq.matches || e.pointerType !== "mouse") return;
      var r = c.getBoundingClientRect();
      var x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
      var y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
      c.style.setProperty("--tilt-x", (x * 10).toFixed(2) + "deg");
      c.style.setProperty("--tilt-y", (-y * 8).toFixed(2) + "deg");
    });
  });

  /* ---------- le trame: le stesse formule di Trama G-code Studio ----------
     Sei texture scritte nel percorso dell'ugello. Qui la parete del vaso è "srotolata":
     raggio 40 mm, strati da 0,2 mm, proporzioni vere. Il riquadro grande stampa la trama scelta
     strato per strato, con l'ugello che corre e gli ultimi strati ancora caldi; le miniature servono a sceglierla.
     Se nessuno sceglie, le trame si alternano da sole. Movimento ridotto: trama intera e ferma, niente alternanza. */
  var trame = (function () {
    var stage = document.getElementById("trCanvas");
    var none = { redraw: function () {}, boot: function () {} };
    if (!stage) return none;
    var picker = document.getElementById("trPicker");
    var nameEl = document.getElementById("trName"), descEl = document.getElementById("trDesc"), readEl = document.getElementById("trRead");
    var R0 = 40, LH = 0.2, LP = 3, Z0 = 40, SEED = 13, PRINT = 2600, HOLD = 3400;
    var TEX = {
      weave:   { name: "Intreccio", desc: "Gli strati ondeggiano in controfase e si incrociano: ne nasce una rete, come un tessuto.", p: { count: 30, shift: 0.5, shape: "tri" } },
      diamond: { name: "Diamanti",  desc: "Due spirali opposte disegnano una zigrinatura a rombi.", p: { count: 40, pitch: 6 } },
      voronoi: { name: "Voronoi",   desc: "Celle organiche separate da solchi sottili.", p: { size: 12, edge: 0.22 } },
      organic: { name: "Organico",  desc: "Un rilievo morbido che segue la forma, con venature che ricordano una corteccia.", p: { size: 14, ridged: true } },
      scales:  { name: "Squame",    desc: "File sfalsate di scaglie bombate.", p: { count: 20, rowH: 8 } },
      fuzzy:   { name: "Pelliccia", desc: "Una superficie opaca e vellutata che nasconde le linee degli strati.", p: { size: 0.8 } }
    };
    var ORDER = ["weave", "diamond", "voronoi", "organic", "scales", "fuzzy"];

    /* rumore e onde: copiati dal motore di Trama G-code Studio */
    function fract(x) { return x - Math.floor(x); }
    function sstep(e0, e1, x) { if (e1 <= e0) return x >= e1 ? 1 : 0; var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    function wave(shape, x) { return shape === "tri" ? 4 * Math.abs(fract(x) - 0.5) - 1 : Math.cos(TAU * x); }
    function hashU(a, b, c, s) {
      var im = Math.imul;
      var h = im(a | 0, 0x27d4eb2d) ^ im(b | 0, 0x165667b1) ^ im(c | 0, 0x61c88647) ^ im((s | 0) + 0x3c6ef372, 0x85ebca77);
      h = im(h ^ (h >>> 15), 0x2c1b3c6d);
      h = im(h ^ (h >>> 12), 0x297a2d39);
      h ^= h >>> 15;
      return (h >>> 0) / 4294967296;
    }
    var GR = [1,1,0, -1,1,0, 1,-1,0, -1,-1,0, 1,0,1, -1,0,1, 1,0,-1, -1,0,-1, 0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1];
    function gdot(ix, iy, iz, s, x, y, z) { var g = ((hashU(ix, iy, iz, s) * 12) | 0) * 3; return GR[g] * x + GR[g + 1] * y + GR[g + 2] * z; }
    function fadeC(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function perlin3(x, y, z, s) {
      var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
      var u = fadeC(fx), v = fadeC(fy), w = fadeC(fz);
      return lerp(lerp(lerp(gdot(ix, iy, iz, s, fx, fy, fz), gdot(ix + 1, iy, iz, s, fx - 1, fy, fz), u),
                       lerp(gdot(ix, iy + 1, iz, s, fx, fy - 1, fz), gdot(ix + 1, iy + 1, iz, s, fx - 1, fy - 1, fz), u), v),
                  lerp(lerp(gdot(ix, iy, iz + 1, s, fx, fy, fz - 1), gdot(ix + 1, iy, iz + 1, s, fx - 1, fy, fz - 1), u),
                       lerp(gdot(ix, iy + 1, iz + 1, s, fx, fy - 1, fz - 1), gdot(ix + 1, iy + 1, iz + 1, s, fx - 1, fy - 1, fz - 1), u), v), w);
    }
    function fbm3(x, y, z, s) {
      var a = 1, f = 1, sum = 0, norm = 0;
      for (var o = 0; o < 3; o++) { sum += a * perlin3(x * f, y * f, z * f, s + o * 31); norm += a; a *= 0.5; f *= 2.03; }
      return sum / norm;
    }
    function worleyGap(x, y, z, s) {              // distanza tra la cella più vicina e la seconda
      var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), f1 = 1e9, f2 = 1e9;
      for (var dz = -1; dz <= 1; dz++) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var cx = ix + dx, cy = iy + dy, cz = iz + dz;
        var px = cx + hashU(cx, cy, cz, s) - x, py = cy + hashU(cx, cy, cz, s + 101) - y, pz = cz + hashU(cx, cy, cz, s + 202) - z;
        var d = px * px + py * py + pz * pz;
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      return Math.sqrt(f2) - Math.sqrt(f1);
    }

    /* valore della trama in [-0,5; 0,5]. tRev: giri dall'inizio (strato + frazione), th: angolo, z: altezza in mm */
    function texD(type, tRev, th, z) {
      var p = TEX[type].p;
      switch (type) {
        case "weave": return 0.5 * wave(p.shape, (p.count + p.shift) * tRev);
        case "diamond": { var a = p.count * th / TAU, v = z / p.pitch; return 0.25 * (wave("tri", a + v) + wave("tri", a - v)); }
        case "fuzzy": {
          var cpr = Math.max(8, Math.round(TAU * R0 / Math.max(0.2, p.size)));
          var s = tRev * cpr, i0 = Math.floor(s), fr = s - i0, h0 = hashU(i0, 0, 0, SEED), h1 = hashU(i0 + 1, 0, 0, SEED);
          return h0 + (h1 - h0) * fr - 0.5;
        }
        case "organic": {
          var sc = 1 / p.size, n = fbm3(Math.cos(th) * R0 * sc, Math.sin(th) * R0 * sc, z * sc, SEED);
          return p.ridged ? clamp(0.5 - 1.6 * Math.abs(n), -0.5, 0.5) : clamp(n * 1.25, -0.5, 0.5);
        }
        case "voronoi": {
          var sv = 1 / p.size;
          return sstep(0, p.edge, worleyGap(Math.cos(th) * R0 * sv, Math.sin(th) * R0 * sv, z * sv, SEED)) - 0.5;
        }
        case "scales": {
          var x = p.count * th / TAU, y = z / p.rowH, jTop = Math.floor(y) + 1;
          for (var j = jTop; j >= jTop - 3; j--) {
            var off = (j & 1) ? 0.5 : 0, cx = Math.round(x - off) + off;
            for (var c = -1; c <= 1; c++) {
              var dx = (x - (cx + c)) / 0.62, dy = (y - j) / 0.95, q = dx * dx + dy * dy;
              if (q < 1) return Math.sqrt(1 - q) * 0.9 - 0.4;
            }
          }
          return -0.5;
        }
      }
      return 0;
    }

    /* la parete srotolata come immagine: lp = pixel per strato (proporzioni vere: lp pixel = 0,2 mm in tutte e due le direzioni) */
    function wallCanvas(type, Wpx, Hpx, lp) {
      var rows = Math.ceil(Hpx / lp), vals = new Float32Array(Wpx * rows), mmPx = LH / lp, L0 = Math.round(Z0 / LH);
      for (var y = 0; y < rows; y++) {
        var layer = L0 + (rows - 1 - y), z = layer * LH;
        for (var x = 0; x < Wpx; x++) { var th = x * mmPx / R0; vals[y * Wpx + x] = texD(type, layer + th / TAU, th, z); }
      }
      var cv = document.createElement("canvas"); cv.width = Wpx; cv.height = Hpx;
      var cx = cv.getContext("2d"), img = cx.createImageData(Wpx, Hpx), d = img.data;
      var s = getComputedStyle(root), base = hexToRgb(s.getPropertyValue("--fil-lit") || "#B4BEC5"), shadow = hexToRgb(s.getPropertyValue("--stage") || "#000000");
      var bead = lp >= 3 ? [1.14, 1.0, 0.74] : lp === 2 ? [1.1, 0.8] : [1];
      for (var py = 0; py < Hpx; py++) {
        var row = Math.floor(py / lp), bf = bead[Math.min(bead.length - 1, Math.floor((py % lp) * bead.length / lp))];
        for (var px = 0; px < Wpx; px++) {
          var i = row * Wpx + px, v = vals[i];
          var gx = (vals[row * Wpx + Math.min(Wpx - 1, px + 1)] - vals[row * Wpx + Math.max(0, px - 1)]) * lp;
          var gy = lp === 1 ? (row > 0 ? vals[i - Wpx] : v) - (row < rows - 1 ? vals[i + Wpx] : v) : 0;
          var light = clamp((0.72 + v * 0.6 - gx * 1.1 + gy * 0.8) * bf, 0, 1.3), l1 = Math.min(1, light), o = (py * Wpx + px) * 4;
          for (var ch = 0; ch < 3; ch++) d[o + ch] = clamp(shadow[ch] * (1 - l1) * 0.35 + base[ch] * light, 0, 255);
          d[o + 3] = 255;
        }
      }
      cx.putImageData(img, 0, 0);
      return cv;
    }

    var cur = "weave", img = null, cache = {}, raf = 0, t0 = 0, timer = 0, visible = false, started = false, picked = false, waiting = false;
    var chips = picker ? Array.prototype.slice.call(picker.querySelectorAll(".tr-chip")) : [];

    function stageSize() { var r = stage.getBoundingClientRect(); return [Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))]; }
    function imageFor(type) {
      var sz = stageSize(), key = type + ":" + sz[0] + "x" + sz[1];
      if (!cache[key]) cache[key] = wallCanvas(type, sz[0], sz[1], LP);
      return cache[key];
    }
    function setRead(p) {
      if (!readEl) return;
      var rows = Math.ceil(stageSize()[1] / LP);
      readEl.textContent = p >= 1
        ? TEX[cur].name + " · " + rows + " strati · " + fmt(rows * LH, 0) + " mm"
        : "strato " + Math.max(1, Math.round(p * rows)) + " / " + rows + " · " + TEX[cur].name;
    }
    function nozzle(ctx, x, y) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 24); ctx.lineTo(x + 7, y - 24); ctx.lineTo(x + 7, y - 11);
      ctx.lineTo(x + 2.5, y - 3); ctx.lineTo(x - 2.5, y - 3); ctx.lineTo(x - 7, y - 11);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
    }
    function draw(p, now) {
      var f = fit(stage), ctx = f.ctx, W = f.W, H = f.H;
      ctx.clearRect(0, 0, W, H);
      if (!img) return;
      if (!C.accent) readColors();
      var rows = Math.ceil(H / LP), shown = p >= 1 ? rows : Math.floor(p * rows), yTop = Math.max(0, H - shown * LP);
      if (p < 1) {                                                         // anteprima in trasparenza di quello che sta per essere stampato
        ctx.globalAlpha = 0.14; ctx.drawImage(img, 0, 0, W, H); ctx.globalAlpha = 1;
      }
      if (H - yTop > 0) {
        var k = img.height / H;
        ctx.drawImage(img, 0, yTop * k, img.width, (H - yTop) * k, 0, yTop, W, H - yTop);
      }
      if (p >= 1) return;
      var ac = hexToRgb(C.accent).join(",");
      var heat = ctx.createLinearGradient(0, yTop, 0, yTop + LP * 12);    // strati appena stampati, ancora caldi
      heat.addColorStop(0, "rgba(" + ac + ",0.55)"); heat.addColorStop(1, "rgba(" + ac + ",0)");
      ctx.fillStyle = heat; ctx.fillRect(0, yTop, W, LP * 12);
      var glow = ctx.createLinearGradient(0, yTop - LP * 9, 0, yTop);       // bagliore sopra lo strato in corso
      glow.addColorStop(0, "rgba(" + ac + ",0)"); glow.addColorStop(1, "rgba(" + ac + ",0.22)");
      ctx.fillStyle = glow; ctx.fillRect(0, yTop - LP * 9, W, LP * 9);
      ctx.fillStyle = C.accent; ctx.fillRect(0, yTop - LP, W, Math.max(1.5, LP * 0.7));
      nozzle(ctx, 14 + (W - 28) * (0.5 - 0.5 * Math.cos(now / 360)), yTop - LP * 0.6);   // l'ugello corre avanti e indietro
    }
    function loop(now) {
      if (!t0) t0 = now;
      var p = clamp((now - t0) / PRINT, 0, 1);
      draw(p, now); setRead(p);
      if (p < 1) { raf = requestAnimationFrame(loop); return; }
      raf = 0; scheduleNext();
    }
    function nextOf(type) { return ORDER[(ORDER.indexOf(type) + 1) % ORDER.length]; }
    function scheduleNext() {
      clearTimeout(timer);
      if (picked || reduceMq.matches) return;
      var nx = nextOf(cur);
      setTimeout(function () { imageFor(nx); }, 60);                       // prepara la prossima mentre si guarda questa
      timer = setTimeout(function () {
        if (picked) return;
        if (!visible) { waiting = true; return; }
        select(nx, true);
      }, HOLD);
    }
    function select(type, animate) {
      cur = type;
      chips.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tex === type)); });
      if (nameEl) nameEl.textContent = TEX[type].name;
      if (descEl) descEl.textContent = TEX[type].desc;
      stage.setAttribute("aria-label", "Primo piano della parete stampata con la trama " + TEX[type].name);
      img = imageFor(type);
      cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); waiting = false;
      if (!animate || reduceMq.matches) { draw(1, 0); setRead(1); scheduleNext(); return; }
      t0 = 0; raf = requestAnimationFrame(loop);
    }
    function drawThumbs() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      chips.forEach(function (b, n) {
        setTimeout(function () {
          var c = b.querySelector("canvas"); if (!c) return;
          var r = c.getBoundingClientRect(), w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
          var t = wallCanvas(b.dataset.tex, w, h, 1);
          c.width = w; c.height = h; c.getContext("2d").drawImage(t, 0, 0);
        }, 30 * n);
      });
    }
    chips.forEach(function (b) {
      b.addEventListener("click", function () {
        picked = true;
        // il nome e la descrizione si leggono ad alta voce solo quando la trama la sceglie chi visita,
        // non a ogni cambio automatico
        var info = nameEl && nameEl.parentNode;
        if (info && !info.hasAttribute("aria-live")) info.setAttribute("aria-live", "polite");
        select(b.dataset.tex, true);
      });
    });
    var lastSig = "";
    function start() {
      if (started) return;
      started = true;
      var s0 = getComputedStyle(root);
      lastSig = s0.getPropertyValue("--fil-lit") + s0.getPropertyValue("--stage") + stageSize().join("x") + (window.devicePixelRatio || 1);
      drawThumbs();
      select(cur, true);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !started) start();
        else if (visible && waiting) select(nextOf(cur), true);
      }, { rootMargin: "0px 0px -15% 0px" }).observe(stage);
    }
    return {
      boot: function () { if (!("IntersectionObserver" in window)) start(); },
      // ricalcola le trame solo se cambiano tema o larghezza: su telefono la barra dell'indirizzo
      // che compare e sparisce manda "resize" di continuo, e ogni trama costa decine di millisecondi
      redraw: function () {
        if (!started) return;
        var s = getComputedStyle(root), sig = s.getPropertyValue("--fil-lit") + s.getPropertyValue("--stage") + stageSize().join("x") + (window.devicePixelRatio || 1);
        if (sig === lastSig) return;
        lastSig = sig; cache = {}; drawThumbs(); img = imageFor(cur); if (!raf) { draw(1, 0); setRead(1); }
      }
    };
  })();

  /* ---------- ridisegno: tema, dimensioni ---------- */
  function redrawAll() {
    readColors();
    drawHero();
    cards.forEach(drawCard);
    trame.redraw();
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

  /* ---------- menu su telefono ----------
     Il bottone "Menu" apre e chiude i link alle sezioni sotto gli 860 px.
     Si chiude toccando un link, premendo Esc o toccando fuori. Senza JavaScript i link restano in una riga. */
  (function () {
    var head = document.querySelector(".site-head");
    var btn = document.getElementById("menuBtn");
    var menu = document.getElementById("menu");
    if (!head || !btn || !menu) return;
    head.setAttribute("data-menu", "");
    btn.hidden = false;
    function set(open) {
      head.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && head.classList.contains("is-open")) { set(false); btn.focus(); }
    });
    document.addEventListener("click", function (e) { if (!head.contains(e.target)) set(false); });
    // Safari vecchi (iOS 13 e prima) non hanno addEventListener sulle media query: senza controllo lo script si fermerebbe qui
    var wideMq = window.matchMedia("(min-width: 861px)");
    if (wideMq.addEventListener) wideMq.addEventListener("change", function (e) { if (e.matches) set(false); });
  })();

  /* ---------- modulo contatti ---------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");
  // l'esempio nel campo "La tua idea" segue l'oggetto scelto
  var IDEA_EX = {
    Statuetta: "Per esempio: una statuetta di mia nonna da una foto, alta circa 15 cm.",
    Quadro: "Per esempio: un quadro con il disegno di mio figlio, da appendere in cameretta.",
    Vaso: "Per esempio: un vaso alto circa 25 cm, verde salvia, con la trama a diamanti.",
    Lampada: "Per esempio: una lampada da comodino con il paralume a costine e la luce calda.",
    Segnaposto: "Per esempio: 80 segnaposti con i nomi degli invitati, per un matrimonio.",
    Bomboniera: "Per esempio: 60 scatoline con le iniziali degli sposi e la data.",
    Gioco: "Per esempio: le pedine di un gioco da tavolo con i colori della nostra squadra.",
    Altro: "Raccontaci cosa ti serve, anche solo in due righe."
  };
  var idea = document.getElementById("f-idea");
  var ideaDefault = idea ? idea.getAttribute("placeholder") : "";
  if (form && idea) {
    form.addEventListener("change", function (e) {
      var t = e.target;
      if (!t || t.name !== "tipo") return;
      if (t.checked && IDEA_EX[t.value]) { idea.setAttribute("placeholder", IDEA_EX[t.value]); return; }
      var on = form.querySelector('input[name="tipo"]:checked');
      idea.setAttribute("placeholder", on && IDEA_EX[on.value] ? IDEA_EX[on.value] : ideaDefault);
    });
  }
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
      var tipi = d.getAll("tipo");
      var tipo = tipi.length ? tipi.join(", ") : "da definire";
      var body = "Nome: " + d.get("nome") + "\nEmail: " + d.get("email") + "\nOggetto: " + tipo + "\n\n" + d.get("idea");
      window.location.href = "mailto:" + encodeURIComponent(to) +
        "?subject=" + encodeURIComponent("Richiesta dal sito: " + tipo) +
        "&body=" + encodeURIComponent(body);
      status.textContent = "Ti apriamo il programma di posta con il messaggio già scritto: controllalo e invialo.";
    });
  }

  /* telefono modesto o risparmio dati attivo: resta il disegno 2D, senza nemmeno provare il 3D */
  function lowEnd() {
    var n = navigator, c = n.connection;
    if (c && c.saveData) return true;
    if (n.deviceMemory && n.deviceMemory <= 2) return true;
    if (n.hardwareConcurrency && n.hardwareConcurrency <= 2 && !finePointer) return true;
    return false;
  }

  /* ---------- avvio ---------- */
  function boot() {
    readColors();
    if (hero && !hero3d && !lowEnd()) {
      hero3d = makeHero3D(hero);
      if (hero3d) hero = hero3d.canvas;
    }
    cards.forEach(drawCard);
    trame.boot();
    startPrint();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
