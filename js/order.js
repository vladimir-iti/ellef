/* Форма заказа ленты: выбор типа и размеров, несколько позиций, отправка заявки.
   Открывается любой кнопкой [data-order]; data-order="reinforced|fiberglass"
   сразу выбирает тип ленты. */
(function () {
  'use strict';

  var dialog = document.getElementById('order');
  var tpl = document.getElementById('order-position');
  if (!dialog || !tpl || typeof dialog.showModal !== 'function') return;

  /* Ассортимент — как в таблицах размеров на страницах лент */
  var TAPES = {
    reinforced: { name: 'Техническая клейкая лента ТПЛ', short: 'Техническая ТПЛ', img: '/ellef/images/product-reinforced.webp', thick: [130, 150] },
    fiberglass: { name: 'Клейкая лента, усиленная стекловолокном', short: 'Усиленная стекловолокном', img: '/ellef/images/fiberglass-roll.webp', thick: [140] }
  };
  var WIDTHS = [48, 50];   /* мм */
  var LENGTHS = [15, 25, 50]; /* м */

  var form = dialog.querySelector('.order__form');
  var list = dialog.querySelector('[data-order-positions]');
  var body = dialog.querySelector('[data-order-body]');
  var done = dialog.querySelector('[data-order-done]');
  var errorBox = dialog.querySelector('[data-order-error]');
  var submitBtn = dialog.querySelector('[data-order-submit]');
  var phone = form.elements.phone;
  var seq = 0;
  var openedAt = 0;

  function pill(name, value, text, checked) {
    var label = document.createElement('label');
    label.className = 'order__pill';
    label.innerHTML = '<input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '><span>' + text + '</span>';
    return label;
  }

  function typeCard(name, key, checked) {
    var t = TAPES[key];
    var label = document.createElement('label');
    label.className = 'order__type';
    label.innerHTML = '<input type="radio" name="' + name + '" value="' + key + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="order__type-box"><img src="' + t.img + '" alt="" loading="lazy" width="64" height="64">' +
      '<span class="order__type-name">' + t.short + '<small>клейкая лента</small></span></span>';
    return label;
  }

  function fillThick(pos, type, keep) {
    var box = pos.querySelector('[data-pos-thick]');
    var name = pos.dataset.id + '-thick';
    var list = TAPES[type].thick;
    var current = keep && list.indexOf(+keep) !== -1 ? +keep : list[0];
    box.innerHTML = '';
    list.forEach(function (v) { box.appendChild(pill(name, v, v + ' мкм', v === current)); });
  }

  function renumber() {
    var items = list.querySelectorAll('.order__pos');
    items.forEach(function (pos, i) {
      pos.querySelector('[data-pos-title]').textContent = items.length > 1 ? 'Позиция ' + (i + 1) : 'Лента';
      pos.querySelector('[data-pos-remove]').hidden = items.length < 2;
    });
  }

  function addPosition(type) {
    var id = 'pos' + (++seq);
    var pos = tpl.content.firstElementChild.cloneNode(true);
    pos.dataset.id = id;
    type = TAPES[type] ? type : 'reinforced';

    var types = pos.querySelector('[data-pos-types]');
    Object.keys(TAPES).forEach(function (k) { types.appendChild(typeCard(id + '-type', k, k === type)); });
    var widths = pos.querySelector('[data-pos-width]');
    WIDTHS.forEach(function (v, i) { widths.appendChild(pill(id + '-width', v, v + ' мм', i === 0)); });
    var lengths = pos.querySelector('[data-pos-length]');
    LENGTHS.forEach(function (v, i) { lengths.appendChild(pill(id + '-length', v, v + ' м', i === 0)); });
    fillThick(pos, type);

    types.addEventListener('change', function (e) {
      var kept = pos.querySelector('[data-pos-thick] input:checked');
      fillThick(pos, e.target.value, kept && kept.value);
    });

    var qty = pos.querySelector('[data-pos-qty]');
    pos.querySelectorAll('[data-qty]').forEach(function (b) {
      b.addEventListener('click', function () {
        qty.value = Math.max(1, (parseInt(qty.value, 10) || 0) + parseInt(b.dataset.qty, 10));
      });
    });
    qty.addEventListener('blur', function () { qty.value = Math.max(1, parseInt(qty.value, 10) || 1); });

    pos.querySelector('[data-pos-remove]').addEventListener('click', function () {
      pos.remove();
      renumber();
    });

    list.appendChild(pos);
    renumber();
    return pos;
  }

  function positions() {
    return Array.prototype.map.call(list.querySelectorAll('.order__pos'), function (pos) {
      function val(sel) { var el = pos.querySelector(sel + ' input:checked'); return el ? el.value : ''; }
      var type = val('[data-pos-types]');
      return {
        type: TAPES[type].name,
        thickness: +val('[data-pos-thick]'),
        width: +val('[data-pos-width]'),
        length: +val('[data-pos-length]'),
        qty: Math.max(1, parseInt(pos.querySelector('[data-pos-qty]').value, 10) || 1)
      };
    });
  }

  function summary(items) {
    return items.map(function (p, i) {
      return (items.length > 1 ? (i + 1) + ') ' : '') + p.type + ', ' + p.thickness + ' мкм, ' +
        p.width + ' мм × ' + p.length + ' м — ' + p.qty + ' рул.';
    }).join('\n');
  }

  /* Телефон: +7 (999) 123-45-67 */
  function formatPhone(v) {
    var d = v.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  phone.addEventListener('input', function () {
    var atEnd = phone.selectionStart === phone.value.length;
    phone.value = formatPhone(phone.value);
    if (atEnd) phone.setSelectionRange(phone.value.length, phone.value.length);
  });

  function showError(text, field) {
    errorBox.textContent = text;
    errorBox.hidden = !text;
    form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    if (field) {
      (field.closest('.order__field, .order__consent') || field).classList.add('is-invalid');
      field.focus();
    }
  }

  function validate() {
    var el = form.elements;
    if (!el.name.value.trim()) return showError('Укажите имя.', el.name), false;
    if (el.phone.value.replace(/\D/g, '').length !== 11) return showError('Укажите телефон полностью.', el.phone), false;
    if (!el.consent.checked) return showError('Нужно согласие на обработку персональных данных.', el.consent), false;
    showError('');
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var el = form.elements;
    var items = positions();
    var fields = {
      name: el.name.value.trim(),
      phone: el.phone.value,
      order: summary(items),
      comment: el.comment.value.trim()
    };
    var endpoint = form.dataset.endpoint;
    var site = form.dataset.site;
    if (!endpoint || !site) {
      showError('Отправка заявок пока не подключена. Позвоните нам или напишите в мессенджер.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: site, page_url: location.href, website: el.website.value, form_ts: openedAt, fields: fields })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || data.ok === false) throw new Error(data.error || res.status);
      });
    }).then(function () {
      body.hidden = true;
      done.hidden = false;
    }).catch(function () {
      showError('Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.');
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    });
  });

  function reset(type) {
    form.reset();
    list.innerHTML = '';
    addPosition(type);
    showError('');
    body.hidden = false;
    done.hidden = true;
  }

  function open(type) {
    if (!done.hidden || !list.children.length) reset(type);
    else if (type) {
      /* Окно уже заполнялось — добавляем выбранный тип в первую позицию */
      var first = list.querySelector('.order__pos');
      var radio = first.querySelector('[data-pos-types] input[value="' + type + '"]');
      if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    openedAt = Date.now();
    dialog.showModal();
    document.documentElement.classList.add('order-open');
  }

  function close() { dialog.close(); }

  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('order-open');
  });

  /* Клик по затемнению вокруг окна закрывает его */
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) close();
  });
  dialog.querySelectorAll('[data-order-close]').forEach(function (b) { b.addEventListener('click', close); });
  dialog.querySelector('[data-order-add]').addEventListener('click', function () {
    var pos = addPosition();
    pos.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-order]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger.getAttribute('data-order'));
  });
})();
