/* Page behaviour. One scope: nothing here leaks onto window (the shared state is window.qx*, set by jbang.js). */
(function () {
function toggleTheme(btn) {
  var root = document.documentElement;
  var dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  var next = dark ? 'light' : 'dark';
  function apply() { root.dataset.theme = next; try { localStorage.setItem('theme', next); } catch (e) {} }
  if (!btn || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply();
  // the new theme spreads out in a circle from the button
  var r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2,
      R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.style.setProperty('--vt-x', x + 'px'); root.style.setProperty('--vt-y', y + 'px'); root.style.setProperty('--vt-r', R + 'px');
  root.classList.add('vt');   // snapshots drop the header's blur: keep it opaque while the circle spreads
  document.startViewTransition(apply).finished.finally(function () { root.classList.remove('vt'); });
}
document.querySelectorAll('.theme-toggle, .theme-toggle-m').forEach(function (b) { b.addEventListener('click', function () { toggleTheme(b); }); });

/* Reduced motion stops movement: sliding reveals, smooth scrolling, flying packets, spinning icons.
   Text that types in place still plays: it moves nothing, and it is the demo itself. */
var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Addresses: state lives in the query (?demo=Embed.java, ?bench=gemma4:Q4_0), never in the hash. Any change to
   the query is a page load, so a link, a reload or the same address again all land on the right section
   (Anchors below), and the links stay short: no #section needed. */
function pageUrl(set, hash) {   // the current query with `set` applied (null deletes), plus a #section or ''
  var q = new URLSearchParams(location.search);
  Object.keys(set).forEach(function (k) { if (set[k] == null) q.delete(k); else q.set(k, set[k]); });
  var s = q.toString().replace(/%3A/gi, ':');   // ?bench=gemma4:Q4_0 reads better than gemma4%3AQ4_0
  return location.pathname + (s ? '?' + s : '') + hash;
}
(function () {   // old links keep working: #explore, and #bench=family:quant from before the query
  var old = /^#bench=(.+)$/.exec(location.hash);
  if (old) history.replaceState(null, '', pageUrl({ bench: decodeURIComponent(old[1]), demo: null }, ''));
  else if (location.hash === '#explore') history.replaceState(null, '', pageUrl({}, '#benchmarks'));
})();

/* ── Nav hairline once scrolled: a sentinel at the top of the page, no scroll listener ── */
(function () {
  var top = document.getElementById('top'), probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
  document.body.prepend(probe);
  new IntersectionObserver(function (es) { top.classList.toggle('stuck', !es[0].isIntersecting); }).observe(probe);
})();

/* ── Copy buttons (fall back to selecting the text) ── */
function copyText(text, btn, el) {
  function done() {
    if (btn.classList.contains('cc-copy')) { btn.classList.add('ok'); btn.setAttribute('aria-label', 'Copied'); setTimeout(function () { btn.classList.remove('ok'); btn.setAttribute('aria-label', 'Copy address'); }, 1400); return; }
    if (btn.dataset.label == null) btn.dataset.label = btn.innerHTML;   // the original, kept across quick repeat clicks
    clearTimeout(btn._t); btn.textContent = 'Copied'; btn._t = setTimeout(function () { btn.innerHTML = btn.dataset.label; }, 1400);
  }
  function select() { if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  try { navigator.clipboard.writeText(text).then(done, select); } catch (e) { select(); }
}
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var el = document.getElementById(btn.dataset.copy);
    copyText(el.dataset.text || el.textContent.replace(/^\$\s*/, ''), btn, el);
  });
});

/* ── Code tabs ── */
function openTab(name, push) {
  var tab = document.querySelector('.code-tab[data-tab="' + name + '"]');
  if (!tab) return;
  var a = document.querySelector('.code-tab.active'), p = document.querySelector('.code-panel.active');
  if (a) a.classList.remove('active');
  if (p) p.classList.remove('active');
  tab.classList.add('active');
  var panel = document.getElementById('panel-' + name); panel.classList.add('active');
  var snip = panel.querySelector('.jbang'); if (snip && window.qxRender) window.qxRender(snip);
  var bar = tab.parentNode; bar.scrollLeft = tab.offsetLeft - bar.offsetLeft - 16;
  if (push) history.replaceState(null, '', pageUrl({ demo: tab.dataset.demo || tab.textContent, bench: null }, ''));
  syncTabs();
}
/* Accessible tabs: roles and states for screen readers, roving focus for the keyboard. */
function syncTabs() {
  var list = document.querySelector('.code-tabs'); if (!list) return;
  list.setAttribute('role', 'tablist'); list.setAttribute('aria-label', 'Runnable examples');
  list.querySelectorAll('.code-tab').forEach(function (t) {
    var on = t.classList.contains('active'), panel = document.getElementById('panel-' + t.dataset.tab);
    t.type = 'button'; t.id = 'tab-' + t.dataset.tab; t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', on); t.setAttribute('aria-controls', 'panel-' + t.dataset.tab); t.tabIndex = on ? 0 : -1;
    if (panel) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', t.id); panel.tabIndex = 0; }
  });
}
(function () {
  var list = document.querySelector('.code-tabs'); if (!list) return;
  list.addEventListener('keydown', function (e) {
    var tabs = [].slice.call(list.querySelectorAll('.code-tab')), i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (j === undefined) return;
    e.preventDefault();
    var t = tabs[(j + tabs.length) % tabs.length];
    openTab(t.dataset.tab, true); t.focus();
  });
  syncTabs();
})();
document.querySelectorAll('.code-tab').forEach(function (tab) { tab.addEventListener('click', function () { openTab(tab.dataset.tab, true); }); });
document.querySelectorAll('[data-tab-link]').forEach(function (a) { a.addEventListener('click', function () { openTab(a.dataset.tabLink, true); }); });   // the address names the tab it opened

/* ── Headline words rise ── */
document.querySelectorAll('h1 .w').forEach(function (w, i) { w.style.animationDelay = (.08 + i * .07) + 's'; });

/* ── Streaming text: output arrives token by token ── */
var runs = new WeakMap();
function claim(el) { var id = (runs.get(el) || 0) + 1; runs.set(el, id); return id; }
function stream(el, text, done) {
  var id = claim(el);
  el.textContent = '';
  var toks = text.match(/\s*[^\s]{1,5}/g) || [], i = 0;
  (function step() {
    if (runs.get(el) !== id) return;
    if (i >= toks.length) { if (done) done(); return; }
    var t = document.createElement('span'); t.className = 'tok'; t.textContent = toks[i++]; el.appendChild(t);
    setTimeout(step, 30 + Math.random() * 55);
  })();
}
function typeIn(el, html, done) {
  var id = claim(el);
  el.innerHTML = html;
  var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
  while ((n = walk.nextNode())) { nodes.push([n, n.textContent]); n.textContent = ''; }
  var k = 0, pos = 0;
  el.classList.add('typing');
  (function step() {
    if (runs.get(el) !== id) return;
    for (var b = 4 + (Math.random() * 4 | 0); b > 0 && k < nodes.length; b--) {
      pos++; nodes[k][0].textContent = nodes[k][1].slice(0, pos);
      if (pos >= nodes[k][1].length) { k++; pos = 0; }
    }
    if (k < nodes.length) return setTimeout(step, 16);
    el.classList.remove('typing');
    if (done) done();
  })();
}

