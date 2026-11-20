/* Общие скрипты сайта: появление элементов при прокрутке, масштаб мобильной
   раскладки, слайдер фотографий. Без зависимостей. */
(function () {
  'use strict';

  var root = document.documentElement;

  /* Коэффициент масштаба мобильной раскладки (макет 320 px) */
  function setScale() {
    root.style.setProperty('--k320', String(root.clientWidth / 320));
  }
  setScale();
  window.addEventListener('resize', setScale);

  /* ------------------------------------------------------------------------
     Появление элементов при прокрутке — тайминги как в Тильде:
     - всё стартует через 0,1 с после загрузки разметки (у Тильды было 1,5 с);
     - [data-reveal-group] (секция): все её элементы стартуют вместе, когда
       первый из них виден (минус 1/5 его высоты сверху и снизу); порядок
       задаётся их --rv-delay;
     - [data-reveal-chain]: элементы-«цепочка» (карточки, вопросы) стартуют,
       когда их верх выше низа окна, лесенкой по 0,16 с по рядам;
       [data-reveal-head] — заголовок секции, который сдвигает цепочку на 0,16 с;
     - остальные — по одному: как только элемент попал в окно, через 250 мс;
     - [data-reveal-desktop] на экранах уже 1200px не анимируется.
     ------------------------------------------------------------------------ */
  var STEP = 0.16;
  var START_DELAY = 100; /* мс после DOMContentLoaded */
  var desktopOnly = window.matchMedia('(max-width: 1199px)');

  function show(el, delay) {
    if (delay !== undefined) el.style.transitionDelay = delay + 's';
    el.classList.add('is-visible');
  }

  function absTop(el) {
    return el.getBoundingClientRect().top + window.pageYOffset;
  }

  function startReveal() {
    var all = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      all.forEach(function (el) { show(el); });
      return;
    }
    if (desktopOnly.matches) {
      all = all.filter(function (el) {
        if (el.hasAttribute('data-reveal-desktop')) { show(el); return false; }
        return true;
      });
    }
    var viewTop = window.pageYOffset;
    var viewBottom = viewTop + window.innerHeight;

    /* Группы */
    var groups = [];
    document.querySelectorAll('[data-reveal-group]').forEach(function (sec) {
      var members = all.filter(function (el) {
        return sec.contains(el) && !el.hasAttribute('data-reveal-chain');
      });
      if (members.length) groups.push({ sec: sec, members: members });
    });
    var inGroup = new Set();
    groups.forEach(function (g) {
      g.members.forEach(function (el) { inGroup.add(el); });
      var top = absTop(g.sec);
      if (top < viewBottom) {
        g.members.forEach(function (el) { show(el); });
        markHead(g.sec);
        return;
      }
      var first = g.members[0];
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        g.members.forEach(function (el) { show(el); });
        markHead(g.sec);
      }, { rootMargin: -Math.round(first.offsetHeight / 5) + 'px 0px' });
      io.observe(first);
    });

    function markHead(sec) {
      var now = Date.now();
      sec.querySelectorAll('[data-reveal-head]').forEach(function (h, i) {
        h.__start = now + i * STEP * 1000;
      });
    }

    /* Цепочки */
    var chains = [];
    document.querySelectorAll('[data-reveal-group]').forEach(function (sec) {
      var items = all.filter(function (el) {
        return sec.contains(el) && el.hasAttribute('data-reveal-chain');
      });
      if (items.length) chains.push({ sec: sec, items: items, firstInRow: [] });
    });

    function headDelayStatic(sec) {
      return sec.querySelectorAll('[data-reveal-head]').length * STEP;
    }

    function headDelayRecent(sec) {
      var now = Date.now();
      var heads = sec.querySelectorAll('[data-reveal-head]');
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].__start && now - heads[i].__start <= 160) return STEP;
      }
      return 0;
    }

    function prevDelay(c) {
      var pending = c.firstInRow.filter(function (el) { return !el.__shown; });
      if (!pending.length) return 0;
      var left = (pending[pending.length - 1].__start || 0) - Date.now();
      return left <= 0 ? STEP : left / 1000 + STEP;
    }

    function startChainItem(c, el, delay) {
      el.__start = Date.now() + delay * 1000;
      show(el, delay);
    }

    function trackRowStart(c, el) {
      c.firstInRow.push(el);
      el.addEventListener('transitionend', function () { el.__shown = true; }, { once: true });
    }

    /* Начальное состояние: видимые элементы цепочки идут подряд */
    chains.forEach(function (c) {
      var rest = [];
      var n = 0;
      var head = headDelayStatic(c.sec);
      var rowTop = c.items.length ? absTop(c.items[0]) : 0;
      c.items.forEach(function (el, i) {
        var top = absTop(el);
        if (top < viewTop) { show(el); return; }
        if (top < viewBottom) {
          if (i === 0 || top !== rowTop) { trackRowStart(c, el); rowTop = top; }
          startChainItem(c, el, STEP * n + head);
          n++;
        } else {
          rest.push(el);
        }
      });
      c.items = rest;
    });

    function onScrollChains() {
      var bottom = window.pageYOffset + window.innerHeight;
      chains.forEach(function (c) {
        if (!c.items.length) return;
        var offsets = c.items.map(absTop);
        if (!(offsets[0] < bottom)) return;
        var r = 0, rows = 0, rowTop = offsets[0];
        var s = prevDelay(c);
        var l = headDelayRecent(c.sec);
        trackRowStart(c, c.items[0]);
        var rest = [];
        for (var i = 0; i < c.items.length; i++) {
          var el = c.items[i];
          var top = offsets[i];
          if (!(top < bottom)) { rest = c.items.slice(i); break; }
          if (top !== rowTop) {
            trackRowStart(c, el);
            r = ++rows;
            rowTop = top;
          }
          startChainItem(c, el, r * STEP + s + l);
          r++;
        }
        c.items = rest;
      });
    }

    /* Одиночные элементы: положение считаем без сдвига анимации (как Тильда) */
    function layoutBox(el) {
      var r = el.getBoundingClientRect();
      var m = getComputedStyle(el).transform;
      var dy = 0;
      if (m && m !== 'none') {
        var v = m.match(/matrix(3d)?\(([^)]+)\)/);
        if (v) { var p = v[2].split(','); dy = parseFloat(p[v[1] ? 13 : 5]) || 0; }
      }
      return { top: r.top - dy, bottom: r.bottom - dy };
    }

    var singles = all.filter(function (el) {
      return !inGroup.has(el) && !el.hasAttribute('data-reveal-chain');
    });
    singles = singles.filter(function (el) {
      if (layoutBox(el).top < window.innerHeight) { show(el); return false; }
      return true;
    });

    function onScrollSingles() {
      var h = window.innerHeight;
      singles = singles.filter(function (el) {
        var b = layoutBox(el);
        if (b.top < h && b.bottom > 0) {
          setTimeout(function () { show(el); }, 250);
          return false;
        }
        return true;
      });
    }

    /* Прокрутка: первый вызов сразу, дальше не чаще раза в 100 мс */
    var last = 0, pending = null;
    function onScroll() {
      last = Date.now();
      onScrollChains();
      onScrollSingles();
    }
    window.addEventListener('scroll', function () {
      var wait = 100 - (Date.now() - last);
      if (wait <= 0) { onScroll(); return; }
      if (!pending) pending = setTimeout(function () { pending = null; onScroll(); }, wait);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(startReveal, START_DELAY); });
  } else {
    setTimeout(startReveal, START_DELAY);
  }

  /* Слайдер */
  document.querySelectorAll('.slider').forEach(function (slider) {
    var track = slider.querySelector('.slider__track');
    var slides = slider.querySelectorAll('.slider__slide');
    var captions = slider.querySelectorAll('.slider__caption');
    var count = slides.length;
    var index = 0;
    var delay = parseInt(slider.getAttribute('data-autoplay'), 10) || 0;
    var timer = null;

    /* Бесконечная прокрутка: копия первого слайда в конце ленты */
    track.appendChild(slides[0].cloneNode(true));

    function setPos(pos, animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translateX(' + (-100 * pos) + '%)';
      if (!animate) void track.offsetWidth;
    }

    function go(i) {
      if (i < 0) {
        setPos(count, false);
        i = count - 1;
      }
      index = i;
      setPos(index, true);
      captions.forEach(function (c, n) { c.classList.toggle('is-active', n === index % count); });
    }

    track.addEventListener('transitionend', function () {
      if (index >= count) {
        index = 0;
        setPos(0, false);
      }
    });

    function restart() {
      if (!delay) return;
      clearInterval(timer);
      timer = setInterval(function () { go(index + 1); }, delay);
    }

    slider.querySelector('.slider__arrow--prev').addEventListener('click', function () { go(index - 1); restart(); });
    slider.querySelector('.slider__arrow--next').addEventListener('click', function () { go(index + 1); restart(); });

    /* Свайп пальцем */
    var startX = null;
    slider.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    setPos(0, false);
    restart();
  });
})();
