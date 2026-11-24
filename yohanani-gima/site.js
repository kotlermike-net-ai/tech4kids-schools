/* Yohanani v2: live hero board, typed prompt, RTL game rail, micro:bit simulator.
   Board drawing and the rps / catch programs come from the Eldar build. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;
  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function parse(g) {
    var rows = g.split('|'), out = [];
    for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) out.push((rows[r] || '').charAt(c) === '#');
    return out;
  }
  var G = {
    heart: '.#.#.|#####|#####|.###.|..#..',
    small: '.....|.#.#.|.###.|..#..|.....',
    happy: '.....|.#.#.|.....|#...#|.###.',
    paper: '#####|#...#|#...#|#...#|#####',
    rock: '.....|.###.|.###.|.###.|.....',
    scissors: '##..#|##.#.|..#..|##.#.|##..#',
    yes: '.....|....#|...#.|#.#..|.#...',
    no: '#...#|.#.#.|..#..|.#.#.|#...#',
    left: '..#..|.#...|#####|.#...|..#..',
    right: '..#..|...#.|#####|...#.|..#..',
    up: '..#..|.###.|#.#.#|..#..|..#..',
    down: '..#..|..#..|#.#.#|.###.|..#..',
    N: '#...#|##..#|#.#.#|#..##|#...#',
    E: '#####|#....|####.|#....|#####',
    S: '.####|#....|.###.|....#|####.',
    W: '#...#|#...#|#.#.#|##.##|#...#'
  };
  var D = ['.###.|#..##|#.#.#|##..#|.###.', '..#..|.##..|..#..|..#..|.###.', '.###.|#...#|..##.|.#...|#####',
           '####.|....#|.###.|....#|####.', '...#.|..##.|.#.#.|#####|...#.', '#####|#....|####.|....#|####.',
           '.###.|#....|####.|#...#|.###.', '#####|...#.|..#..|.#...|#....', '.###.|#...#|.###.|#...#|.###.',
           '.###.|#...#|.####|....#|.###.'];

  /* small LED glyphs inside text */
  document.querySelectorAll('.glyph[data-glyph]').forEach(function (i) {
    var s = el('svg', { viewBox: '0 0 5 5', 'aria-hidden': 'true', width: '100%', height: '100%' }, i);
    parse(i.getAttribute('data-glyph')).forEach(function (on, k) {
      el('rect', { x: (k % 5) + .14, y: Math.floor(k / 5) + .14, width: .72, height: .72, rx: .16, 'class': on ? 'on' : '' }, s);
    });
  });

  /* ------------------------------------------------ board drawing -- */
  function board(svg) {
    var id = 'mb' + (++uid);
    var defs = el('defs', {}, svg);
    var cp = el('clipPath', { id: id + 'c' }, defs);
    el('rect', { x: 10, y: 10, width: 500, height: 400, rx: 30 }, cp);
    var f = el('filter', { id: id + 'g', x: '-1', y: '-1', width: '3', height: '3' }, defs);
    el('feGaussianBlur', { stdDeviation: 6 }, f);

    el('rect', { 'class': 'usb', x: 230, y: 0, width: 60, height: 22, rx: 3 }, svg);
    el('rect', { 'class': 'pcb', x: 10, y: 10, width: 500, height: 400, rx: 30 }, svg);
    var inner = el('g', { 'clip-path': 'url(#' + id + 'c)' }, svg);
    el('rect', { 'class': 'gold', x: 0, y: 316, width: 520, height: 110 }, inner);
    for (var x = 14; x < 510; x += 11) el('rect', { 'class': 'finger', x: x, y: 401, width: 5, height: 14 }, inner);
    [70, 165, 260, 355, 450].forEach(function (px, i) {
      el('circle', { 'class': 'pad', cx: px, cy: 349, r: 26 }, svg);
      el('text', { 'class': 'padlabel', x: px, y: 397 }, svg, ['0', '1', '2', '3V', 'GND'][i]);
    });
    var api = { svg: svg, leds: [], btns: {} };
    el('path', { 'class': 'notch', d: 'M10 40 Q10 10 40 10 H92 L10 92 Z' }, inner);
    el('path', { 'class': 'notch', d: 'M108 10 H136 L108 38 Z', opacity: .55 }, inner);
    el('rect', { 'class': 'logo', x: 226, y: 36, width: 68, height: 30, rx: 15 }, svg);
    el('circle', { 'class': 'logo-dot', cx: 246, cy: 51, r: 5 }, svg);
    el('circle', { 'class': 'logo-dot', cx: 274, cy: 51, r: 5 }, svg);
    [['a', 80, 'A'], ['b', 440, 'B']].forEach(function (b) {
      var g = el('g', { 'class': 'btn', 'data-k': b[0], transform: 'translate(' + b[1] + ' 190)' }, svg);
      el('rect', { 'class': 'btn-house', x: -34, y: -34, width: 68, height: 68, rx: 8 }, g);
      el('circle', { 'class': 'btn-cap', r: 19 }, g);
      el('text', { 'class': 'btn-label', y: -46 }, g, b[2]);
      api.btns[b[0]] = g;
    });
    var glows = el('g', { filter: 'url(#' + id + 'g)' }, svg);
    for (var k = 0; k < 25; k++) {
      var cx = 260 + (k % 5 - 2) * 42, cy = 190 + (Math.floor(k / 5) - 2) * 42;
      var gl = el('circle', { 'class': 'glow', cx: cx, cy: cy, r: 13 }, glows);
      var led = el('rect', { 'class': 'led', x: cx - 5, y: cy - 10, width: 10, height: 20, rx: 2 }, svg);
      api.leds.push([led, gl]);
    }
    if (svg.hasAttribute('data-marks')) {
      // numbers match the list beside the board: 1 buttons, 2 display, 3 pins, 4 USB
      [[1, 126, 148], [1, 486, 148], [2, 368, 92], [3, 212, 326], [4, 318, 24]].forEach(function (m) {
        var g = el('g', { 'class': 'mark', transform: 'translate(' + m[1] + ' ' + m[2] + ')' }, svg);
        el('circle', { r: 15 }, g);
        el('text', {}, g, String(m[0]));
      });
    }
    api.show = function (g) {
      var bits = typeof g === 'string' ? parse(g) : g;
      api.leds.forEach(function (l, i) { l[0].classList.toggle('on', !!bits[i]); l[1].classList.toggle('on', !!bits[i]); });
    };
    api.clear = function () { api.show([]); };
    return api;
  }

  var closeSvg = document.querySelector('.close__board');
  if (closeSvg) {
    var cb = board(closeSvg), beat = null, big = true;
    cb.show(G.heart);
    if (!reduce) new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !beat) beat = setInterval(function () { big = !big; cb.show(big ? G.heart : G.small); }, 640);
      if (!es[0].isIntersecting && beat) { clearInterval(beat); beat = null; }
    }).observe(closeSvg);
  }

  function inView(node, cb) {
    if (!node) return;
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { rootMargin: '80px 0px' }).observe(node);
  }

  /* the class clip plays while it is on screen (muted, short loop) */
  var clip = document.querySelector('.clip video');
  if (clip) {
    var wants = !reduce;
    clip.addEventListener('click', function () { wants = clip.paused; if (clip.paused) clip.play(); else clip.pause(); });
    inView(clip, function (v) {
      if (v && wants) { clip.preload = 'auto'; var p = clip.play(); if (p && p.catch) p.catch(function () {}); }
      if (!v) clip.pause();
    });
  }


  /* ------------------------------------------------ hero: the photo's board is live -- */
  (function () {
    var btn = document.querySelector('.hero__hand');
    if (!btn) return;
    var svg = btn.querySelector('.hero__leds');
    // LED lattice measured on assets/hand.webp (900x1177): origin, across, down
    var O = [296, 344], U = [24, -13], V = [13.5, 23.5];
    function pt(c, r) { return [O[0] + c * U[0] + r * V[0], O[1] + c * U[1] + r * V[1]]; }
    var cs = [pt(-.75, -.75), pt(4.75, -.75), pt(4.75, 4.75), pt(-.75, 4.75)];
    var defs = el('defs', {}, svg);
    var f1 = el('filter', { id: 'hp', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs); el('feGaussianBlur', { stdDeviation: 6 }, f1);
    var f2 = el('filter', { id: 'hg', x: '-200%', y: '-200%', width: '500%', height: '500%' }, defs); el('feGaussianBlur', { stdDeviation: 5 }, f2);
    el('polygon', { 'class': 'patch', points: cs.map(function (q) { return q.join(','); }).join(' '), filter: 'url(#hp)' }, svg);
    var halos = el('g', { filter: 'url(#hg)' }, svg), leds = [];
    var ang = Math.atan2(V[1], V[0]) * 180 / Math.PI - 90;
    for (var k = 0; k < 25; k++) {
      var q = pt(k % 5, Math.floor(k / 5));
      var h = el('circle', { 'class': 'halo', cx: q[0], cy: q[1], r: 9 }, halos);
      var l = el('rect', { 'class': 'led', x: q[0] - 3, y: q[1] - 5.5, width: 6, height: 11, rx: 1.5, transform: 'rotate(' + ang.toFixed(1) + ' ' + q[0] + ' ' + q[1] + ')' }, svg);
      leds.push([l, h]);
    }
    function show(g) { var bits = parse(g); leds.forEach(function (x, i) { x[0].classList.toggle('on', bits[i]); x[1].classList.toggle('on', bits[i]); }); }
    var act = btn.closest('[data-sc-act]'), mode = '', busy = false;
    function byScroll() {
      if (busy) return;
      var p = parseFloat(getComputedStyle(act).getPropertyValue('--sc-p')) || 0;
      var m = p < .3 ? 'heart' : p < .62 ? 'happy' : 'down';
      if (m !== mode) { mode = m; show(G[m]); }
    }
    show(G.heart); mode = 'heart';
    addEventListener('scroll', function () { requestAnimationFrame(byScroll); }, { passive: true });
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      var order = [G.paper, G.rock, G.scissors], hand = Math.floor(Math.random() * 3), n = 0;
      function land() { show(order[hand]); setTimeout(function () { busy = false; mode = ''; byScroll(); }, 1600); }
      if (reduce) return land();
      (function spin() { show(order[n % 3]); if (++n < 8) setTimeout(spin, 70 + n * 12); else land(); })();
    });
  })();

  /* bar turns dark-on-light once the hero has passed */
  (function () {
    var bar = document.querySelector('.bar'), hero = document.querySelector('.hero');
    if (!bar || !hero) return;
    function upd() {
      var r = hero.getBoundingClientRect();
      var onDark = r.bottom > 60 || [].some.call(document.querySelectorAll('.games, .lab'), function (s) { var q = s.getBoundingClientRect(); return q.top < 60 && q.bottom > 60; });
      bar.classList.toggle('is-light', !onDark);
      bar.classList.toggle('is-solid', r.bottom <= 60);
    }
    addEventListener('scroll', upd, { passive: true }); upd();
  })();

  /* AI: the description types, then the game appears */
  (function () {
    var fig = document.querySelector('.prompt');
    if (!fig) return;
    var t = fig.querySelector('.prompt__text'), out = t.querySelector('span'), full = t.getAttribute('data-type');
    t.setAttribute('aria-label', full);
    if (reduce) { out.textContent = full; fig.classList.add('is-done'); return; }
    var started = false;
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || started) return;
      started = true;
      var i = 0;
      (function type() {
        out.textContent = full.slice(0, ++i);
        if (i < full.length) setTimeout(type, full.charAt(i) === ' ' ? 45 : 28);
        else setTimeout(function () { fig.classList.add('is-done'); }, 350);
      })();
    }, { threshold: .2 }).observe(fig);
  })();

  /* ------------------------------------------------------- lab -- */
  (function () {
    var lab = document.querySelector('.lab');
    var svg = lab && lab.querySelector('.lab__board');
    if (!svg) return;
    var b = board(svg);
    var state = lab.querySelector('.lab__state');
    var tabs = lab.querySelectorAll('.tab');
    var keys = lab.querySelectorAll('.key');
    var dial = lab.querySelector('.dial'), range = dial.querySelector('input');
    var prog = 'rps', visible = false;
    var timers = [];
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function stopAll() { timers.forEach(clearTimeout); timers = []; }

    var ac = null;
    function tone(fs) {
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        fs.forEach(function (f, i) {
          var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.11;
          o.type = 'square'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
          o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.12);
        });
      } catch (e) {}
    }
    function say(t) { state.textContent = t; }
    function cur() { return lab.querySelector('.prog[data-prog="' + prog + '"]'); }
    function flash(ev, ms) {
      var m = cur().querySelector('.mk[data-ev="' + ev + '"]');
      if (!m) return;
      m.classList.add('is-live');
      clearTimeout(m._t);
      if (ms !== Infinity) m._t = setTimeout(function () { m.classList.remove('is-live'); }, ms || 750);
    }
    function hit(sel) {
      cur().querySelectorAll('.is-hit').forEach(function (h) { h.classList.remove('is-hit'); });
      if (sel) { var n = cur().querySelector(sel); if (n) n.classList.add('is-hit'); }
    }
    function only(msg) { return function () { say(msg); }; }

    var P = {};

    /* rock, paper, scissors (built in class) */
    var rolling = false;
    P.rps = {
      init: function () { b.clear(); say('לחצו על שקשוק, והלוח יבחר יד.'); },
      a: only('בתוכנית הזו הכפתורים לא עושים כלום. לחצו על שקשוק.'),
      shake: function () {
        if (rolling) return;
        var hand = 1 + Math.floor(Math.random() * 3);
        var order = [G.paper, G.rock, G.scissors], name = ['נייר', 'אבן', 'מספריים'];
        hit(null);
        flash('shake', 1400);
        function land() {
          rolling = false;
          b.show(order[hand - 1]);
          hit('[data-hand="' + hand + '"]');
          say('יד = ' + hand + ': ' + name[hand - 1] + '.');
        }
        if (reduce) return land();
        rolling = true;
        var n = 0;
        (function spin() {
          b.show(order[n % 3]);
          if (++n < 8) later(spin, 70 + n * 12); else land();
        })();
      }
    };
    P.rps.b = P.rps.a;

    /* catch the dot (built in class) */
    var speedEl = lab.querySelector('.speed'), scoreEl = lab.querySelector('.score b');
    var c = { x: 0, dir: 1, delay: 220, score: 0, timer: null, hold: false };
    function step() {
      c.timer = null;
      if (prog !== 'catch' || !visible) return;
      if (!c.hold) {
        var bits = []; bits[10 + c.x] = true; b.show(bits);
        c.shown = c.x;
        if (c.x === 4) c.dir = -1; else if (c.x === 0) c.dir = 1;
        c.x += c.dir;
      }
      c.timer = setTimeout(step, c.delay);
    }
    function runCatch() {
      var loop = cur().querySelector('.mk[data-ev="loop"]');
      var on = prog === 'catch' && visible;
      if (loop) loop.classList.toggle('is-live', on);
      if (on && !c.timer) step();
    }
    P.catch = {
      init: function () {
        c.x = 0; c.dir = 1; c.delay = 220; c.score = 0; c.hold = false;
        scoreEl.textContent = '0'; speedEl.textContent = '220';
        say('לחצו על A בדיוק כשהנקודה באמצע השורה.');
        runCatch();
      },
      a: function () {
        if (c.hold) return;
        flash('a', 500);
        c.hold = true;
        if (c.shown === 2) {
          c.score++; c.delay = Math.max(90, Math.round(c.delay * 0.86));
          scoreEl.textContent = c.score; speedEl.textContent = c.delay;
          b.show(G.yes); tone([880, 1175]); say('בדיוק באמצע. ניקוד: ' + c.score + '. המשחק מאיץ.');
        } else {
          b.show(G.no); tone([220]); say('כמעט. חכו שהנקודה תגיע לאמצע.');
        }
        later(function () { c.hold = false; }, 520);
      },
      b: only('במשחק הזה משתמשים רק בכפתור A.'),
      shake: only('במשחק הזה משתמשים רק בכפתור A.')
    };

    /* dance steps (later this year) */
    var dancing = false;
    P.dance = {
      init: function () { dancing = false; b.clear(); say('לחצו על A, ורקדו לפי החצים.'); },
      a: function () {
        if (dancing) return;
        dancing = true;
        var moves = [G.left, G.right, G.up, G.down], words = ['צעד שמאלה', 'צעד ימינה', 'ידיים למעלה', 'יד לרצפה'];
        var gap = reduce ? 1000 : 1000, i = 0;
        flash('a', Infinity);
        (function next() {
          if (i >= 16) {
            dancing = false; b.clear(); hit(null);
            cur().querySelector('.mk').classList.remove('is-live');
            say('הרצף חזר 4 פעמים, והמסך נוקה.');
            return;
          }
          var m = i % 4;
          b.show(moves[m]); hit('[data-move="' + m + '"]'); tone([m === 2 ? 784 : 523]);
          say('סיבוב ' + (Math.floor(i / 4) + 1) + ' מתוך 4: ' + words[m] + '.');
          i++;
          later(next, gap);
        })();
      },
      b: only('הריקוד מתחיל בכפתור A.'),
      shake: only('הריקוד מתחיל בכפתור A.')
    };

    /* step counter (later this year) */
    var steps = 0;
    function showNum(n) {
      stopAll();
      var s = String(n);
      if (s.length === 1) return b.show(D[n]);
      var k = 0;
      (function nx() {
        if (k >= s.length) return;
        b.show(D[+s.charAt(k)]);
        // a gap between digits so 11 reads as two ones
        later(function () { b.clear(); later(nx, 90); }, 420);
        k++;
      })();
    }
    P.steps = {
      init: function () { steps = 0; flash('start', 900); b.show(D[0]); say('כל שקשוק הוא צעד. A מאפס.'); },
      shake: function () { steps++; flash('shake', 500); showNum(steps); say('צעדים: ' + steps); },
      a: function () { steps = 0; flash('a', 500); showNum(0); say('המונה התאפס.'); },
      b: only('במד הצעדים משתמשים בשקשוק ובכפתור A.')
    };

    /* compass (later this year) */
    function heading() {
      var h = +range.value;
      var d = h < 45 || h >= 315 ? 'N' : h < 135 ? 'E' : h < 225 ? 'S' : 'W';
      b.show(G[d]); hit('[data-dir="' + d + '"]');
      svg.style.transform = 'rotate(' + h + 'deg)';
      say('כיוון: ' + h + ' מעלות. על המסך: ' + d + '.');
    }
    range.addEventListener('input', function () { if (prog === 'compass') heading(); });
    P.compass = {
      init: function () { cur().querySelector('.mk').classList.add('is-live'); heading(); },
      a: only('במצפן אין כפתורים. הזיזו את הסליידר.'),
      b: only('במצפן אין כפתורים. הזיזו את הסליידר.'),
      shake: only('במצפן אין כפתורים. הזיזו את הסליידר.')
    };

    function press(k) {
      var key = lab.querySelector('.key[data-key="' + k + '"]');
      if (key) { key.classList.add('is-down'); setTimeout(function () { key.classList.remove('is-down'); }, 140); }
      if (k === 'shake') {
        svg.classList.remove('is-shake'); void svg.getBoundingClientRect(); svg.classList.add('is-shake');
      } else if (b.btns[k]) {
        b.btns[k].classList.add('is-down'); setTimeout(function () { b.btns[k].classList.remove('is-down'); }, 140);
      }
      var h = P[prog][k]; if (h) h();
    }

    function setProg(p) {
      prog = p;
      stopAll();
      if (c.timer) { clearTimeout(c.timer); c.timer = null; }
      rolling = false; dancing = false;
      svg.style.transform = '';
      tabs.forEach(function (t) { var on = t.getAttribute('data-prog') === p; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      lab.querySelectorAll('.prog').forEach(function (d) { d.hidden = d.getAttribute('data-prog') !== p; });
      lab.querySelectorAll('.mk').forEach(function (m) { m.classList.remove('is-live'); });
      lab.querySelectorAll('.is-hit').forEach(function (m) { m.classList.remove('is-hit'); });
      dial.hidden = p !== 'compass';
      lab.querySelector('.ctrl').hidden = p === 'compass';
      P[p].init();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setProg(t.getAttribute('data-prog')); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL
        if (!d) return;
        e.preventDefault();
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); setProg(n.getAttribute('data-prog'));
      });
    });

    var askedMotion = false;
    keys.forEach(function (k) {
      k.addEventListener('click', function () {
        var key = k.getAttribute('data-key');
        if (key === 'shake' && !askedMotion && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
          askedMotion = true;
          DeviceMotionEvent.requestPermission().then(function (r) { if (r === 'granted') listenMotion(); }).catch(function () {});
        }
        press(key);
      });
    });
    ['a', 'b'].forEach(function (k) {
      var g = b.btns[k];
      g.setAttribute('role', 'button'); g.setAttribute('tabindex', '0'); g.setAttribute('aria-label', 'כפתור ' + k.toUpperCase());
      g.addEventListener('click', function () { press(k); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(k); } });
    });
    lab.addEventListener('keydown', function (e) {
      if (e.target.closest('.btn') || e.target.matches('input') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyA') press('a'); else if (e.code === 'KeyB') press('b'); else if (e.code === 'KeyS') press('shake');
    });

    // shaking a real phone counts too
    var lastShake = 0, listening = false;
    function listenMotion() {
      if (listening) return; listening = true;
      addEventListener('devicemotion', function (e) {
        var a = e.accelerationIncludingGravity; if (!a || !visible) return;
        var m = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0));
        var now = Date.now();
        if (m > 24 && now - lastShake > 900) { lastShake = now; press('shake'); }
      });
    }
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission !== 'function') listenMotion();

    inView(lab.querySelector('.lab__device'), function (v) { visible = v; runCatch(); });
    setProg('rps');
  })();
})();