/* ── Hero console: the real jbang files, run as a session ── */
(function () {
  var S = window.qxSnippet;
  var wave = '<span class="mini-wave" aria-hidden="true">' + [5, 9, 12, 7, 13, 10, 4, 8, 12, 6, 10, 5].map(function (h) { return '<i style="height:' + h + 'px"></i>'; }).join('') + '</span>';
  var demos = [
    { file: 'Chat.java', model: 'LFM2.5-350M · Q8_0', input: '<span class="in">&#8627; prompt</span><q>What is the capital of France?</q>', out: 'The capital of France is Paris.' },
    { file: 'Vision.java', model: 'LFM2.5-VL-3B · Q8_0', input: '<span class="in">&#8627; image</span><img src="snippets/consuegra.webp" alt="" decoding="async"> consuegra.jpg', out: 'I see a picturesque scene of several traditional windmills standing tall on a hill under a clear blue sky. …' },
    { file: 'Parakeet.java', model: 'Parakeet TDT 0.6B · Q8_0', input: '<span class="in">&#8627; audio</span>' + wave + ' jfk.wav · 11 s', out: 'And so, my fellow Americans, ask not what your country can do for you, ask what you can do for your country.' },
    { file: 'Decision.java', model: 'd1-2B · Q8_0', input: '<span class="in">&#8627; 3 comments</span> on Star Wars', out: '0.02  The asteroid field chase is the best scene.\n0.75  [SPOILER]\n0.10  Han Solo is the coolest character.', mono: true }
  ];
  demos.forEach(function (d) {
    d.ready = window.qxText('snippets/' + d.file).then(function (t) { d.text = t.replace(/\r\n/g, '\n'); return d; });
  });
  var con = document.getElementById('console'), code = document.getElementById('con-code'), cmd = document.getElementById('con-cmd'),
      log = document.getElementById('con-log'), ans = document.getElementById('con-ans'), status = document.getElementById('con-status'),
      prog = document.getElementById('con-prog'), copyBtn = document.getElementById('con-copy'), tabs = document.querySelectorAll('.ctab'),
      k = 0, seq = 0, timer = 0, spin = 0, visible = true, hover = false, started = false, HOLD = 5200;
  var FR = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

  function fold(label, body) {
    var lines = body.split('\n').length;
    return '<details><summary>' + label + ' <span>' + lines + ' lines</span></summary>' + S.highlight(body) + '\n</details>';
  }
  function parts(d) {
    var p = S.split(d.text);
    return {
      head: p.head ? fold('jbang header + imports', p.head) + '\n' : '',
      main: S.highlight(p.main),
      tail: p.tail ? '\n\n' + fold('helper code', p.tail) : ''
    };
  }
  function loaded(d) { return '<div><span class="ok">&check;</span> ' + d.model + ' loaded, <span class="nw">in-process</span></div><div>' + d.input + '</div>'; }
  function select(n) { tabs.forEach(function (t, i) { t.classList.toggle('on', i === n); t.setAttribute('aria-pressed', i === n); }); }
  function gen(on) { status.classList.toggle('gen', on); status.textContent = on ? 'generating' : 'in-process'; ans.classList.toggle('live', on); }

  /* The console never resizes: it reserves the finished height of its tallest demo, so typing and switching
     demos don't push the page below around. Measured on a hidden copy (the live demo is never touched), again
     whenever the width changes or the web fonts arrive, since line wraps depend on both. */
  var body = code.closest('.cbody'), codePane = code.parentNode, outPane = ans.parentNode, tags = document.getElementById('con-model').parentNode, reserved = 0;
  function reserve() {
    if (!demos.every(function (d) { return d.text; })) return;
    var probe = body.cloneNode(true);
    probe.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
    probe.style.cssText = 'position:absolute;top:0;left:0;width:' + body.offsetWidth + 'px;visibility:hidden;align-items:start;pointer-events:none';
    var pc = probe.querySelector('.code-pane'), po = probe.querySelector('.con-out'), pre = pc.querySelector('pre'),
        pcmd = po.querySelector('.cmdl'), plog = po.querySelector('.log'), pans = po.querySelector('.ans'), pmodel = po.querySelector('.tags span:last-child'), ptags = pmodel.parentNode;
    [pc, po, plog, ptags].forEach(function (e) { e.style.minHeight = ''; });
    con.appendChild(probe);
    function fill(d) {
      var p = parts(d);
      pre.innerHTML = p.head + '<span class="cmain">' + p.main + '</span>' + p.tail;
      pcmd.innerHTML = '<b>$ </b>jbang ' + d.file; plog.innerHTML = loaded(d);
      pans.textContent = d.out; pans.classList.toggle('mono', !!d.mono); pmodel.textContent = d.model.split(' · ')[0];
    }
    // first the parts that wrap on phones (the log and the tags), then the panes with those parts reserved
    var hc = 0, ho = 0, hl = 0, ht = 0;
    demos.forEach(function (d) { fill(d); hl = Math.max(hl, plog.offsetHeight); ht = Math.max(ht, ptags.offsetHeight); });
    plog.style.minHeight = hl + 'px'; ptags.style.minHeight = ht + 'px';
    demos.forEach(function (d) { fill(d); hc = Math.max(hc, pc.offsetHeight); ho = Math.max(ho, po.offsetHeight); });
    con.removeChild(probe);
    codePane.style.minHeight = hc + 'px'; outPane.style.minHeight = ho + 'px'; log.style.minHeight = hl + 'px'; tags.style.minHeight = ht + 'px';
    reserved = body.offsetWidth;
  }
  Promise.all(demos.map(function (d) { return d.ready; })).then(function () { return document.fonts.ready; }).then(reserve, function () {});
  new ResizeObserver(function () { if (body.offsetWidth !== reserved) requestAnimationFrame(reserve); }).observe(body);

  copyBtn.addEventListener('click', function () { var d = demos[k]; if (d.text) copyText(d.text, copyBtn, code); });
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });

  function show(n) {
    var my = ++seq, d = demos[n];
    started = true;
    k = n; select(n);
    clearTimeout(timer); clearInterval(spin);
    prog.classList.remove('run');
    claim(ans); claim(cmd);
    gen(false);
    document.getElementById('con-model').textContent = d.model.split(' · ')[0];
    d.ready.then(function () {
      if (my !== seq) return;
      var p = parts(d);
      code.classList.add('swap');
      timer = setTimeout(function () {
        if (my !== seq) return;
        cmd.innerHTML = ''; log.innerHTML = ''; ans.innerHTML = '';
        ans.classList.toggle('mono', !!d.mono);   // printed output, kept exactly as the program prints it
        code.innerHTML = p.head + '<span class="cmain"></span>' + p.tail;
        code.classList.remove('swap');
        typeIn(code.querySelector('.cmain'), p.main, function () {
          if (my !== seq) return;
          typeIn(cmd, '<b>$ </b>jbang ' + d.file, function () {
            if (my !== seq) return;
            var line = document.createElement('div'), f = 0;
            log.appendChild(line);
            line.innerHTML = '<span class="sp">' + FR[0] + '</span> loading ' + d.model;
            spin = setInterval(function () { line.firstChild.textContent = FR[++f % FR.length]; }, 80);
            timer = setTimeout(function () {
              if (my !== seq) return;
              clearInterval(spin); log.innerHTML = loaded(d);
              timer = setTimeout(function () {
                if (my !== seq) return;
                gen(true);
                stream(ans, d.out, function () {
                  if (my !== seq) return;
                  gen(false);
                  prog.style.transitionDuration = HOLD + 'ms'; void prog.offsetWidth; prog.classList.add('run');
                  timer = setTimeout(next, HOLD);
                });
              }, 350);
            }, 900);
          });
        });
      }, 260);
    }).catch(function (e) { console.warn('hero demo:', e); });   // the static first example stays
  }
  function next() {
    if (!visible || hover || document.hidden || con.querySelector('details[open]')) { timer = setTimeout(next, 500); return; }
    show((k + 1) % demos.length);
  }
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(con);
  // the first demo plays where it can be seen: on load on desktop, on scrolling to it on phones,
  // and never sooner than 1.1 s after load (a tab click before then starts it instead)
  new IntersectionObserver(function (es, io) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    if (!started) timer = setTimeout(function () { show(0); }, Math.max(0, 1100 - performance.now()));
  }, { threshold: .35 }).observe(con);
  // only a mouse pauses the demos: a tap reports pointerenter without a pointerleave
  con.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
  con.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
})();

