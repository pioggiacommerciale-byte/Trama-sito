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
    var st = { yaw: -0.6, off: 0, offT: 0, tilt: 0, tiltT: 0, vel: 0, drag: null, last: 0, raf: 0, visible: true };

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
      if (st.visible && !still()) st.raf = requestAnimationFrame(frame);
      else st.last = 0;
    }
    function kick() { if (!st.raf) st.raf = requestAnimationFrame(frame); }

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

    canvas.addEventListener("webglcontextlost", function (e) {
      // la scheda grafica si è fermata: si torna al disegno 2D
      e.preventDefault();
      cancelAnimationFrame(st.raf);
      hero3d = null;
      canvas.parentNode.replaceChild(old, canvas);
      hero = old;
      drawHero();
    });

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
    window.matchMedia("(min-width: 861px)").addEventListener("change", function (e) { if (e.matches) set(false); });
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
    if (hero && !hero3d) {
      hero3d = makeHero3D(hero);
      if (hero3d) hero = hero3d.canvas;
    }
    cards.forEach(drawCard);
    drawFabric();
    startPrint();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
