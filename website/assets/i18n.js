/* ============================================================
   Aasaan — bilingual layer (English / हिन्दी)
   Zero dependencies, no build step. English is authored directly
   in the markup, so this only has to push Hindi in and put the
   English back when the visitor switches off.

   Loaded after hi.js and before app.js.

   How it works
     <html lang> is stamped before first paint so Devanagari never
     renders in a Latin-only font stack.
     [data-i18n]        -> textContent (or innerHTML with data-i18n-html)
     [data-i18n-attr]   -> "placeholder:key;aria-label:key2"
     .svc[data-name]    -> name/blurb swapped via the service tables
     A "aasaan:lang" CustomEvent lets app.js re-render anything it
     generates itself (service count, form validation).
   ============================================================ */
(function (window, document) {
  'use strict';

  var STORE = 'aasaan:lang';
  var SUPPORTED = ['en', 'hi'];
  var DICT = window.AASAAN_HI || {};

  /* English is authored in the markup, so the first time we touch an
     element we save its original value. Without this, switching to
     Hindi and back would leave the Hindi text in place. */
  var EN = { text: {}, html: {}, attr: {}, svcName: {}, svcDesc: {}, title: null, desc: null };

  function read() {
    try { return window.localStorage.getItem(STORE); } catch (e) { return null; }
  }
  function write(val) {
    try { window.localStorage.setItem(STORE, val); } catch (e) { /* private mode */ }
  }

  function current() {
    var v = read();
    return SUPPORTED.indexOf(v) !== -1 ? v : 'en';
  }

  /* The language currently being rendered. t() must read this rather
     than current(), because apply() persists the new choice only after
     the swap has run — reading storage here would lag one step behind
     and leave the page showing the previous language. */
  var active = current();

  /* Returns the Hindi string for `key`, or null when we're in English
     (or the key is unknown) — callers treat null as "use the English". */
  function t(key) {
    if (active !== 'hi') return null;
    var v = DICT[key];
    return typeof v === 'string' ? v : null;
  }

  /* Same idea for list values, which are arrays rather than strings. */
  function list(key) {
    if (active !== 'hi') return null;
    var v = DICT[key];
    return Array.isArray(v) ? v : null;
  }

  function fmt(key, vars) {
    var s = t(key);
    if (s == null) return null;
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m;
    });
  }

  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  function emit(lang) {
    var detail = { lang: lang }, ev;
    try {
      ev = new CustomEvent('aasaan:lang', { detail: detail });
    } catch (e) {
      ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('aasaan:lang', true, false, detail);
    }
    document.dispatchEvent(ev);
  }

  function applyText() {
    each('[data-i18n]', function (el) {
      var key = el.getAttribute('data-i18n');
      var isHtml = el.hasAttribute('data-i18n-html');
      var store = isHtml ? EN.html : EN.text;
      if (store[key] === undefined) {
        store[key] = isHtml ? el.innerHTML : el.textContent;
      }
      var s = t(key);
      if (isHtml) el.innerHTML = s == null ? EN.html[key] : s;
      else el.textContent = s == null ? EN.text[key] : s;
    });
  }

  function applyAttrs() {
    each('[data-i18n-attr]', function (el) {
      var pairs = el.getAttribute('data-i18n-attr').split(';');
      pairs.forEach(function (pair) {
        var i = pair.indexOf(':');
        if (i < 1) return;
        var attr = pair.slice(0, i).trim();
        var key = pair.slice(i + 1).trim();
        var ck = attr + '|' + key;
        if (EN.attr[ck] === undefined) EN.attr[ck] = el.getAttribute(attr);
        var s = t(key);
        el.setAttribute(attr, s == null ? EN.attr[ck] : s);
      });
    });
  }

  /* Service cards are generated from a list, so they are translated
     through the data-name index rather than per-element attributes. */
  function applyServices() {
    var hi = active === 'hi';
    each('.svc[data-name]', function (card) {
      var name = card.getAttribute('data-name');
      var h3 = card.querySelector('h3');
      var p = card.querySelector('p');

      if (h3) {
        if (EN.svcName[name] === undefined) EN.svcName[name] = h3.textContent;
        h3.textContent = hi ? (DICT.svcNames[name] || EN.svcName[name]) : EN.svcName[name];
      }
      if (p) {
        if (EN.svcDesc[name] === undefined) EN.svcDesc[name] = p.textContent;
        p.textContent = hi ? (DICT.svcDescs[name] || EN.svcDesc[name]) : EN.svcDesc[name];
      }
    });
  }

  function applyMeta() {
    if (EN.title === null) EN.title = document.title;
    document.title = t('meta.title') || EN.title;

    var desc = document.querySelector('meta[name="description"]');
    if (!desc) return;
    if (EN.desc === null) EN.desc = desc.getAttribute('content');
    var d = t('meta.desc');
    desc.setAttribute('content', d || EN.desc);
  }

  function applyToggle(lang) {
    each('[data-lang-btn]', function (b) {
      var on = b.getAttribute('data-lang-btn') === lang;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-on', on);
    });
  }

  function apply(lang) {
    lang = SUPPORTED.indexOf(lang) !== -1 ? lang : 'en';
    active = lang;

    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);

    applyText();
    applyAttrs();
    applyServices();
    applyMeta();
    applyToggle(lang);

    write(lang);
    emit(lang);
  }

  /* Wire up every [data-lang-btn] on the page (header + mobile drawer). */
  function bindToggle() {
    each('[data-lang-btn]', function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-lang-btn');
        if (want !== current()) apply(want);
      });
    });
  }

  window.AasaanI18n = {
    apply: apply,
    current: current,
    /* What is on screen right now, which during a switch is the new
       language rather than the one still in storage. */
    active: function () { return active; },
    t: t,
    list: list,
    fmt: fmt,
    supported: SUPPORTED
  };

  function boot() {
    var lang = current();
    // Stamp lang before paint so the right font stack applies immediately.
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    apply(lang);
    bindToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