/* ── Reveal on scroll + active section in nav ── */
var io = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
    e.target.dispatchEvent(new Event('reveal'));
  });
}, { rootMargin: '0px 0px -40px 0px' });
/* the menu (phones, tablets) mirrors the header's section links */
(function () {
  var top = document.getElementById('top'), btn = top.querySelector('.menu-btn'), menu = document.getElementById('menu'), list = menu.querySelector('ol');
  top.querySelectorAll('nav.links a').forEach(function (a, i) {
    var li = document.createElement('li'); li.style.setProperty('--i', i); li.appendChild(a.cloneNode(true)); list.appendChild(li);
  });
  function set(open) {
    menu.classList.toggle('open', open); top.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open); btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  }
  btn.addEventListener('click', function () { var open = !menu.classList.contains('open'); set(open); if (open) list.querySelector('a').focus(); });
  top.addEventListener('focusout', function (e) { if (menu.classList.contains('open') && e.relatedTarget && !top.contains(e.relatedTarget)) set(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function (e) { if (menu.classList.contains('open') && !top.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); btn.focus(); } });
  matchMedia('(min-width: 1001px)').addEventListener('change', function (m) { if (m.matches) set(false); });
})();

var spy = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    document.querySelectorAll('nav.links a, #menu li a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('nav.links a').forEach(function (a) { var s = document.getElementById(a.getAttribute('href').slice(1)); if (s) spy.observe(s); });

/* ── Capability demos ── */
(function () {
  var grid = document.querySelector('.bento');
  grid.addEventListener('reveal', function () {
    var chat = grid.querySelector('.bubble-a'), see = grid.querySelector('.see-a');
    // hold the final height while the answers type in, so nothing below jumps
    [chat, see].forEach(function (el) { el.style.minHeight = el.offsetHeight + 'px'; setTimeout(function () { el.style.minHeight = ''; }, 9000); });
    chat.textContent = ''; see.textContent = '';
    setTimeout(function () { stream(chat, chat.dataset.type); }, 700);
    setTimeout(function () { stream(see, see.dataset.type); }, 1200);
    grid.querySelectorAll('.sim-row').forEach(function (row) {
      var bar = row.querySelector('.sim-bar i'), num = row.querySelector('b'), target = parseFloat(bar.dataset.w) / 100;
      num.textContent = '0.000';
      setTimeout(function () {
        bar.style.width = bar.dataset.w + '%';
        var t0 = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 4);
          num.textContent = (target * e).toFixed(3);
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      }, 600);
    });
  });

  var wave = document.getElementById('speak-wave');
  for (var j = 0; j < 72; j++) {
    var bar = document.createElement('i');
    bar.style.setProperty('--h', (14 + 80 * Math.abs(Math.sin(j * 0.47) * Math.cos(j * 0.13 + 1))).toFixed(0) + '%');
    bar.style.setProperty('--d', (-(j % 11) * 0.1).toFixed(2) + 's');
    wave.appendChild(bar);
  }

  // transcript follows the audio: spoken words turn dark, the current one cobalt
  var tx = document.getElementById('hear-text'), words = tx.textContent.split(' ');
  tx.innerHTML = '';
  words.forEach(function (w, i) { var s = document.createElement('span'); s.textContent = w + (i < words.length - 1 ? ' ' : ''); tx.appendChild(s); });
  var spans = tx.querySelectorAll('span'), t0 = 0.35, t1 = 10.4, total = 0, starts = [];
  words.forEach(function (w) { total += w.length + 2; });
  words.reduce(function (acc, w) { starts.push(t0 + (t1 - t0) * acc / total); return acc + w.length + 2; }, 0);
  var audio = document.getElementById('hear-audio'), btn = document.getElementById('hear-play'), icon = btn.querySelector('use');
  function paint() {
    var t = audio.currentTime, cur = -1;
    starts.forEach(function (st, i) { if (t >= st) cur = i; });
    spans.forEach(function (s, i) { s.classList.toggle('lit', i < cur); s.classList.toggle('now', i === cur); });
    if (!audio.paused) requestAnimationFrame(paint);
  }
  btn.addEventListener('click', function () { if (audio.paused) { if (audio.ended) audio.currentTime = 0; audio.play(); } else audio.pause(); });
  audio.addEventListener('play', function () { icon.setAttribute('href', '#i-pause'); btn.setAttribute('aria-pressed', 'true'); paint(); });
  audio.addEventListener('pause', function () { icon.setAttribute('href', '#i-play'); btn.setAttribute('aria-pressed', 'false'); });
  audio.addEventListener('ended', function () { icon.setAttribute('href', '#i-play'); spans.forEach(function (s) { s.classList.add('lit'); s.classList.remove('now'); }); });
})();

document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

