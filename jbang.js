/* jbang snippet renderer.
 *
 *   <div class="jbang"
 *        data-src="snippets/Chat.java"                    (allowlist: see allowed())
 *        data-title="Chat.java: LLM inference on the JVM" (default: file name)
 *        data-run="jbang Chat.java"                       (default: jbang <file>; "none" hides)
 *        data-out="# &quot;The capital of France is Paris.&quot;"></div>  (optional)
 *
 * ?demo=<url|name>: same-origin references open the matching built-in tab;
 * a qxoticai gist renders as a shared first tab.
 *
 * Security contract: allowed() gates every source (before fetch and after
 * redirects), esc() escapes every string that touches HTML, and a CSP meta
 * tag in index.html blocks foreign fetches at the browser level.
 */
(function () {
  var KEYWORDS = 'import|package|void|var|new|try|catch|finally|throw|throws|return|if|else|for|while|do|switch|case|default|break|continue|class|interface|enum|record|sealed|permits|extends|implements|static|final|public|private|protected|abstract|synchronized|volatile|transient|native|this|super|null|true|false|instanceof|yield|int|long|float|double|boolean|char|byte|short';
  var TOKEN = new RegExp(
      '(\\/\\/[^\\n]*)'                           // 1: line comment (jbang directives included)
    + '|(\\/\\*[\\s\\S]*?\\*\\/)'                 // 2: block comment
    + '|("(?:[^"\\\\\\n]|\\\\.)*")'               // 3: string
    + '|(\\b\\d[\\d_]*(?:\\.[\\d_]+)?[fLdD]?\\b)' // 4: number
    + '|(\\b(?:' + KEYWORDS + ')\\b)'             // 5: keyword
    + '|(\\b[A-Z][A-Za-z0-9_]*\\b)'               // 6: Type
    + '|(\\b[a-zA-Z_]\\w*)(?=\\s*\\()', 'g');     // 7: method name
  // ponytail: no """ text blocks in the tokenizer; escapes keep the highlight honest enough for demos

  /* One escaper for every interpolation, text and attribute contexts alike. */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function highlight(src) {
    var out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      var cls = m[1] || m[2] ? 'tk-c' : m[3] ? 'tk-s' : m[4] ? 'tk-n' : m[5] ? 'tk-k' : 'tk-t';
      out += esc(src.slice(last, m.index)) + '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  /* Provenance via the browser's own URL parser — no regexes to outsmart.
   * Allowed: this origin, https://*.qxotic.ai, qxoticai's gists. */
  function allowed(src) {
    var u;
    try { u = new URL(src, location.origin); } catch (e) { return false; }
    if (u.origin === location.origin) return true;
    if (u.protocol !== 'https:') return false;
    if (/(^|\.)qxotic\.ai$/.test(u.hostname)) return true;
    return (u.hostname === 'gist.github.com' || u.hostname === 'gist.githubusercontent.com')
        && u.pathname.toLowerCase().startsWith('/qxoticai/');
  }

  /* Gist page URLs → raw file URL; everything else fetches as-is. */
  function rawUrl(src) {
    var u = new URL(src, location.origin);
    var m = u.hostname === 'gist.github.com' ? /^\/([^/]+)\/([0-9a-f]+)/i.exec(u.pathname) : null;
    return m ? 'https://gist.githubusercontent.com/' + m[1] + '/' + m[2] + '/raw' : src;
  }

  /* Split a jbang script into { head, main, tail }:
   * head = directives + imports before main, tail = helpers after main's closing brace. */
  function splitJbang(src) {
    var mm = /^[ \t]*(?:public\s+)?(?:static\s+)?void\s+main\s*\(/m.exec(src);
    if (!mm) return { head: '', main: src.replace(/^\s+|\s+$/g, ''), tail: '' };
    var head = src.slice(0, mm.index).replace(/\s+$/, '');
    var i = src.indexOf('{', mm.index), depth = 0, quote = null, inLine = false, inBlock = false, escd = false;
    for (; i < src.length; i++) {
      var c = src[i], n = src[i + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
      if (quote)   { if (escd) escd = false; else if (c === '\\') escd = true; else if (c === quote) quote = null; continue; }
      if (c === '/' && n === '/') { inLine = true; i++; continue; }
      if (c === '/' && n === '*') { inBlock = true; i++; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { i++; break; }
    }
    return { head: head, main: src.slice(mm.index, i).replace(/\s+$/, ''), tail: src.slice(i).replace(/^\s+|\s+$/g, '') };
  }

  function baseName(src) {
    return src.split('/').pop().split(/[?#]/)[0] || src;
  }

  function fold(label, code) {
    return '<details class="code-fold"><summary>' + esc(label) + '</summary>' + highlight(code) + '</details>';
  }

  function fail(el, msg) {
    el.innerHTML = '<p class="code-run"><span class="out">' + esc(msg) + '</span></p>';
  }

  function render(el) {
    var src = el.dataset.src;
    var name = baseName(src);
    var run = el.dataset.run !== undefined ? el.dataset.run : 'jbang ' + name;
    var out = el.dataset.out;

    if (!allowed(src)) return fail(el, 'Snippet source not allowed: ' + src);

    fetch(rawUrl(src)).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      if (!allowed(r.url)) throw new Error('redirect left the allowlist'); // post-redirect provenance
      return r.text();
    }).then(function (text) {
      var p = splitJbang(text.replace(/\r\n/g, '\n'));
      var headLabel = /^\/\//m.test(p.head) ? 'jbang header + imports' : 'imports';
      var tailName = /^[\w\[\]<>?,\s]*?\b(\w+)\s*\(/.exec(p.tail);
      var code = (p.head ? fold(headLabel, p.head) + '\n' : '')
               + highlight(p.main)
               + (p.tail ? '\n\n' + fold(tailName ? tailName[1] + ' helper' : 'helper code', p.tail) : '');

      // caption: data-title, else jbang's own //DESCRIPTION directive, else the file name
      var desc = /^\/\/DESCRIPTION[ \t]+(.+)$/m.exec(text);
      var caption = el.dataset.title || (desc ? name + ': ' + desc[1].trim() : name);

      var html = '<div class="code-window">'
               + '<div class="code-titlebar"><span class="code-filename">' + esc(caption) + '</span>'
               + '<button class="code-copy" type="button">copy</button></div>'
               + '<pre><code>' + code + '</code></pre></div>';
      if (run !== 'none') {
        html += '<p class="code-run"><span class="prompt">$</span> ' + esc(run)
              + (out ? '&nbsp;&nbsp;<span class="out">' + esc(out) + '</span>' : '') + '</p>';
      }
      el.innerHTML = html;
    }).catch(function () {
      fail(el, 'Could not load ' + src);
    });
  }

  document.querySelectorAll('.jbang').forEach(render);

  /* ?demo=<url|name>: same-origin → open that built-in tab; otherwise inject
   * as a shared first tab (render() applies the allowlist). */
  (function sharedDemo() {
    var q = new URLSearchParams(location.search);
    var demo = q.get('demo');
    var tabs = document.querySelector('.code-tabs');
    if (!demo || !tabs) return;

    var name = baseName(demo);
    if (!/\.java$/i.test(name)) name = 'Shared.java';

    document.querySelectorAll('.code-tab.active, .code-panel.active').forEach(function (e) {
      e.classList.remove('active');
    });

    var sameOrigin = false;
    try { sameOrigin = new URL(demo, location.origin).origin === location.origin; } catch (e) {}

    var tab = null;
    if (sameOrigin) {
      tabs.querySelectorAll('.code-tab').forEach(function (t) { if (t.textContent === name) tab = t; });
    }

    if (tab) {
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    } else {
      var div = el('div', 'jbang');
      div.dataset.src = demo;
      if (q.get('title')) div.dataset.title = q.get('title');
      div.dataset.run = /^https:/.test(demo) ? 'jbang ' + demo : 'jbang ' + name;
      if (q.get('out')) div.dataset.out = q.get('out');

      var panel = el('div', 'code-panel active');
      panel.id = 'panel-shared';
      panel.appendChild(div);

      tab = el('button', 'code-tab active', name);
      tab.dataset.tab = 'shared';
      tabs.insertBefore(tab, tabs.firstChild);
      tabs.parentNode.insertBefore(panel, tabs.nextSibling);
      render(div);
    }

    var section = document.getElementById('examples');
    if (section) section.scrollIntoView();
  })();

  /* Copy the full snippet, including folded lines (minus the fold labels).
   * Delegated, since .code-copy buttons are rendered dynamically. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.code-copy');
    if (!btn) return;
    var code = btn.closest('.code-window').querySelector('code').cloneNode(true);
    code.querySelectorAll('summary').forEach(function (s) { s.remove(); });
    navigator.clipboard.writeText(code.textContent.replace(/^\n+/, '')).then(function () {
      btn.textContent = 'copied!';
      setTimeout(function () { btn.textContent = 'copy'; }, 1500);
    });
  });
})();
