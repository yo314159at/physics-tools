/* Physics Playground: global site script (loaded by every page, with `defer`).
   Provides window.Site. Loads fonts and Phosphor icons, builds the header, the side-dock buttons and the
   "Read more" lightbox on demo pages, runs KaTeX, filters the catalog.
   Edit CONFIG to rename the site. Do not fork this file per demo. */
(function () {
  'use strict';

  const CONFIG = {
    siteTitle: 'Physics Tools',
    footer: '(Likely spaghetti) coded by AI',
    repoUrl: 'https://github.com/yo314159at/physics-demos',
    katexVersion: '0.16.11',
    phosphorVersion: '2.1.1',
    fonts: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Sora:wght@500;600&display=swap'
  };

  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } }
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const themeListeners = [];

  /* ---------- assets: fonts + Phosphor icons (<i class="ph ph-play"></i>, <i class="ph-fill ph-play"></i>) ---------- */
  function addCss(href) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }
  addCss(CONFIG.fonts);
  ['regular', 'fill'].forEach((w) => addCss(`https://unpkg.com/@phosphor-icons/web@${CONFIG.phosphorVersion}/src/${w}/style.css`));

  let _meta;
  function meta() {
    if (_meta !== undefined) return _meta;
    const el = document.getElementById('demo-meta');
    try { _meta = el ? JSON.parse(el.textContent) : null; } catch (e) { _meta = null; }
    return _meta;
  }

  const currentTheme = () => root.dataset.theme ||
    (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next; store.set('theme', next);
    themeListeners.forEach((fn) => { try { fn(next); } catch (e) { console.error(e); } });
  }

  /* ---------- KaTeX (lazy, pinned) ---------- */
  let katexP = null;
  function loadKatex() {
    if (katexP) return katexP;
    const base = `https://cdn.jsdelivr.net/npm/katex@${CONFIG.katexVersion}/dist/`;
    addCss(base + 'katex.min.css');
    const load = (src) => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
    katexP = load(base + 'katex.min.js').then(() => load(base + 'contrib/auto-render.min.js'));
    return katexP;
  }
  /** Render $...$, $$...$$, \(...\), \[...\] inside `el` (default: whole page). Safe to call repeatedly. */
  function math(el) {
    return loadKatex().then(() => window.renderMathInElement(el || document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    })).catch((e) => console.warn('KaTeX unavailable:', e.message));
  }

  /* ---------- docks: <aside data-dock="graphs" data-label="Graphs" data-icon="ph-chart-line-up" data-open="true"> ---------- */
  const docks = [];
  function setDock(d, open) {
    d.el.classList.toggle('open', open);
    if (d.btn) d.btn.setAttribute('aria-pressed', String(open));
  }
  function toggleDock(name) { const d = docks.find((x) => x.name === name); if (d) setDock(d, !d.el.classList.contains('open')); }

  /* ---------- "Read more" lightbox, built from <div id="more" hidden><section data-title data-icon>…</section>…</div> ---------- */
  let dlg = null;
  function buildLightbox() {
    const more = document.getElementById('more');
    if (!more) return null;
    const secs = [...more.querySelectorAll(':scope > section')];
    dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'More about this demo');
    dlg.innerHTML = '<nav class="lb-tabs" role="tablist"><h3>Read more</h3></nav><div class="lb-main"><button type="button" class="btn icon lb-close" aria-label="Close"><i class="ph ph-x"></i></button></div>';
    const tabs = dlg.querySelector('.lb-tabs'), main = dlg.querySelector('.lb-main');
    const show = (i) => {
      secs.forEach((s, k) => { s.hidden = k !== i; });
      tabs.querySelectorAll('.lb-tab').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
      main.scrollTop = 0;
    };
    secs.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lb-tab'; b.setAttribute('role', 'tab');
      b.innerHTML = `<i class="ph ${esc(s.dataset.icon || 'ph-info')}"></i><span class="lbl">${esc(s.dataset.title || 'More')}</span>`;
      b.title = s.dataset.title || '';
      b.addEventListener('click', () => show(i));
      tabs.append(b); main.append(s);
    });
    more.remove();
    document.body.append(dlg);
    dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });          // click on the backdrop
    dlg.addEventListener('keydown', (e) => {                                               // up/down arrows switch tabs
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const list = [...tabs.querySelectorAll('.lb-tab')];
        const cur = list.findIndex((b) => b.getAttribute('aria-selected') === 'true');
        const next = (cur + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length;
        show(next); list[next].focus(); e.preventDefault();
      }
    });
    show(0);
    return dlg;
  }
  function openMore(i) {
    if (!dlg) return;
    if (typeof i === 'number') dlg.querySelectorAll('.lb-tab')[i]?.click();
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- chrome ---------- */
  const brandHtml = (label = CONFIG.siteTitle) =>
    `<a class="brand" href="/" aria-label="${esc(label)} home"><span class="brand-mark" aria-hidden="true"><i class="ph-fill ph-atom"></i></span><span class="brand-name">${esc(label)}</span></a>`;
  const themeBtn = '<button class="btn icon" id="theme-toggle" type="button" aria-label="Toggle light/dark theme" title="Light / dark"><i class="ph ph-circle-half"></i></button>';

  function initDemoSwitcher(header, metaData, rootPath) {
    const trigger = header.querySelector('.breadcrumb-current');
    const menu = header.querySelector('.breadcrumb-menu');
    if (!trigger || !menu) return;

    const close = () => {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(288, window.innerWidth - 24);
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
      menu.style.width = `${width}px`;
      menu.style.left = `${left}px`;
      menu.style.top = `${rect.bottom + 7}px`;
    };
    trigger.addEventListener('click', () => {
      if (!menu.hidden) { close(); return; }
      position();
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      menu.querySelector('[role="menuitem"]')?.focus();
    });
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); trigger.focus(); }
    });
    window.addEventListener('resize', () => { if (!menu.hidden) position(); });

    const catalogUrl = rootPath ? rootPath + 'demos.html' : 'demos.html';
    fetch(catalogUrl).then((r) => {
      if (!r.ok) throw new Error('Could not load demo catalog');
      return r.text();
    }).then((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const cards = [...doc.querySelectorAll('.card-link')];
      menu.innerHTML = cards.map((card) => {
        const title = card.querySelector('h3')?.textContent.trim() || '';
        const href = card.getAttribute('href') || '';
        const id = href.split('/').filter(Boolean).pop() || '';
        let url = href;
        if (location.protocol === 'file:') {
          url = id ? '../demos/' + encodeURIComponent(id) + '.html' : href;
        } else if (!url.startsWith('/') && !/^https?:/.test(url)) {
          url = '/' + url.replace(/^\/+/, '');
        }
        const current = id === (metaData && metaData.id);
        return `<a class="breadcrumb-menu-item${current ? ' current' : ''}" role="menuitem" href="${esc(url)}"${current ? ' aria-current="page"' : ''}><span>${esc(title)}</span>${current ? '<i class="ph ph-check" aria-hidden="true"></i>' : ''}</a>`;
      }).join('');
    }).catch(() => {
      menu.innerHTML = '<span class="breadcrumb-menu-empty" role="menuitem" aria-disabled="true">Demo list unavailable</span>';
    });
  }

  function buildChrome() {
    const isDemo = document.body.classList.contains('demo');
    const isCatalog = document.querySelector('.chips') && document.querySelector('.catalog');
    const m = meta();
    const rootPath = root.dataset.root || '';
    const header = document.createElement('header');
    header.className = 'site-header';
    if (isDemo) {
      header.innerHTML = brandHtml() +
        `<nav class="breadcrumbs" aria-label="Breadcrumb"><i class="ph ph-caret-right breadcrumb-separator" aria-hidden="true"></i><a href="/demos">Interactive Demos</a><i class="ph ph-caret-right" aria-hidden="true"></i><div class="breadcrumb-current-wrap"><button class="breadcrumb-current" type="button" aria-haspopup="menu" aria-expanded="false"><span aria-current="page">${esc((m && m.title) || '')}</span><i class="ph ph-caret-down" aria-hidden="true"></i></button><div class="breadcrumb-menu" role="menu" hidden></div></div></nav>` +
        '<div class="header-actions"></div>';
    } else if (isCatalog) {
      header.innerHTML = brandHtml() +
        '<nav class="breadcrumbs" aria-label="Breadcrumb"><i class="ph ph-caret-right breadcrumb-separator" aria-hidden="true"></i><span aria-current="page">Interactive Demos</span></nav>' +
        '<div class="spacer"></div>' + themeBtn;
    } else {
      header.innerHTML = brandHtml() + '<div class="spacer"></div>' + themeBtn;
    }
    document.body.prepend(header);

    if (isDemo) {
      initDemoSwitcher(header, m, rootPath);
      const actions = header.querySelector('.header-actions');
      const mk = (icon, label, title) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn'; b.title = title || label;
        b.innerHTML = `<i class="ph ${icon}"></i><span class="lbl">${esc(label)}</span>`;
        actions.append(b); return b;
      };
      const lb = buildLightbox();
      if (lb) { const b = mk('ph-book-open-text', 'Read more', 'Read more: questions, explanation, things to try'); b.addEventListener('click', () => openMore()); }
      document.querySelectorAll('[data-dock]').forEach((el) => {
        const d = { name: el.dataset.dock, el, btn: null };
        d.btn = mk(el.dataset.icon || 'ph-sidebar', el.dataset.label || d.name);
        d.btn.addEventListener('click', () => setDock(d, !el.classList.contains('open')));
        docks.push(d);
        setDock(d, el.dataset.open === 'true' && window.innerWidth > 900);
      });
      actions.insertAdjacentHTML('beforeend', themeBtn);
    } else {
      const footer = document.createElement('footer');
      footer.className = 'site-footer';
      footer.innerHTML = `<span>${esc(CONFIG.footer)}</span>` +
        (CONFIG.repoUrl ? `<a class="footer-repo" href="${esc(CONFIG.repoUrl)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" title="View on GitHub"><i class="ph ph-github-logo" aria-hidden="true"></i></a>` : '');
      document.body.append(footer);
    }
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    if (window.matchMedia) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!root.dataset.theme) themeListeners.forEach((fn) => fn(currentTheme()));
      });
    }
    if (m && m.title) document.title = `${m.title} · ${CONFIG.siteTitle}`;
    else if (isCatalog) document.title = `Interactive Demos · ${CONFIG.siteTitle}`;
    else if (document.querySelector('.catalog')) document.title = CONFIG.siteTitle;
  }

  /* ---------- catalog filter (index page) ---------- */
  function initCatalog() {
    const cat = document.querySelector('.catalog');
    const chips = document.querySelector('.chips');
    if (!cat || !chips) return;
    const cards = [...cat.querySelectorAll('.card-link')];
    const topics = new Map();
    cards.forEach((c) => {
      const k = c.dataset.topic;
      if (k && !topics.has(k)) topics.set(k, (c.querySelector('.topic-label') || {}).textContent || k);
    });
    const make = (key, label) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.key = key; b.textContent = label;
      b.setAttribute('aria-pressed', key === '*' ? 'true' : 'false');
      return b;
    };
    chips.append(make('*', 'All'));
    topics.forEach((label, key) => chips.append(make(key, label)));
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      chips.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      cards.forEach((c) => c.classList.toggle('hidden', b.dataset.key !== '*' && c.dataset.topic !== b.dataset.key));
    });
  }

  function init() {
    buildChrome();
    initCatalog();
    const text = document.body.textContent;
    if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) math();
  }

  window.Site = {
    config: CONFIG, esc, math, meta, openMore, toggleDock,
    onTheme(fn) { themeListeners.push(fn); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