/* ── Benchmarks: headline numbers, per-family bars, explorer table ── */
(function () {
  var FAM = { 'lfm2.5': 'LFM 2.5', 'gemma4': 'Gemma 4', 'qwen3.5': 'Qwen 3.5+', 'gpt-oss': 'GPT-OSS', 'granite4.2': 'Granite',
              'nemotron': 'Nemotron', 'mellum2': 'Mellum', 'minicpm5': 'MiniCPM', 'ling3': 'Ling', 'laguna': 'Laguna' };
  var TIP = { 'lfm2.5': 'Liquid AI · Liquid Foundation Models', 'gemma4': 'Google DeepMind · open-weight Gemma line', 'qwen3.5': 'Alibaba · Qwen 3.5+',
              'gpt-oss': 'OpenAI · open-weight models', 'granite4.2': 'IBM · Granite 4.2', 'nemotron': 'NVIDIA · Nemotron Cascade',
              'mellum2': 'JetBrains · Mellum 2', 'minicpm5': 'OpenBMB · MiniCPM 5', 'ling3': 'inclusionAI (Ant Group) · Ling 3', 'laguna': 'Poolside · Laguna XS' };
  var ALIAS = { 'qwen3.6': 'qwen3.5', 'qwen3.8': 'qwen3.5' };
  var RAW = { 'qwen3.5': 'Qwen 3.5', 'qwen3.6': 'Qwen 3.6', 'qwen3.8': 'Qwen 3.8', 'granite4.2': 'Granite 4.2', 'mellum2': 'Mellum 2', 'minicpm5': 'MiniCPM 5', 'ling3': 'Ling 3' };
  function famOf(r) { return ALIAS[r.family] || r.family; }
  var QUANTS = ['Q4_0', 'QAD-Q4_0', 'QAT-Q4_0', 'Q4_K_M', 'UD-Q4_K_M', 'Q5_K_M', 'UD-Q5_K_M', 'Q6_K', 'UD-Q6_K', 'Q8_0', 'MXFP4_MOE', 'BF16', 'F16'];
  var filtersEl = document.getElementById('bench-filters'), tableEl = document.getElementById('bench-table'),
      noteEl = document.getElementById('bench-note'), explore = document.getElementById('benchmarks');

  // the data loads when the benchmark section gets close, not with the first screen
  function loadBench() {
    window.qxLoads++;   // anchor jumps stay aligned until the table is in (see Anchors below)
    fetch('benchmarks.csv').then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(start)
      .catch(function () { noteEl.innerHTML = 'Could not load the data. Raw numbers: <a href="benchmarks.csv">benchmarks.csv</a>'; })
      .then(function () { window.qxLoads--; });
  }
  var benchSec = document.getElementById('performance');
  if (benchSec && !/^#(performance|benchmarks)$/.test(location.hash) && !new URLSearchParams(location.search).has('bench')) {
    var bio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { bio.disconnect(); loadBench(); } }, { rootMargin: '1500px 0px' });
    bio.observe(benchSec);
  } else loadBench();

  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }

  function start(text) {
    var lines = text.trim().split('\n'), head = lines.shift().split(',');
    var data = lines.map(function (line) { var cells = line.split(','), row = {}; head.forEach(function (h, i) { row[h] = cells[i]; }); return row; });
    var families = Object.keys(FAM).filter(function (f) { return data.some(function (r) { return famOf(r) === f; }); });
    data.forEach(function (r) { var f = famOf(r); if (families.indexOf(f) === -1) { if (FAM[f] === undefined) FAM[f] = f; families.push(f); } });

    var pairs = {}, models = {};
    data.forEach(function (r) {
      models[r.family + '|' + r.model] = 1;
      var key = r.family + '|' + r.model + '|' + r.quant + '|' + r.test;
      (pairs[key] = pairs[key] || { fam: famOf(r), test: r.test })[r.engine] = parseFloat(r.tps);
    });
    var ratios = { pp512: {}, tg128: {} }, all = { pp512: [], tg128: [] };
    Object.keys(pairs).forEach(function (key) {
      var p = pairs[key];
      if (!p.jinfer || !p.llama || !ratios[p.test]) return;
      var r = p.jinfer / p.llama;
      (ratios[p.test][p.fam] = ratios[p.test][p.fam] || []).push(r);
      all[p.test].push(r);
    });
    function setStat(name, v) {   // a figure that is counting up picks up the new value as its target
      document.querySelectorAll('[data-stat="' + name + '"]').forEach(function (el) { if (el.dataset.final != null && !el.dataset.done) el.dataset.final = v; else el.textContent = v; });
    }
    setStat('pp', median(all.pp512).toFixed(2));
    setStat('configs', all.pp512.length);

    var pickFamily = function () {};

    /* per-family median bars; the dashed line is llama.cpp at 1× */
    function chart(id, test) {
      var host = document.getElementById(id);
      var items = Object.keys(ratios[test]).map(function (f) {
        var rs = ratios[test][f];
        return { f: f, med: median(rs), min: Math.min.apply(null, rs), max: Math.max.apply(null, rs), n: rs.length };
      }).sort(function (a, b) { return b.med - a.med; });
      var top = Math.max(2, Math.ceil(Math.max.apply(null, items.map(function (d) { return d.med; })) + 0.25));
      var html = '';
      items.forEach(function (d, i) {
        html += '<button type="button" class="crow" data-f="' + d.f + '" title="' + FAM[d.f] + ': median ' + d.med.toFixed(2) + '×, ' + d.n + ' configs, range ' + d.min.toFixed(2) + '–' + d.max.toFixed(2) + '×">' +
          '<span>' + FAM[d.f] + '</span><span class="tr"><i style="--w:' + (d.med / top * 100).toFixed(1) + '%;--b:' + (Math.min(1, 1 / d.med) * 100).toFixed(1) + '%;--i:' + i + '"></i></span><b' + (d.med >= 1.05 ? ' class="win"' : '') + '>' + d.med.toFixed(2) + '×</b></button>';
      });
      html += '<div class="one" style="left:calc(var(--lw) + .9rem + (100% - var(--lw) - var(--vw) - 1.8rem) * ' + (1 / top).toFixed(4) + ')"><span>llama.cpp 1×</span></div>';
      host.innerHTML = html;
      host.querySelectorAll('.crow').forEach(function (b) { b.addEventListener('click', function () { pickFamily(b.dataset.f); }); });
    }
    chart('chart-pp', 'pp512');
    chart('chart-tg', 'tg128');

    /* explorer */
    var m = /^([^:]+):(.+)$/.exec(new URLSearchParams(location.search).get('bench') || '');
    var state = { family: m && families.indexOf(m[1]) !== -1 ? m[1] : families[0], quant: m ? m[2] : 'Q8_0' };
    function quantsFor(family) { var qs = {}; data.forEach(function (r) { if (famOf(r) === family) qs[r.quant] = 1; }); return QUANTS.filter(function (q) { return qs[q]; }); }
    function pills(label, options, selected, names, onPick) {
      var row = document.createElement('div'); row.className = 'bench-filter';
      var lab = document.createElement('span'); lab.className = 'bench-filter-label'; lab.textContent = label; row.appendChild(lab);
      options.forEach(function (opt) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'bench-pill' + (opt === selected ? ' active' : '');
        b.textContent = names ? names[opt] : opt;
        if (names && TIP[opt]) b.setAttribute('data-tip', TIP[opt]);
        b.addEventListener('click', function () { onPick(opt); });
        row.appendChild(b);
      });
      return row;
    }
    function modelSize(s) { var x = s.match(/([\d.]+)\s*B/i); if (x) return parseFloat(x[1]); x = s.match(/([\d.]+)\s*M/i); return x ? parseFloat(x[1]) / 1000 : 0; }
    var NF = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });   // one formatter, reused for every cell
    function fmt(v) { v = parseFloat(v); return v >= 100 ? NF.format(v) : v.toFixed(1); }
    function deltaCell(j, l) {
      if (!j || !l) return '<td class="num">—</td>';
      var r = parseFloat(j.tps) / parseFloat(l.tps), cls = r >= 1.05 ? 'up' : (r <= 0.95 ? 'down' : 'flat');
      return '<td class="num"><span class="delta ' + cls + '">' + r.toFixed(2) + '×</span></td>';
    }
    function render(syncUrl) {
      var qs = quantsFor(state.family);
      if (qs.indexOf(state.quant) === -1) state.quant = qs.indexOf('Q8_0') !== -1 ? 'Q8_0' : qs[0];
      if (syncUrl) history.replaceState(null, '', pageUrl({ bench: state.family + ':' + state.quant, demo: null }, ''));
      filtersEl.textContent = '';
      filtersEl.appendChild(pills('Model family', families, state.family, FAM, function (f) { state.family = f; render(true); }));
      filtersEl.appendChild(pills('Quantization', qs, state.quant, null, function (q) { state.quant = q; render(true); }));
      var rows = data.filter(function (r) { return famOf(r) === state.family && r.quant === state.quant; });
      var names = [];
      rows.forEach(function (r) { if (names.indexOf(r.model) === -1) names.push(r.model); });
      names.sort(function (a, b) { return modelSize(a) - modelSize(b); });
      var html = '<thead><tr><th></th><th class="grp sep" colspan="3">Prompt processing · pp512</th><th class="grp sep" colspan="3">Generation · tg128</th></tr>' +
        '<tr><th class="model-th">Model</th><th class="sep j">jinfer <i>t/s</i></th><th>llama.cpp <i>t/s</i></th><th>ratio</th><th class="sep j">jinfer <i>t/s</i></th><th>llama.cpp <i>t/s</i></th><th>ratio</th></tr></thead><tbody>';
      names.forEach(function (model) {
        function pick(engine, test) { return rows.filter(function (r) { return r.model === model && r.engine === engine && r.test === test; })[0]; }
        var jp = pick('jinfer', 'pp512'), lp = pick('llama', 'pp512'), jt = pick('jinfer', 'tg128'), lt = pick('llama', 'tg128'), ref = jp || jt || lp || lt;
        html += '<tr><td><div class="bm-name">' + (RAW[ref.family] || FAM[state.family]) + ' ' + model + '</div>' +
          '<div class="bm-ref"><a href="https://huggingface.co/' + ref.repo + '" target="_blank" rel="noopener noreferrer" title="' + ref.type_mix + '">' + ref.file + '</a></div></td>' +
          '<td class="num j sep">' + (jp ? fmt(jp.tps) : '—') + '</td><td class="num">' + (lp ? fmt(lp.tps) : '—') + '</td>' + deltaCell(jp, lp) +
          '<td class="num j sep">' + (jt ? fmt(jt.tps) : '—') + '</td><td class="num">' + (lt ? fmt(lt.tps) : '—') + '</td>' + deltaCell(jt, lt) + '</tr>';
      });
      tableEl.innerHTML = html + '</tbody>';
      /* group builds per engine: "jinfer a / b vs. llama.cpp c / d" */
      var builds = {}; rows.forEach(function (r) {
        var i = r.engine_build.indexOf(' '), e = r.engine_build.slice(0, i), h = r.engine_build.slice(i + 1);
        (builds[e] = builds[e] || {})[h] = 1;
      });
      var jvm = (rows.filter(function (r) { return r.jvm; })[0] || {}).jvm;
      noteEl.innerHTML = '<b>Measured on</b> ' + rows[0].cpu + ', ' + rows[0].threads + ' threads, CPU only · Linux ' + rows[0].kernel.split('-')[0] + (jvm ? ' · ' + jvm : '') + ' · ' +
        Object.keys(builds).sort().map(function (e) { return e + ' ' + Object.keys(builds[e]).sort().join(' / '); }).join(' vs. ');
    }
    pickFamily = function (f) {
      state.family = f; render(true);
      explore.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      var wrap = tableEl.parentNode; wrap.classList.remove('flash'); void wrap.offsetWidth; wrap.classList.add('flash');
    };
    render();   // a ?bench= link lands on the table through Anchors below
  }
})();

