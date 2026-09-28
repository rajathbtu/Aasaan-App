/* ============================================================
   Aasaan — marketing site
   Vanilla JS, no dependencies. Every block is defensive: a missing
   selector or unsupported API skips that block instead of throwing.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky header + scroll progress ---------- */
  (function header() {
    var el = $('#header');
    var bar = $('#scrollProgress');
    if (!el) return;

    var ticking = false;
    function update() {
      var y = window.scrollY;
      el.classList.toggle('is-stuck', y > 12);

      if (bar) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        // Guard against divide-by-zero on short pages / zoomed-out viewports.
        bar.style.width = (max > 0 ? Math.min((y / max) * 100, 100) : 0) + '%';
      }
      ticking = false;
    }

    update();
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  })();

  /* ---------- Mobile navigation ---------- */
  (function mobileNav() {
    var toggle = $('#navToggle');
    var nav = $('#nav');
    if (!toggle || !nav) return;

    // The mobile drawer is full-screen, so there is no scrim to manage.
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // matchMedia is absent in some embedded engines, so fall back to resize.
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 1001px)');
      var change = function (e) { if (e.matches) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', change);
      else if (mq.addListener) mq.addListener(change);
    } else {
      window.addEventListener('resize', function () {
        if (window.innerWidth > 1000) setOpen(false);
      });
    }
  })();

  /* ---------- Scroll spy ---------- */
  (function scrollSpy() {
    var links = $$('.nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = [];
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = id && document.getElementById(id);
      if (!section) return;
      map[id] = link;
      sections.push(section);
    });
    if (!sections.length) return;

    var onScreen = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { onScreen[e.target.id] = e.isIntersecting; });
      var active = null;
      for (var i = 0; i < sections.length; i++) {
        if (onScreen[sections[i].id]) { active = sections[i].id; break; }
      }
      links.forEach(function (l) { l.classList.remove('is-current'); });
      if (active && map[active]) map[active].classList.add('is-current');
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
  })();

  /* ---------- Services: filter + live search ---------- */
  (function services() {
    var grid = $('#serviceGrid');
    var input = $('#serviceSearch');
    var status = $('#serviceCount');
    var empty = $('#serviceEmpty');
    var filters = $$('.filter[data-filter]');
    if (!grid) return;

    var cards = $$('.svc', grid);
    var TOTAL = cards.length;
    var category = 'all';

    function apply() {
      var q = (input && input.value ? input.value : '').trim().toLowerCase();
      var shown = 0;

      cards.forEach(function (card) {
        var name = (card.getAttribute('data-name') || '').toLowerCase();
        var cat = card.getAttribute('data-cat') || '';
        var text = (card.textContent || '').toLowerCase();
        var okCat = category === 'all' || cat === category;
        var okQ = !q || name.indexOf(q) !== -1 || text.indexOf(q) !== -1;
        card.hidden = !(okCat && okQ);
        if (!card.hidden) shown++;
      });

      if (status) {
        var I = window.AasaanI18n;
        if (category === 'all' && !q) {
          status.textContent = (I && I.t('svc.showingAll')) || ('Showing all ' + TOTAL + ' services');
        } else if (I) {
          status.textContent = I.fmt('svc.showing', { n: shown }) || ('Showing ' + shown + ' of ' + TOTAL + ' services');
        } else {
          status.textContent = 'Showing ' + shown + ' of ' + TOTAL + ' services';
        }
      }
      if (empty) empty.hidden = shown !== 0;
    }

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        category = btn.getAttribute('data-filter') || 'all';
        filters.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', String(on));
        });
        apply();
      });
    });

    if (input) {
      var t;
      input.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(apply, 120);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; apply(); }
      });
    }
    // Card names are swapped by i18n.js, so re-run the filter to keep the
    // count text and the search index in the active language.
    document.addEventListener('aasaan:lang', apply);
    apply();
  })();

  /* ---------- Count-up statistics ---------- */
  (function counters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;

    // With reduced motion (or no IO support) show the final value immediately.
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) {
        n.textContent = n.getAttribute('data-count') + (n.getAttribute('data-suffix') || '');
      });
      return;
    }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1100;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        // easeOutExpo so the number settles rather than stopping dead.
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  /* ---------- Sticky step progress (how it works) ---------- */
  (function stepProgress() {
    var steps = $$('#steps .step');
    var bar = $('#stepBar');
    if (!steps.length) return;

    function update() {
      var tops = steps.map(function (s) { return s.getBoundingClientRect().top; });

      // Before layout every rect reads 0. Without this guard the loop would
      // fall through and light the LAST step, which is a wrong default.
      var laidOut = tops.some(function (t) { return t !== tops[0]; });

      var current = 0;
      if (laidOut) {
        var mid = window.innerHeight * 0.45;
        for (var i = 0; i < steps.length; i++) {
          if (tops[i] <= mid) current = i;
        }
      }

      steps.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
      if (bar) bar.style.width = ((current + 1) / steps.length * 100) + '%';
    }

    update();
    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { update(); queued = false; });
    }, { passive: true });
    window.addEventListener('resize', update);
  })();

  /* ---------- FAQ accordion ---------- */
  (function faq() {
    $$('[data-accordion]').forEach(function (root) {
      $$('.faq-item', root).forEach(function (item) {
        var btn = $('.faq-q', item);
        var panel = $('.faq-a', item);
        if (!btn || !panel) return;
        btn.addEventListener('click', function () {
          var open = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!open));
          panel.hidden = open;
          item.classList.toggle('is-open', !open);
        });
      });
    });
  })();

  /* ---------- Demo form ---------- */
  (function demoForm() {
    var form = $('#demoForm');
    if (!form) return;

    var ok = $('#formOk');
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function setError(input, message) {
      var slot = $('[data-err-for="' + input.id + '"]');
      if (slot) slot.textContent = message || '';
      input.classList.toggle('bad', Boolean(message));
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function validate(input) {
      var v = (input.value || '').trim();
      var I = window.AasaanI18n;
      if (input.id === 'fName' && v.length < 2) { setError(input, (I && I.t('err.name')) || 'Please enter your name.'); return false; }
      if (input.id === 'fEmail' && !EMAIL.test(v)) { setError(input, (I && I.t('err.email')) || 'Please enter a valid email address.'); return false; }
      setError(input, '');
      return true;
    }

    var required = $$('input[required]', form);
    required.forEach(function (input) {
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('input', function () {
        if (input.classList.contains('bad')) validate(input);
      });
    });

    // A message written in the previous language would otherwise linger
    // after a switch, so re-run validation on anything currently in error.
    document.addEventListener('aasaan:lang', function () {
      required.forEach(function (input) {
        if (input.classList.contains('bad')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pass = true;
      var firstBad = null;
      required.forEach(function (input) {
        if (!validate(input)) { pass = false; if (!firstBad) firstBad = input; }
      });
      if (!pass) { if (firstBad) firstBad.focus(); return; }

      // Static site — no backend to POST to. Confirm inline, then hand the
      // enquiry to the visitor's mail client as a reliable fallback.
      var data = new FormData(form);
      var name = data.get('name') || '';
      var subject = encodeURIComponent('Aasaan demo request — ' + name);
      var body = encodeURIComponent(
        'Name: ' + name + '\n' +
        'Email: ' + (data.get('email') || '') + '\n' +
        'Company: ' + (data.get('company') || '—') + '\n\n' +
        'Sent from aasaanapp.in'
      );

      if (ok) ok.hidden = false;
      form.reset();
      required.forEach(function (i) { setError(i, ''); });

      window.setTimeout(function () {
        if (window.confirm('Thanks, ' + name + '! Open your email app to send this to hello@aasaanapp.in?')) {
          window.location.href = 'mailto:hello@aasaanapp.in?subject=' + subject + '&body=' + body;
        }
      }, 300);
    });
  })();

  /* ---------- Language change: re-render what JS generates ----------
     i18n.js swaps text nodes. Anything this file builds at runtime
     (the service counter, checklist items, validation messages) has
     to be rebuilt on the "aasaan:lang" event. */
  (function onLangChange() {
    var I = window.AasaanI18n;

    /* Checklist columns carry their items as an array, so the <li>s are
       rewritten here rather than translated one by one in the markup.
       The English is captured on the first run regardless of the active
       language, otherwise a page opened in Hindi would have nothing to
       restore when the visitor switches back. */
    function renderLists() {
      if (!I) return;
      $$('[data-i18n-list]').forEach(function (ul) {
        var key = ul.getAttribute('data-i18n-list');
        var en = $$('li', ul).map(function (li) { return li.textContent; });
        if (!ul.getAttribute('data-en-items')) {
          ul.setAttribute('data-en-items', en.join('\u0001'));
        } else {
          en = ul.getAttribute('data-en-items').split('\u0001');
        }
        var hi = I.list(key);
        var out = (I.active() === 'hi' && hi) ? hi : en;
        $$('li', ul).forEach(function (li, i) {
          if (out[i] != null) li.textContent = out[i];
        });
      });
    }

    function rerender() {
      if (!I) return;
      renderLists();
      // The service counter and form validation register their own
      // "aasaan:lang" listeners, so nothing else is needed here.
    }

    if (I) {
      rerender();
      document.addEventListener('aasaan:lang', rerender);
    }
  })();

  /* ---------- Scroll reveal ---------- */
  (function reveal() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Back to top ---------- */
  (function toTop() {
    var btn = $('#toTop');
    if (!btn) return;
    var onScroll = function () { btn.hidden = window.scrollY < 700; };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  })();

  /* ---------- Footer year ---------- */
  (function year() {
    var el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  })();
})();

