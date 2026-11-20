/* Общие компоненты: шапка, FAQ, плавная прокрутка к якорям.
   Ванильный JS без зависимостей, подключается с defer. */
(function () {
  'use strict';

  var MOBILE = window.matchMedia('(max-width: 960px)');
  var HOVER = window.matchMedia('(hover: hover)');

  /* ------------------------------------------------------------ Шапка */
  var header = document.querySelector('[data-header]');

  if (header) {
    var burger = header.querySelector('.header__burger');
    var subItem = header.querySelector('.header__item--sub');
    var subToggle = header.querySelector('.header__toggle');

    /* Бургер (≤960 px) */
    function setMenu(open) {
      header.classList.toggle('header--open', open);
      document.body.classList.toggle('header-menu-open', open);
      if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (burger) {
      burger.addEventListener('click', function () {
        setMenu(!header.classList.contains('header--open'));
      });
    }

    /* Клик по пункту меню, подменю или кнопке закрывает бургер */
    header.querySelector('.header__menu').addEventListener('click', function (e) {
      if (!MOBILE.matches) return;
      if (e.target.closest('.header__toggle')) return;
      if (e.target.closest('.header__link, .header__sub-link, .header__button')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && MOBILE.matches && header.classList.contains('header--open')) setMenu(false);
    });

    /* Подменю «Продкуция»: на десктопе с мышью — наведение (CSS),
       в бургере и на сенсорных экранах — по нажатию */
    function setSub(open) {
      subItem.classList.toggle('is-open', open);
      subToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (subItem && subToggle) {
      subToggle.addEventListener('click', function () {
        if (MOBILE.matches || !HOVER.matches) setSub(!subItem.classList.contains('is-open'));
      });
      subItem.addEventListener('mouseenter', function () {
        if (!MOBILE.matches && HOVER.matches) subToggle.setAttribute('aria-expanded', 'true');
      });
      subItem.addEventListener('mouseleave', function () {
        if (!MOBILE.matches && HOVER.matches) subToggle.setAttribute('aria-expanded', 'false');
      });
      document.addEventListener('click', function (e) {
        if (!MOBILE.matches && !subItem.contains(e.target)) setSub(false);
      });
    }

    /* Плавающая шапка на десктопе: после 700 px выезжает сверху,
       при возврате выше 700 px уезжает обратно */
    var OFFSET = 700;
    var state = 'static'; /* static | in | out */

    function slide(show) {
      if (show) {
        header.classList.remove('is-slide');
        header.classList.add('is-fixed', 'is-hidden');
        void header.offsetWidth;
        header.classList.add('is-slide');
        header.classList.remove('is-hidden');
        state = 'in';
      } else {
        header.classList.add('is-slide', 'is-hidden');
        state = 'out';
      }
    }

    header.addEventListener('transitionend', function (e) {
      if (e.target !== header || e.propertyName !== 'transform') return;
      if (state === 'out') {
        header.classList.remove('is-fixed', 'is-hidden', 'is-slide');
        state = 'static';
      }
    });

    function onScroll() {
      if (MOBILE.matches) return;
      var y = window.pageYOffset;
      if (y >= OFFSET && state !== 'in') slide(true);
      else if (y < OFFSET && state === 'in') slide(false);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    function onBreakpoint() {
      header.classList.remove('is-fixed', 'is-hidden', 'is-slide');
      state = 'static';
      setMenu(false);
      if (subItem) setSub(false);
    }

    if (MOBILE.addEventListener) MOBILE.addEventListener('change', onBreakpoint);
    else if (MOBILE.addListener) MOBILE.addListener(onBreakpoint);

    /* Подсветка якорного пункта («Контакты»), когда секция дошла
       до 300 px от верха окна или страница прокручена до конца */
    var anchorLinks = [].slice.call(header.querySelectorAll('.header__link[href^="#"]'));

    function highlightAnchors() {
      var y = window.pageYOffset;
      var bottom = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      anchorLinks.forEach(function (link) {
        var target = document.getElementById(link.getAttribute('href').slice(1));
        if (!target) return;
        var top = target.getBoundingClientRect().top + y;
        link.classList.toggle('is-active', y + 300 >= top || y >= bottom - 1);
      });
    }

    if (anchorLinks.length) {
      var hlTimer = null;
      window.addEventListener('scroll', function () {
        if (hlTimer) return;
        hlTimer = setTimeout(function () { hlTimer = null; highlightAnchors(); }, 100);
      }, { passive: true });
      highlightAnchors();
    }
  }

  /* -------------------------------------------------------------- FAQ */
  /* <details> работают и без JS (name="faq" — открыт один вопрос).
     Скрипт добавляет анимацию высоты и сам закрывает остальные вопросы. */
  document.querySelectorAll('.faq').forEach(function (faq) {
    var items = [].slice.call(faq.querySelectorAll('.faq__item'));

    function close(item) {
      var answer = item.querySelector('.faq__answer');
      item.classList.remove('is-open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
      void answer.offsetHeight;
      answer.style.maxHeight = '0px';
    }

    function open(item) {
      var answer = item.querySelector('.faq__answer');
      item.open = true;
      item.classList.add('is-open');
      answer.style.maxHeight = '0px';
      void answer.offsetHeight;
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }

    items.forEach(function (item) {
      var answer = item.querySelector('.faq__answer');
      item.removeAttribute('name');
      if (item.open) item.classList.add('is-open');

      answer.addEventListener('transitionend', function (e) {
        if (e.target !== answer || e.propertyName !== 'max-height') return;
        if (item.classList.contains('is-open')) answer.style.maxHeight = 'none';
        else item.open = false;
      });

      item.querySelector('.faq__question').addEventListener('click', function (e) {
        e.preventDefault();
        if (item.classList.contains('is-open')) {
          close(item);
        } else {
          items.forEach(function (other) {
            if (other !== item && other.classList.contains('is-open')) close(other);
          });
          open(item);
        }
      });
    });
  });

  /* ------------------------------------- Плавная прокрутка к якорям */
  /* Как в блоке Тильды 270: 500 мс, ускорение t², цель на 3 px ниже начала секции */
  var scrolling = false;

  function scrollToY(targetY) {
    var startY = window.pageYOffset;
    var delta = targetY - startY;
    var start = performance.now();
    scrolling = true;
    function step(now) {
      var t = Math.min((now - start) / 500, 1);
      window.scrollTo(0, startY + delta * t * t);
      if (t < 1) requestAnimationFrame(step);
      else { window.scrollTo(0, targetY); scrolling = false; }
    }
    requestAnimationFrame(step);
  }

  function targetY(hash, offset) {
    var id = decodeURIComponent(hash.slice(1));
    var el = document.getElementById(id) || document.querySelector('a[name="' + id.replace(/"/g, '') + '"]');
    if (!el) return null;
    return Math.max(Math.round(el.getBoundingClientRect().top + window.pageYOffset - offset), 0);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest('a[href*="#"]');
    if (!link || link.target === '_blank') return;
    if (link.pathname !== location.pathname || link.host !== location.host) return;
    var hash = link.hash;
    if (!hash || hash === '#' || hash.indexOf('#!') === 0 || /^#(popup|order|price|submenu)/.test(hash)) return;
    var y = hash === '#top' ? 0 : targetY(hash, -3); /* «Наверх»: в самый верх, шапка бывает фиксированной */
    if (y === null) return;
    e.preventDefault();
    if (scrolling) return;
    scrollToY(y);
    if (location.hash !== hash && history.pushState) history.pushState(null, '', hash);
  });

  /* Переход на страницу с якорем и «назад/вперёд» по якорям */
  function scrollToHash() {
    if (!location.hash) return;
    var y = targetY(location.hash, 0);
    if (y !== null) scrollToY(y);
  }

  window.addEventListener('popstate', scrollToHash);
  if (location.hash) setTimeout(scrollToHash, 1000);
})();