/* 01 problem, "two-system way" diagram: stacks vertically on phones so its labels stay readable. */
(function () {
  var svg = document.querySelector('#vs .old .dg'); if (!svg) return;
  var L = {
    wide: { vb: '0 0 480 200', bnd: [[2,40,128,120],[290,6,188,84],[290,110,188,84]], bl: [12,30],
            nd: [[12,66,108,68,66,98,116],[300,16,168,64,384,45,63],[300,120,168,64,384,149,167]],
            w: ['M120 88C205 88 215 48 300 48','M120 112C205 112 215 152 300 152'], wl: [[210,50],[210,160]] },
    tall: { vb: '0 0 330 292', bnd: [[95,22,140,90],[2,196,158,92],[170,196,158,92]], bl: [105,14],
            nd: [[106,34,118,66,165,64,82],[10,206,142,72,81,237,256],[178,206,142,72,249,237,256]],
            w: ['M150 100C150 150 81 156 81 206','M180 100C180 150 249 156 249 206'], wl: [[64,158],[270,158]] }
  };
  function set(el, a) { for (var k in a) el.setAttribute(k, a[k]); }
  function apply(g) {
    svg.setAttribute('viewBox', g.vb);
    svg.querySelectorAll('.bnd rect').forEach(function (r, i) { var b = g.bnd[i]; set(r, { x: b[0], y: b[1], width: b[2], height: b[3] }); });
    set(svg.querySelector('.bl text'), { x: g.bl[0], y: g.bl[1] });
    svg.querySelectorAll('.nd').forEach(function (n, i) {
      var d = g.nd[i], t = n.querySelectorAll('text');
      set(n.querySelector('rect'), { x: d[0], y: d[1], width: d[2], height: d[3] });
      set(t[0], { x: d[4], y: d[5] }); set(t[1], { x: d[4], y: d[6] });
    });
    svg.querySelectorAll('.wire path').forEach(function (p, i) { p.setAttribute('d', g.w[i]); });
    svg.querySelectorAll('.wl text').forEach(function (t, i) { set(t, { x: g.wl[i][0], y: g.wl[i][1] }); });
  }
  var mq = matchMedia('(max-width: 640px)');
  function update() { apply(mq.matches ? L.tall : L.wide); }
  update();
  mq.addEventListener('change', update);
})();

