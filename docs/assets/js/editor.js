// 記事エディター: 下書き保存・簡易プレビュー・GitHub 新規ファイル画面への引き渡し。
// GitHub API やトークンは一切使わない（URL を開くだけ）。
(function () {
  'use strict';

  var REPO_NEW_URL = 'https://github.com/dendencat/dendencat.github.io/new/gh-pages';
  var POSTS_DIR = 'docs/_posts/';
  var MAX_URL_LENGTH = 7000;
  var STORAGE_KEY = 'dendencat-editor-draft-v1';

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    title: $('ed-title'), slug: $('ed-slug'), slugHint: $('ed-slug-hint'), date: $('ed-date'),
    categories: $('ed-categories'), tags: $('ed-tags'), body: $('ed-body'), preview: $('ed-preview'),
    publish: $('ed-publish'), copy: $('ed-copy'), download: $('ed-download'), clear: $('ed-clear'),
    saved: $('ed-saved'), status: $('ed-status'), filename: $('ed-filename'),
    url: $('ed-url'), urlLength: $('ed-url-length'), markdown: $('ed-markdown'),
    warnings: $('ed-warnings'), warningsSummary: $('ed-warnings-summary'), warningsList: $('ed-warnings-list')
  };
  // slug がタイトルから自動生成されたものか（手入力したら false）
  var slugAuto = true;

  // ---- 日付 (JST) ----

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function jstNow() {
    var t = new Date(Date.now() + 9 * 3600 * 1000);
    return {
      date: t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()),
      time: pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()) + ':' + pad(t.getUTCSeconds())
    };
  }

  function isValidDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }

  // ---- slug ----

  function isAscii(s) { return /^[\x20-\x7e]*$/.test(s); }

  function normalizeSlug(s) {
    return String(s).normalize('NFKD').replace(/[\u{0300}-\u{036f}]/gu, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
  }

  function updateSlugFromTitle() {
    var title = el.title.value.trim();
    if (slugAuto && isAscii(title)) el.slug.value = normalizeSlug(title);
  }

  function updateSlugHint() {
    var raw = el.slug.value.trim();
    var title = el.title.value.trim();
    el.slugHint.className = 'ed-hint';
    el.slug.removeAttribute('aria-invalid');
    if (!raw) {
      if (title && !isAscii(title)) {
        el.slugHint.textContent = 'タイトルに英数字以外が含まれるため、slug を手入力してください（例: k8s-network-policy）。';
        el.slugHint.className = 'ed-hint warn';
      } else {
        el.slugHint.textContent = 'ASCII のタイトルからは自動生成されます。';
      }
    } else if (!normalizeSlug(raw)) {
      el.slugHint.textContent = '英数字を含めてください。';
      el.slugHint.className = 'ed-hint warn';
      el.slug.setAttribute('aria-invalid', 'true');
    } else {
      el.slugHint.textContent = 'ファイル名: ' + (el.date.value || 'YYYY-MM-DD') + '-' + normalizeSlug(raw) + '.md';
    }
  }

  // ---- Markdown → HTML（簡易・安全側） ----
  // 入力全体を最初に HTML エスケープし、その後でタグを組み立てる。
  // 生成するタグは固定のもののみで、属性値は href（http/https に限定）と code の class（[\w+-] に限定）だけ。

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var RE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/;
  var RE_HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
  var RE_HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
  var RE_QUOTE = /^ {0,3}&gt; ?/;
  var RE_UL = /^\s*[-*+]\s+(.*)$/;
  var RE_OL = /^\s*\d{1,9}[.)]\s+(.*)$/;

  function isBlockStart(line) {
    return RE_FENCE.test(line) || RE_HEADING.test(line) || RE_HR.test(line) ||
      RE_QUOTE.test(line) || RE_UL.test(line) || RE_OL.test(line);
  }

  function renderInline(s) {
    var tokens = [];
    var hold = function (html) { tokens.push(html); return '\u0000' + (tokens.length - 1) + '\u0000'; };

    s = s.replace(/`([^`\n]+)`/g, function (_, code) { return hold('<code>' + code + '</code>'); });
    s = s.replace(/\[([^\]\n]+)\]\(\s*([^()\s\u0000]+)(?:\s+&quot;[^\n]*?&quot;)?\s*\)/g, function (_, text, url) {
      // url はエスケープ済み（" < > ' & を含まない）。スキームは http/https のみ許可。
      if (/^https?:\/\/[^\s]+$/i.test(url)) {
        return hold('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + emphasis(text) + '</a>');
      }
      return hold('<span class="ed-badlink" title="http/https 以外のリンクは無効化されます">' + emphasis(text) + '</span>');
    });
    s = emphasis(s).replace(/ {2,}\n/g, '<br>\n');

    // リンク内にコードのプレースホルダが入り得るので、残らなくなるまで戻す
    for (var i = 0; i < 3 && s.indexOf('\u0000') !== -1; i++) {
      s = s.replace(/\u0000(\d+)\u0000/g, function (_, n) { return tokens[+n]; });
    }
    return s;
  }

  function emphasis(s) {
    return s
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
      .replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
      .replace(/\*(?=\S)([^*\n]*?\S)\*/g, '<em>$1</em>')
      .replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1<em>$2</em>');
  }

  function renderBlocks(lines) {
    var out = [];
    var i = 0, m, buf;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }

      if ((m = RE_FENCE.exec(line))) {
        var close = new RegExp('^ {0,3}' + m[1].charAt(0) + '{' + m[1].length + ',}\\s*$');
        var lang = m[2];
        buf = [];
        for (i++; i < lines.length && !close.test(lines[i]); i++) buf.push(lines[i]);
        i++;
        out.push('<pre><code' + (lang ? ' class="language-' + lang + '"' : '') + '>' + buf.join('\n') + '</code></pre>');
        continue;
      }
      if ((m = RE_HEADING.exec(line))) {
        var n = m[1].length;
        out.push('<h' + n + '>' + renderInline(m[2]) + '</h' + n + '>');
        i++;
        continue;
      }
      if (RE_HR.test(line)) { out.push('<hr>'); i++; continue; }
      if (RE_QUOTE.test(line)) {
        buf = [];
        for (; i < lines.length && RE_QUOTE.test(lines[i]); i++) buf.push(lines[i].replace(RE_QUOTE, ''));
        out.push('<blockquote>' + renderBlocks(buf) + '</blockquote>');
        continue;
      }
      if (RE_UL.test(line) || RE_OL.test(line)) {
        var re = RE_UL.test(line) ? RE_UL : RE_OL;
        var items = [];
        while (i < lines.length) {
          if ((m = re.exec(lines[i]))) {
            items.push(m[1]);
          } else if (items.length && /^\s+\S/.test(lines[i]) && !isBlockStart(lines[i])) {
            items[items.length - 1] += '\n' + lines[i].trim();
          } else {
            break;
          }
          i++;
        }
        var tag = re === RE_UL ? 'ul' : 'ol';
        out.push('<' + tag + '>' + items.map(function (t) { return '<li>' + renderInline(t) + '</li>'; }).join('') + '</' + tag + '>');
        continue;
      }
      buf = [];
      for (; i < lines.length && !/^\s*$/.test(lines[i]) && (!buf.length || !isBlockStart(lines[i])); i++) buf.push(lines[i]);
      out.push('<p>' + renderInline(buf.join('\n')) + '</p>');
    }
    return out.join('\n');
  }

  function renderMarkdown(src) {
    var text = String(src).replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
    return renderBlocks(escapeHtml(text).split('\n'));
  }

  // ---- front matter / 出力 ----

  // 改行・制御文字（C0/C1・U+2028/U+2029）。ソースに生で書くと構文エラーになるので必ずエスケープ表記で。
  var RE_CTRL = /[\u0000-\u001f\u007f-\u009f\u{2028}\u{2029}]+/gu;

  // YAML のダブルクォート文字列。改行・制御文字を除去し、\ と " をエスケープする。
  function yamlString(s) {
    var v = String(s).replace(RE_CTRL, ' ').trim();
    return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function splitList(s) {
    var seen = {};
    return String(s).split(/[,、，]/).map(function (t) { return t.trim(); })
      .filter(function (t) { return t && !seen[t] && (seen[t] = true); });
  }

  function yamlList(items) { return '[' + items.map(yamlString).join(', ') + ']'; }

  function build() {
    var errors = [];
    var title = el.title.value.replace(RE_CTRL, ' ').trim();
    var slug = normalizeSlug(el.slug.value);
    var date = el.date.value;
    if (!title) errors.push('タイトルを入力してください。');
    if (!slug) errors.push('slug を入力してください（英数字とハイフン）。');
    if (!isValidDate(date)) errors.push('日付を YYYY-MM-DD で入力してください。');
    if (errors.length) return { errors: errors };

    var categories = splitList(el.categories.value);
    var tags = splitList(el.tags.value);
    var fm = ['---', 'layout: post', 'title: ' + yamlString(title), 'date: ' + date + ' ' + jstNow().time + ' +0900'];
    if (categories.length) fm.push('categories: ' + yamlList(categories));
    if (tags.length) fm.push('tags: ' + yamlList(tags));
    fm.push('---');

    var body = el.body.value.replace(/\r\n?/g, '\n').replace(/\s+$/, '');
    var markdown = fm.join('\n') + '\n\n' + body + '\n';
    var basename = date + '-' + slug + '.md';
    var filename = POSTS_DIR + basename;
    var url;
    try {
      url = REPO_NEW_URL + '?filename=' + encodeURIComponent(filename) + '&value=' + encodeURIComponent(markdown);
    } catch (e) {
      // 不正なサロゲートペアなどで URIError になる場合
      return { errors: ['本文に URL エンコードできない文字が含まれています。'] };
    }
    return { errors: [], markdown: markdown, basename: basename, filename: filename, url: url };
  }

  function refreshOutput() {
    var r = build();
    if (r.errors.length) {
      el.filename.textContent = '-';
      el.url.textContent = r.errors.join('\n');
      el.urlLength.textContent = '0';
      el.markdown.textContent = '';
      return r;
    }
    el.filename.textContent = r.filename;
    el.url.textContent = r.url;
    el.urlLength.textContent = String(r.url.length);
    el.markdown.textContent = r.markdown;
    return r;
  }

  function setStatus(msg, isError) {
    el.status.textContent = msg;
    el.status.className = 'ed-status' + (isError ? ' error' : '');
  }

  // ---- 危険な記述の検査 ----
  // 投稿前に本文と front matter 項目から HTML/JS 埋め込みや Liquid 構文を探す（大文字小文字は無視）。
  // 検出しても投稿自体は止めず、一覧を見せて confirm() で明示的に同意させる。

  var DANGER_PATTERNS = [
    { label: '<script', re: /<script/gi },
    { label: '<iframe', re: /<iframe/gi },
    { label: '<object', re: /<object/gi },
    { label: '<embed', re: /<embed/gi },
    { label: '<style', re: /<style/gi },
    { label: 'on〜= イベント属性', re: /\bon\w+\s*=/gi },
    { label: 'javascript: URL', re: /j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi },
    { label: 'Liquid タグ {%', re: /\{%/g },
    { label: 'Liquid 出力 {{', re: /\{\{/g }
  ];
  var SCAN_FIELDS = [
    { key: 'title', label: 'タイトル' }, { key: 'slug', label: 'slug' },
    { key: 'categories', label: 'カテゴリ' }, { key: 'tags', label: 'タグ' }, { key: 'body', label: '本文' }
  ];
  var EXCERPT_CONTEXT = 20;
  var MAX_LISTED = 50;
  var MAX_IN_CONFIRM = 10;

  // 一致箇所の前後を切り出し、改行・制御文字は空白にして 1 行にする。
  function excerpt(text, start, end) {
    var from = Math.max(0, start - EXCERPT_CONTEXT);
    var to = Math.min(text.length, end + EXCERPT_CONTEXT);
    return (from > 0 ? '…' : '') + text.slice(from, to).replace(RE_CTRL, ' ') + (to < text.length ? '…' : '');
  }

  function lineOf(text, index) { return text.slice(0, index).split('\n').length; }

  function scanDanger() {
    var found = [];
    SCAN_FIELDS.forEach(function (f) {
      var text = el[f.key].value.replace(/\r\n?/g, '\n');
      DANGER_PATTERNS.forEach(function (p) {
        p.re.lastIndex = 0;
        var m;
        while ((m = p.re.exec(text))) {
          found.push({
            field: f.label + (f.key === 'body' ? ' ' + lineOf(text, m.index) + '行目' : ''),
            kind: p.label,
            excerpt: excerpt(text, m.index, m.index + m[0].length)
          });
          if (!m[0].length) p.re.lastIndex++;
        }
      });
    });
    return found;
  }

  function describe(w) { return '[' + w.field + '] ' + w.kind + ': ' + w.excerpt; }

  // 一覧は textContent だけで組み立てる（innerHTML は使わない）。
  function showWarnings(found) {
    el.warningsList.textContent = '';
    if (!found.length) { el.warnings.hidden = true; return; }
    el.warningsSummary.textContent = '危険な可能性のある記述が ' + found.length + ' 件見つかりました。' +
      'HTML/JavaScript の埋め込みや Liquid 構文は、公開ページでスクリプト実行やビルド時の展開につながります。意図したものか確認してください。';
    found.slice(0, MAX_LISTED).forEach(function (w) {
      var li = document.createElement('li');
      li.appendChild(document.createTextNode('[' + w.field + '] ' + w.kind + ': '));
      var code = document.createElement('code');
      code.textContent = w.excerpt;
      li.appendChild(code);
      el.warningsList.appendChild(li);
    });
    if (found.length > MAX_LISTED) {
      var more = document.createElement('li');
      more.textContent = '…ほか ' + (found.length - MAX_LISTED) + ' 件';
      el.warningsList.appendChild(more);
    }
    el.warnings.hidden = false;
  }

  function confirmDanger(found) {
    var lines = found.slice(0, MAX_IN_CONFIRM).map(function (w) { return '・' + describe(w); });
    if (found.length > MAX_IN_CONFIRM) lines.push('…ほか ' + (found.length - MAX_IN_CONFIRM) + ' 件（一覧はページ上に表示）');
    return window.confirm(
      '【警告】危険な可能性のある記述が ' + found.length + ' 件見つかりました。\n\n' + lines.join('\n') +
      '\n\nスクリプト・埋め込み要素・イベント属性・javascript: URL・Liquid 構文は、' +
      '公開ページで実行されたりビルド時に展開されたりします。\n' +
      '内容を理解したうえで、それでも GitHub の新規ファイル画面を開きますか？'
    );
  }

  // ---- 下書き (localStorage) ----

  var FIELDS = ['title', 'slug', 'date', 'categories', 'tags', 'body'];

  function saveDraft() {
    var draft = { slugAuto: slugAuto };
    FIELDS.forEach(function (k) { draft[k] = el[k].value; });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      el.saved.textContent = '下書き保存 ' + new Date().toLocaleTimeString();
    } catch (e) {
      el.saved.textContent = '下書きを保存できません（ストレージ不可）';
    }
  }

  function loadDraft() {
    var draft;
    try { draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { draft = null; }
    if (!draft || typeof draft !== 'object') return false;
    FIELDS.forEach(function (k) { if (typeof draft[k] === 'string') el[k].value = draft[k]; });
    if (typeof draft.slugAuto === 'boolean') slugAuto = draft.slugAuto;
    return true;
  }

  function clearDraft() {
    if (!window.confirm('下書きを削除して入力欄を空にします。よろしいですか？')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    FIELDS.forEach(function (k) { el[k].value = ''; });
    el.date.value = jstNow().date;
    slugAuto = true;
    el.saved.textContent = '';
    setStatus('下書きをクリアしました。', false);
    update();
  }

  // ---- アクション ----

  function publish() {
    var r = refreshOutput();
    if (r.errors.length) { setStatus(r.errors.join(' '), true); return; }
    var found = scanDanger();
    showWarnings(found);
    if (r.url.length > MAX_URL_LENGTH) {
      setStatus('URL が ' + r.url.length + ' 文字で上限（' + MAX_URL_LENGTH + '）を超えるため開きません。' +
        '「Markdown をコピー」または「.md をダウンロード」を使い、GitHub 上で ' + r.filename + ' として作成してください。', true);
      return;
    }
    if (found.length && !confirmDanger(found)) {
      setStatus('危険な可能性のある記述があるため、GitHub を開くのを中止しました。', true);
      return;
    }
    window.open(r.url, '_blank', 'noopener,noreferrer');
    setStatus('GitHub の新規ファイル画面を開きました。差分を確認し、「Create a new branch and start a pull request」を選んでください。', false);
  }

  function copyMarkdown() {
    var r = refreshOutput();
    if (r.errors.length) { setStatus(r.errors.join(' '), true); return; }
    var done = function () { setStatus('Markdown をコピーしました。', false); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = r.markdown;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) done(); else setStatus('コピーできませんでした。「生成内容」から手動でコピーしてください。', true);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(r.markdown).then(done, fallback);
    } else {
      fallback();
    }
  }

  function downloadMarkdown() {
    var r = refreshOutput();
    if (r.errors.length) { setStatus(r.errors.join(' '), true); return; }
    var href = URL.createObjectURL(new Blob([r.markdown], { type: 'text/markdown;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = href;
    a.download = r.basename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(href); }, 1000);
    setStatus(r.basename + ' をダウンロードしました。' + POSTS_DIR + ' に配置してください。', false);
  }

  // ---- 配線 ----

  var timer = null;
  function update() {
    updateSlugHint();
    el.preview.innerHTML = renderMarkdown(el.body.value);
    refreshOutput();
  }
  function scheduleUpdate() {
    clearTimeout(timer);
    timer = setTimeout(function () { update(); saveDraft(); }, 300);
  }

  el.title.addEventListener('input', function () { updateSlugFromTitle(); scheduleUpdate(); });
  el.slug.addEventListener('input', function () {
    slugAuto = el.slug.value.trim() === '';
    scheduleUpdate();
  });
  el.slug.addEventListener('change', function () {
    el.slug.value = normalizeSlug(el.slug.value);
    slugAuto = el.slug.value === '';
    scheduleUpdate();
  });
  ['date', 'categories', 'tags', 'body'].forEach(function (k) { el[k].addEventListener('input', scheduleUpdate); });

  el.publish.addEventListener('click', publish);
  el.copy.addEventListener('click', copyMarkdown);
  el.download.addEventListener('click', downloadMarkdown);
  el.clear.addEventListener('click', clearDraft);
  document.getElementById('ed-form').addEventListener('submit', function (e) { e.preventDefault(); });

  if (loadDraft()) setStatus('保存されていた下書きを復元しました。', false);
  if (!el.date.value) el.date.value = jstNow().date;
  update();
})();