/* 01 problem: one request on each architecture. The request goes out, the model generates,
   tokens stream back. Meters count network hops, exits from the JVM and billed tokens. */
(function () {
  var root = document.getElementById('vs'); if (!root) return;
  var NS = 'http://www.w3.org/2000/svg', TOK = 12, PRE = 450, GEN = 1400;   // slower, readable phases
  // per call: model node, request wire (+reverse), response wire (+reverse), travel ms, billed?, captions, idle ms after
  var MEM = 'tokens stream back in memory',
      local = { node: 1, rq: [0, 0], rs: [1, 0], tr: 220, bill: 0, post: 360, cap: [MEM, 'generating inside your JVM', MEM] };
  var plans = [
    [{ node: 1, rq: [0, 0], rs: [0, 1], tr: 1400, bill: 0, post: 650, cap: ['sending the prompt to a model server', 'generating on a model server', 'streaming back over the network'] },
     { node: 2, rq: [1, 0], rs: [1, 1], tr: 1400, bill: 1, post: 650, cap: ['sending the prompt to a cloud API', 'generating in someone else’s cloud', 'billed per token, on the way back'] }],
    [local, local, local, local]   // in-process calls are quick: four in the time the network takes for two
  ];
  function el(tag, cls, parent, before) { var e = document.createElementNS(NS, tag); e.setAttribute('class', cls); parent.insertBefore(e, before || null); return e; }
  function num(r, k) { return +r.getAttribute(k); }
  var sides = [root.querySelector('.old'), root.querySelector('.new')].map(function (box, k) {
    var svg = box.querySelector('.dg'), us = k === 1, pk = svg.querySelector('.pk');
    var toks = []; for (var i = 0; i < TOK; i++) toks.push(el('circle', 'tok' + (us ? ' us' : ''), svg, pk));
    toks.forEach(function (c) { c.setAttribute('r', 3); });
    var rip = el('circle', 'rip', svg, pk);
    var trail = []; for (i = 1; i <= 5; i++) { var tc = el('circle', 'pk trail' + (us ? ' us' : ''), svg, pk); tc.setAttribute('r', 5 - i * 0.7); trail.push(tc); }
    var bursts = toks.map(function () { return el('circle', 'burst' + (us ? ' us' : ''), svg); });
    var coins = toks.map(function () { var c = el('text', 'coin', svg); c.textContent = '$'; return c; });
    var nodes = [].slice.call(svg.querySelectorAll('.nd')).map(function (n) {
      return { g: n, r: n.querySelector('rect') };
    });
    var m = {}; box.querySelectorAll('[data-m]').forEach(function (d) { m[d.dataset.m] = d; });
    var calls = plans[k].map(function (c) { var o = Object.create(c); o.len = PRE + c.tr + GEN + c.tr + c.post; return o; });
    return { svg: svg, us: us, pk: pk, toks: toks, rip: rip, trail: trail, bursts: bursts, coins: coins, nodes: nodes, wires: svg.querySelectorAll('.wire path'),
             jvm: svg.querySelector('.bnd rect'), m: m, last: {}, t: box.querySelector('.tl-t'), calls: calls };
  });
  var exitCache = {};
  function exitAt(sd, w) {   // fraction along a wire where it leaves the JVM box
    var d = w.getAttribute('d'); if (sd.us) return 2;
    if (exitCache[d] != null) return exitCache[d];
    var r = sd.jvm, x = num(r, 'x'), y = num(r, 'y'), X = x + num(r, 'width'), Y = y + num(r, 'height'), L = w.getTotalLength();
    for (var f = 0; f <= 1; f += 0.01) { var p = w.getPointAtLength(f * L); if (p.x < x || p.x > X || p.y < y || p.y > Y) return (exitCache[d] = f); }
    return (exitCache[d] = 2);
  }
  var LUT = {}, N = 120;   // points along each wire, sampled once per layout
  function lut(w) {
    var d = w.getAttribute('d');
    if (!LUT[d]) { var L = w.getTotalLength(), a = []; for (var i = 0; i <= N; i++) { var p = w.getPointAtLength(L * i / N); a.push(p.x, p.y); } LUT[d] = a; }
    return LUT[d];
  }
  function at(w, f, rev) {
    var a = lut(w), x = Math.max(0, Math.min(1, rev ? 1 - f : f)) * N, i = Math.min(N - 1, Math.floor(x)), t = x - i;
    return { x: a[2 * i] + (a[2 * i + 2] - a[2 * i]) * t, y: a[2 * i + 1] + (a[2 * i + 3] - a[2 * i + 1]) * t };
  }
  function ease(f) { return f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2; }   // the request glides out
  function put(c, p) { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); }
  function meter(sd, k, v) {
    var d = sd.m[k]; if (!d || sd.last[k] === v) return;
    if (sd.last[k] != null && v > sd.last[k] && d.animate) d.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    sd.last[k] = v; d.textContent = v;
  }
  function draw(sd, t, done) {
    var live = null, cap = sd.calls[0].cap[0], on = 0, prog = -1, hops = 0, out = 0, bill = 0, rip = -1, ripP = null;
    sd.pk.style.opacity = 0;
    sd.toks.concat(sd.trail, sd.bursts, sd.coins).forEach(function (c) { c.style.opacity = 0; });
    var acc = 0;
    sd.calls.forEach(function (c) {
      var lt = done ? c.len : t - acc, rq = sd.wires[c.rq[0]], rs = sd.wires[c.rs[0]], g0 = PRE + c.tr, g1 = g0 + GEN;
      acc += c.len;
      if (lt < 0) return;
      var inCall = lt < c.len;
      if (inCall && (lt < PRE || lt >= g1 + c.tr)) on = 0;
      if (lt >= PRE && lt < g0) {                       // request in flight
        var f = ease((lt - PRE) / c.tr); put(sd.pk, at(rq, f, c.rq[1])); sd.pk.style.opacity = 1; live = rq; on = -1;
        sd.trail.forEach(function (tc, k) { var ff = f - (k + 1) * 0.035; if (ff > 0) { put(tc, at(rq, ff, c.rq[1])); tc.style.opacity = 0.55 - k * 0.1; } });
      }
      if (!sd.us && lt >= PRE) { hops++; var ex = exitAt(sd, rq); if (lt >= PRE + ex * c.tr) { out++; var dt = lt - PRE - ex * c.tr; if (dt < 520) { rip = dt / 520; ripP = at(rq, ex, c.rq[1]); } } }
      if (lt >= g0 && lt < g1) { on = c.node; prog = (lt - g0) / GEN; }
      if (!sd.us && lt >= g0) hops++;
      for (var i = 0; i < TOK; i++) {                   // token stream back
        var e = g0 + (i + 0.5) * GEN / TOK, f2 = (lt - e) / c.tr;
        if (f2 >= 0 && f2 < 1 && inCall) { var tk = sd.toks[i]; put(tk, at(rs, f2, c.rs[1])); tk.style.opacity = 1; live = rs; }
        if (f2 >= 1 && c.bill) bill++;
        var u = (lt - e - c.tr) / 320;
        if (u >= 0 && u < 1 && inCall) { var b = sd.bursts[i]; put(b, at(rs, 1, c.rs[1])); b.setAttribute('r', 3 + 11 * u); b.style.opacity = 0.9 * (1 - u); }
        var v = (lt - e) / 800;
        if (c.bill && v >= 0 && v < 1 && inCall) {
          var nr = sd.nodes[c.node].r, co = sd.coins[i];
          co.setAttribute('x', num(nr, 'x') + num(nr, 'width') - 16 - (i % 3) * 13); co.setAttribute('y', num(nr, 'y') + 2 - 26 * v);
          co.style.opacity = v < 0.15 ? v / 0.15 : 1 - (v - 0.15) / 0.85;
        }
      }
      if (inCall) cap = lt < g0 ? c.cap[0] : lt < g1 ? c.cap[1] : c.cap[2];   // one caption per phase of the active call
    });
    sd.svg.classList.toggle('busy', !!live);
    sd.wires.forEach(function (w) { w.classList.toggle('live', w === live); });
    sd.nodes.forEach(function (n, i) {
      var act = i === on || (i === 0 && on === 0);
      n.g.classList.toggle('on', act && !done);
      n.g.classList.toggle('gen', i === on && prog >= 0 && !done);
    });
    if (rip >= 0 && !done) { put(sd.rip, ripP); sd.rip.setAttribute('r', 5 + 16 * rip); sd.rip.style.opacity = 1 - rip; } else sd.rip.style.opacity = 0;
    if (sd.jvm && !sd.us) sd.jvm.classList.toggle('breach', rip >= 0 && !done);
    meter(sd, 'hops', hops); meter(sd, 'out', out); meter(sd, 'bill', bill);
    var text = done ? (sd.us ? MEM : 'over the network') : cap;   // captions fade in when they change
    if (sd.t.dataset.c !== text) { sd.t.dataset.c = text; sd.t.textContent = text; if (!done && sd.t.animate) sd.t.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'ease-out' }); }
  }
  var total = Math.max.apply(null, sides.map(function (sd) { return sd.calls.reduce(function (a, c) { return a + c.len; }, 0); }));
  if (calm) { sides.forEach(function (sd) { draw(sd, 0, true); }); return; }
  var start = 0, raf = 0;
  function frame(now) {
    if (!start) start = now;
    var t = (now - start) % total;
    sides.forEach(function (sd) { draw(sd, t); });
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting && !raf) { start = 0; raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
  }).observe(root);
})();

/* Pause looping decorations while they are off screen (saves battery on phones). */
(function () {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('off', !e.isIntersecting); });
  });
  document.querySelectorAll('.mq, .contact-card, .wave, .stage, #vs').forEach(function (el) { io.observe(el); });
})();

/* Company cards: hover (or, on touch screens, being on screen) sets .is-playing. CSS marks stop at the end of
   their cycle; the flag is drawn by script: the wind picks up, then eases back to a light breeze. */
(function () {
  function flag(svg) {
    var cloth = svg.querySelector('.fl-cloth'), brain = svg.querySelector('.fl-brain'), gyri = svg.querySelector('.fl-gyri'),
        BR = brain.dataset.p, GY = gyri.dataset.p;
    var X0 = 17, Y0 = 6, W = 26, H = 18, REST = .35, t = .6, amp = REST, target = REST, on = false, raf = 0, last = 0;
    function k(u, v) { return 6.4 * u - t + .9 * v; }
    function pt(x, y) {
      var u = x / W, v = y / H;
      return (X0 + x * (1 - .05 * amp * u)).toFixed(2) + ' ' + (Y0 + y + amp * (.4 + 2.1 * u) * Math.sin(k(u, v))).toFixed(2);
    }
    function map(d) { return d.replace(/(-?[\d.]+) (-?[\d.]+)/g, function (_, x, y) { return pt(+x, +y); }); }
    function draw() {
      var top = [], bot = [];
      for (var i = 0; i <= 14; i++) { top.push(pt(W * i / 14, 0)); bot.unshift(pt(W * i / 14, H)); }
      var d = 'M' + top.join('L') + 'L' + bot.join('L') + 'Z';
      cloth.setAttribute('d', d);
      brain.setAttribute('d', map(BR)); gyri.setAttribute('d', map(GY));
    }
    function tick(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (on) t += dt * 4.2;
      amp += (target - amp) * Math.min(1, dt * 2.6);
      draw();
      raf = on || Math.abs(target - amp) > .004 ? requestAnimationFrame(tick) : 0;
    }
    function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    draw();
    return { start: function () { on = true; target = .75; run(); }, stop: function () { on = false; target = REST; run(); } };
  }
  document.querySelectorAll('.pillars > div').forEach(function (card) {
    var fsvg = card.querySelector('svg.mk-flag'), f = fsvg && flag(fsvg), lead = card.querySelector('.mk-sails, .bj-trunk'), want = false;
    if (calm) return;
    function play(on) {
      want = on;
      if (on) card.classList.add('is-playing');
      else if (!lead) card.classList.remove('is-playing');
      if (f) f[on ? 'start' : 'stop']();
    }
    if (lead) {
      lead.addEventListener('animationiteration', function () { if (!want) card.classList.remove('is-playing'); });   // windmill: finish the turn
      lead.addEventListener('animationend', function () { card.classList.remove('is-playing'); });   // bonsai: one grow, then rest
    }
    if (matchMedia('(hover: none)').matches) {
      new IntersectionObserver(function (es) { play(es[0].isIntersecting); }, { threshold: .6 }).observe(card);
    } else {
      card.addEventListener('mouseenter', function () { play(true); });
      card.addEventListener('mouseleave', function () { play(false); });
      card.addEventListener('focusin', function () { play(true); });
      card.addEventListener('focusout', function () { play(false); });
    }
  });
})();

/* Headline figures count up once, when they come into view. */
(function () {
  var figs = [];
  document.querySelectorAll('.proof .fig, .big-fig').forEach(function (fig) {
    var n = fig.querySelector('[data-stat]');
    if (!n && fig.firstChild && fig.firstChild.nodeType === 3) { n = document.createElement('span'); n.textContent = fig.firstChild.textContent; fig.replaceChild(n, fig.firstChild); }
    if (n && parseFloat(n.textContent) > 0) figs.push(n);
  });
  document.fonts.ready.then(function () {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
    }, { threshold: .6 });
    figs.forEach(function (n) {
      n.dataset.final = n.textContent;
      n.style.cssText = 'display:inline-block;text-align:right;min-width:' + n.getBoundingClientRect().width + 'px';   // no reflow while counting
      n.textContent = (0).toFixed((n.textContent.split('.')[1] || '').length);
      io.observe(n);
    });
  });
  function run(n) {
    var t0 = performance.now();
    (function tick(now) {
      var f = n.dataset.final, dec = (f.split('.')[1] || '').length, p = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
      n.textContent = p < 1 ? (parseFloat(f) * e).toFixed(dec) : f;
      if (p < 1) requestAnimationFrame(tick); else n.dataset.done = '1';
    })(t0);
  }
})();

/* Cards: the light follows the pointer (desktop only). */
(function () {
  if (calm || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.svc, .cell, .pillars > div').forEach(function (c) { c.classList.add('spot'); });
  var card = null, x = 0, y = 0, raf = 0;
  document.addEventListener('pointermove', function (e) {
    card = e.target.closest && e.target.closest('.spot'); if (!card) return;
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(function () {
      raf = 0; if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (x - r.left) + 'px'); card.style.setProperty('--my', (y - r.top) + 'px');
    });
  }, { passive: true });
})();

/* Shell highlighting for the command lines: commands, subcommands, URLs and model names, the jinfer alias,
   flags, punctuation and comments. Only text outside the prompt marker and continuation characters is touched;
   copy still gets plain text. */
(function () {
  var TOK = /(https?:\/\/[^\s)"]+)|([\w-]+@qxoticai)|((?:^|(?<=\s))[\w.-]+\/[\w.-]+(?::\w+)?)|((?:^|(?<=\s))--?[A-Za-z][\w-]*)|(\b(?:bash|curl|jbang|iex|iwr|pip|python)\b)|(\b(?:chat|server|setup|install)\b)|((?:^|(?<=\s))#.*$)|(&&|\|\||[|<$]?\(|[)}{"&|])/gm;
  var CLS = ['sh-s', 'sh-a', 'sh-s', 'sh-f', 'sh-c', 'sh-v', 'sh-k', 'sh-p'];
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function paint(text) {
    var out = '', last = 0, m;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(text))) {
      var k = 1; while (m[k] === undefined) k++;
      out += esc(text.slice(last, m.index)) + '<span class="' + CLS[k - 1] + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
      if (!m[0].length) TOK.lastIndex++;
    }
    return out + esc(text.slice(last));
  }
  document.querySelectorAll('#hero-cmd, #hero-cmd-win, .step pre, .int pre, .vsp-run').forEach(function (el) {
    if (!el.querySelector('b')) return;   // only blocks that start with a prompt ($ or PS>)
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walk.nextNode())) if (!n.parentNode.closest('b, i, [class^="sh-"], [class^="tk-"]')) nodes.push(n);
    nodes.forEach(function (t) {
      var tmp = document.createElement('span'); tmp.innerHTML = paint(t.textContent);
      while (tmp.firstChild) t.parentNode.insertBefore(tmp.firstChild, t);
      t.remove();
    });
  });
})();

/* The BOM version shown in "Add it to your app" comes from the runnable examples, the single source of truth. */
(function () {
  var spans = document.querySelectorAll('[data-jinfer-version]');
  if (!spans.length || !window.qxText) return;
  window.qxText('snippets/Chat.java').then(function (t) {
    var m = /jinfer-bom:([\w.-]+)@pom/.exec(t);
    if (m) spans.forEach(function (s) { s.textContent = m[1]; });
  }).catch(function (e) { console.warn('BOM version:', e); });   // the version in the HTML stays
})();

/* Commands for macOS / Linux or Windows (PowerShell): every switch on the page stays in sync,
   and Windows visitors get the PowerShell versions automatically. */
(function () {
  var tabs = document.querySelectorAll('.os-tabs button'), unix = document.getElementById('hero-cmd'), win = document.getElementById('hero-cmd-win'),
      copy = document.querySelector('[data-copy="hero-cmd"], [data-copy="hero-cmd-win"]');
  function pick(os) {
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', t.dataset.os === os); });
    if (unix && win) { unix.hidden = os === 'win'; win.hidden = os !== 'win'; }
    if (copy) copy.dataset.copy = os === 'win' ? 'hero-cmd-win' : 'hero-cmd';
    document.querySelectorAll('[data-os-pane]').forEach(function (p) { p.hidden = p.dataset.osPane !== os; });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { pick(t.dataset.os); }); });
  var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  if (/win/i.test(platform)) pick('win');
})();

/* 06: switch the Python side of the comparison */
(function () {
  var col = document.getElementById('vsp-py'); if (!col) return;
  var tabs = col.querySelectorAll('[data-py]'), panes = col.querySelectorAll('.vsp-pane');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', t === b); });
      panes.forEach(function (p, k) { p.hidden = String(k) !== b.dataset.py; });
    });
  });
})();

/* Anchors: charts, tables and code load lazily while a jump scrolls past them,
 * pushing the target down. Keep the target aligned until the page settles (no layout change
 * for a moment and no load in flight, window.qxLoads), and let go as soon as the visitor scrolls on their own. */
(function () {
  var target = null, timer = 0, landing = false;   // landing: arriving from a link, jumps are instant
  function release() { target = null; landing = false; clearTimeout(timer); }
  function hold(el) { target = el; clearTimeout(timer); timer = setTimeout(settle, landing ? 6000 : 2500); }
  function settle() { if (window.qxLoads > 0) timer = setTimeout(settle, 250); else release(); }
  function dest(el) {
    var y = 0, n = el;
    while (n) { y += n.offsetTop; n = n.offsetParent; }   /* layout position, ignores reveal transforms */
    return Math.max(0, y - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0));
  }
  function go(el) {
    var y = dest(el);
    if (Math.abs(scrollY - y) > 2) scrollTo({ top: y, behavior: calm || landing ? 'instant' : 'smooth' });
  }
  function realign() { if (target) { go(target); hold(target); } }
  new ResizeObserver(realign).observe(document.body);
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    var id = a && a.getAttribute('href').slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    // each section keeps only its own state: leaving the examples drops ?demo=…, leaving the table drops ?bench=…,
    // so the address reads qxotic.ai/#services, not ?demo=Embed.java#services
    var drop = {};
    if (!el.closest('#examples')) drop.demo = null;
    if (!el.closest('#benchmarks')) drop.bench = null;
    var url = pageUrl(drop, '#' + id);
    if (location.pathname + location.search + location.hash !== url) history.pushState(null, '', url);
    hold(el); go(el);
    // keyboard users (Enter on a link): move focus too, so the next Tab continues from the section
    if (e.detail === 0) { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  });
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) { addEventListener(t, function (e) { if (t !== 'mousedown' || !(e.target.closest && e.target.closest('a[href^="#"]'))) release(); }, { passive: true }); });
  // arriving with a #section, ?bench= (the table) or ?demo= (the examples): own the scroll,
  // so a reload doesn't restore the old position over it
  var q = new URLSearchParams(location.search);
  var first = document.getElementById(location.hash ? location.hash.slice(1) : q.has('bench') ? 'benchmarks' : q.has('demo') ? 'code' : '');
  if (first) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    landing = true; hold(first); go(first);
    // after load, and once more after the browser's own jump to the fragment (which measures mid-animation)
    addEventListener('load', function () { [0, 120, 500].forEach(function (ms) { setTimeout(function () { if (target) { go(target); hold(target); } }, ms); }); });
  }
})();
})();
