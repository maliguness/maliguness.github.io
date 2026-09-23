const SITE_PASSWORD = 'aleyna2026';
const UNLOCK_KEY = 'kasa-defteri-unlocked';

function generateId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

(function initLock() {
  const lockScreen = document.getElementById('lock-screen');
  const appRoot = document.getElementById('app-root');
  const lockForm = document.getElementById('lock-form');
  const lockError = document.getElementById('lock-error');

  if (sessionStorage.getItem(UNLOCK_KEY) === '1') {
    lockScreen.hidden = true;
    appRoot.hidden = false;
    return;
  }

  lockForm.addEventListener('submit', e => {
    e.preventDefault();
    const value = document.getElementById('lock-password').value;
    if (value === SITE_PASSWORD) {
      sessionStorage.setItem(UNLOCK_KEY, '1');
      lockScreen.hidden = true;
      appRoot.hidden = false;
    } else {
      lockError.hidden = false;
    }
  });
})();

const STORAGE_KEY = 'kasa-defteri-records';
const CURRENCY_SYMBOLS = { TRY: '₺', EUR: '€', USD: '$' };
const PAYMENT_LABELS = { cash: 'Nakit', card: 'Kredi Kartı', unspecified: 'Belirtilmemiş' };

let records = loadRecords();
let currentRange = 'today';
let editingId = null;

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(dateStr, -day);
}

function startOfMonth(dateStr) {
  return dateStr.slice(0, 7) + '-01';
}

function endOfMonth(dateStr) {
  const d = new Date(dateStr.slice(0, 7) + '-01T00:00:00');
  d.setMonth(d.getMonth() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getDateRange() {
  const today = todayStr();
  switch (currentRange) {
    case 'today':
      return { start: today, end: today, label: 'Bugünkü Kayıtlar' };
    case 'yesterday': {
      const y = addDays(today, -1);
      return { start: y, end: y, label: 'Dünkü Kayıtlar' };
    }
    case 'week':
      return { start: startOfWeek(today), end: today, label: 'Bu Haftaki Kayıtlar' };
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today), label: 'Bu Ayki Kayıtlar' };
    case 'custom': {
      const val = selectedCustomDate || today;
      return { start: val, end: val, label: `${formatDate(val)} Kayıtları` };
    }
    case 'range': {
      const start = document.getElementById('range-start').value || today;
      const end = document.getElementById('range-end').value || today;
      return { start, end, label: `${formatDate(start)} – ${formatDate(end)} Kayıtları` };
    }
    default:
      return { start: today, end: today, label: 'Kayıtlar' };
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function formatAmount(amount) {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function filteredRecords() {
  const { start, end } = getDateRange();
  return records
    .filter(r => r.date >= start && r.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function groupByCurrency(list) {
  const totals = {};
  list.forEach(r => {
    totals[r.currency] = (totals[r.currency] || 0) + r.amount;
  });
  return totals;
}

function renderAmountsByCurrency(container, totals) {
  const keys = Object.keys(totals);
  if (keys.length === 0) {
    container.innerHTML = '<span class="empty">— kayıt yok —</span>';
    return;
  }
  container.innerHTML = keys
    .sort()
    .map(cur => `<div class="amount-row">${CURRENCY_SYMBOLS[cur]} ${formatAmount(totals[cur])}</div>`)
    .join('');
}

function groupByCurrencyAndPayment(list) {
  const totals = {};
  list.forEach(r => {
    if (!totals[r.currency]) totals[r.currency] = { total: 0, cash: 0, card: 0, unspecified: 0 };
    const bucket = totals[r.currency];
    bucket.total += r.amount;
    if (r.paymentMethod === 'cash') bucket.cash += r.amount;
    else if (r.paymentMethod === 'card') bucket.card += r.amount;
    else bucket.unspecified += r.amount;
  });
  return totals;
}

function renderAmountsWithPaymentBreakdown(container, totals) {
  const keys = Object.keys(totals);
  if (keys.length === 0) {
    container.innerHTML = '<span class="empty">— kayıt yok —</span>';
    return;
  }
  container.innerHTML = keys
    .sort()
    .map(cur => {
      const bucket = totals[cur];
      const parts = [];
      if (bucket.cash > 0) parts.push(`<span class="payment-tag cash">Nakit: ${CURRENCY_SYMBOLS[cur]} ${formatAmount(bucket.cash)}</span>`);
      if (bucket.card > 0) parts.push(`<span class="payment-tag card">Kredi kartı: ${CURRENCY_SYMBOLS[cur]} ${formatAmount(bucket.card)}</span>`);
      if (bucket.unspecified > 0) parts.push(`<span class="payment-tag unspecified">Belirtilmemiş: ${CURRENCY_SYMBOLS[cur]} ${formatAmount(bucket.unspecified)}</span>`);
      const breakdown = parts.length ? `<div class="amount-breakdown">${parts.join('')}</div>` : '';
      return `<div class="amount-row">${CURRENCY_SYMBOLS[cur]} ${formatAmount(bucket.total)}${breakdown}</div>`;
    })
    .join('');
}

function renderSummary(list) {
  const income = list.filter(r => r.type === 'income');
  const expense = list.filter(r => r.type === 'expense');
  const treat = list.filter(r => r.type === 'treat');
  const incomeByPayment = groupByCurrencyAndPayment(income);
  const expenseByPayment = groupByCurrencyAndPayment(expense);
  const treatTotals = groupByCurrency(treat);

  const balanceTotals = {};
  Object.keys(incomeByPayment).forEach(cur => {
    balanceTotals[cur] = (balanceTotals[cur] || 0) + incomeByPayment[cur].total;
  });
  Object.keys(expenseByPayment).forEach(cur => {
    balanceTotals[cur] = (balanceTotals[cur] || 0) - expenseByPayment[cur].total;
  });

  renderAmountsWithPaymentBreakdown(document.getElementById('summary-income'), incomeByPayment);
  renderAmountsWithPaymentBreakdown(document.getElementById('summary-expense'), expenseByPayment);
  renderAmountsByCurrency(document.getElementById('summary-balance'), balanceTotals);
  renderAmountsByCurrency(document.getElementById('summary-treat'), treatTotals);
}

function renderTable(list) {
  const tbody = document.getElementById('table-body');
  const emptyState = document.getElementById('empty-state');
  const { label } = getDateRange();

  document.getElementById('table-title').textContent = label;
  document.getElementById('table-count').textContent = `${list.length} kayıt`;

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  tbody.innerHTML = list.map(r => `
    <tr>
      <td data-label="Tarih">${formatDate(r.date)}</td>
      <td data-label="Açıklama">${escapeHtml(r.description)}</td>
      <td data-label="Kategori">${escapeHtml(r.category) || '—'}</td>
      <td data-label="Tür"><span class="badge ${r.type}">${typeLabel(r.type)}</span></td>
      <td data-label="Tutar" class="amount-cell ${r.type}">${CURRENCY_SYMBOLS[r.currency]} ${formatAmount(r.amount)}</td>
      <td data-label="Ödeme">${paymentBadge(r.paymentMethod)}</td>
      <td data-label="İşlemler">
        <div class="row-actions">
          <button class="icon-btn" data-edit="${r.id}">Düzenle</button>
          <button class="icon-btn danger" data-delete="${r.id}">Sil</button>
        </div>
      </td>
      <td class="swipe-delete">
        <button type="button" class="swipe-delete-btn" data-swipe-delete="${r.id}">Sil</button>
      </td>
    </tr>
  `).join('');
}

function paymentBadge(paymentMethod) {
  const key = PAYMENT_LABELS[paymentMethod] ? paymentMethod : 'unspecified';
  return `<span class="payment-tag ${key}">${PAYMENT_LABELS[key]}</span>`;
}

function typeLabel(type) {
  if (type === 'income') return 'Gelir';
  if (type === 'expense') return 'Gider';
  return 'İkram';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Günlük dağılım grafiği ----
const CHART_RANGES = ['week', 'month', 'range'];

function buildChartData(list) {
  const byCurrency = {};
  list.forEach(r => {
    if (!byCurrency[r.currency]) byCurrency[r.currency] = {};
    const days = byCurrency[r.currency];
    if (!days[r.date]) {
      days[r.date] = {
        income: 0,
        expense: 0,
        treat: 0,
        incomePayment: { cash: 0, card: 0, unspecified: 0 },
        expensePayment: { cash: 0, card: 0, unspecified: 0 },
      };
    }
    const day = days[r.date];
    day[r.type] += r.amount;
    if (r.type === 'income' || r.type === 'expense') {
      const bucket = r.type === 'income' ? day.incomePayment : day.expensePayment;
      const key = r.paymentMethod === 'cash' || r.paymentMethod === 'card' ? r.paymentMethod : 'unspecified';
      bucket[key] += r.amount;
    }
  });
  return byCurrency;
}

function chartBarHtml(type, amount, maxVal, currency, date, payment) {
  if (!(amount > 0)) {
    return '<div class="chart-bar-wrap"><div class="chart-bar empty"></div></div>';
  }
  const heightPct = Math.max(2, (amount / maxVal) * 100);
  const paymentAttr = payment ? ` data-payment='${JSON.stringify(payment)}'` : '';
  return `
    <div class="chart-bar-wrap">
      <button type="button" class="chart-bar ${type}" style="height:${heightPct}%"
        data-amount="${amount}" data-currency="${currency}" data-date="${date}" data-type="${type}"${paymentAttr}></button>
    </div>
  `;
}

function renderChart(list) {
  const chartCard = document.getElementById('chart-card');
  const groupsEl = document.getElementById('chart-groups');
  hideChartTooltip();

  if (!CHART_RANGES.includes(currentRange) || list.length === 0) {
    chartCard.hidden = true;
    groupsEl.innerHTML = '';
    return;
  }

  const byCurrency = buildChartData(list);
  const currencies = Object.keys(byCurrency).sort();

  groupsEl.innerHTML = currencies.map(cur => {
    const days = byCurrency[cur];
    const dates = Object.keys(days).sort();
    const maxVal = Math.max(1, ...dates.flatMap(d => [days[d].income, days[d].expense, days[d].treat]));

    const dayBlocks = dates.map(date => {
      const day = days[date];
      return `
        <div class="chart-day">
          <div class="chart-bars">
            ${chartBarHtml('income', day.income, maxVal, cur, date, day.incomePayment)}
            ${chartBarHtml('expense', day.expense, maxVal, cur, date, day.expensePayment)}
            ${chartBarHtml('treat', day.treat, maxVal, cur, date, null)}
          </div>
          <div class="chart-day-label">${formatDateShort(date)}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="chart-group">
        <div class="chart-currency-label">${CURRENCY_SYMBOLS[cur]} ${cur}</div>
        <div class="chart-scroll">${dayBlocks}</div>
      </div>
    `;
  }).join('');

  chartCard.hidden = false;
}

function showChartTooltip(anchor, html) {
  const tooltip = document.getElementById('chart-tooltip');
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
  let top = rect.top - tooltipRect.height - 10;
  if (top < 8) top = rect.bottom + 10;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideChartTooltip() {
  const tooltip = document.getElementById('chart-tooltip');
  if (tooltip) tooltip.hidden = true;
}

document.getElementById('chart-groups').addEventListener('click', e => {
  const bar = e.target.closest('.chart-bar');
  if (!bar || bar.classList.contains('empty')) {
    hideChartTooltip();
    return;
  }
  const amount = parseFloat(bar.dataset.amount);
  const currency = bar.dataset.currency;
  const type = bar.dataset.type;
  const date = bar.dataset.date;

  let html = `<strong>${typeLabel(type)} · ${formatDate(date)}</strong>`;
  html += `<div>${CURRENCY_SYMBOLS[currency]} ${formatAmount(amount)}</div>`;

  if (bar.dataset.payment) {
    const payment = JSON.parse(bar.dataset.payment);
    const parts = [];
    if (payment.cash > 0) parts.push(`Nakit: ${CURRENCY_SYMBOLS[currency]} ${formatAmount(payment.cash)}`);
    if (payment.card > 0) parts.push(`Kredi kartı: ${CURRENCY_SYMBOLS[currency]} ${formatAmount(payment.card)}`);
    if (payment.unspecified > 0) parts.push(`Belirtilmemiş: ${CURRENCY_SYMBOLS[currency]} ${formatAmount(payment.unspecified)}`);
    if (parts.length) html += `<div class="chart-tooltip-breakdown">${parts.join('<br>')}</div>`;
  }

  showChartTooltip(bar, html);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.chart-bar') && !e.target.closest('#chart-tooltip')) hideChartTooltip();
});

function render() {
  const list = filteredRecords();
  renderSummary(list);
  renderChart(list);
  renderTable(list);
}

// ---- Filter chips ----
document.getElementById('filter-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  currentRange = chip.dataset.range;

  document.getElementById('custom-date-field').hidden = currentRange !== 'custom';
  document.getElementById('range-start-field').hidden = currentRange !== 'range';
  document.getElementById('range-end-field').hidden = currentRange !== 'range';

  if (currentRange === 'custom') {
    const [y, m] = selectedCustomDate.split('-').map(Number);
    calendarViewYear = y;
    calendarViewMonth = m - 1;
    updateCalendarToggleLabel();
    renderCalendar();
  }
  if (currentRange === 'range') {
    if (!document.getElementById('range-start').value) document.getElementById('range-start').value = todayStr();
    if (!document.getElementById('range-end').value) document.getElementById('range-end').value = todayStr();
  }
  render();
});

document.getElementById('range-start').addEventListener('change', render);
document.getElementById('range-end').addEventListener('change', render);

// ---- Calendar widget ----
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
let selectedCustomDate = todayStr();
let [calendarViewYear, calendarViewMonth] = selectedCustomDate.split('-').map(Number);
calendarViewMonth -= 1;

const calendarToggle = document.getElementById('calendar-toggle');
const calendarPopup = document.getElementById('calendar-popup');

function updateCalendarToggleLabel() {
  calendarToggle.textContent = formatDate(selectedCustomDate);
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  label.textContent = `${MONTH_NAMES[calendarViewMonth]} ${calendarViewYear}`;

  const first = new Date(calendarViewYear, calendarViewMonth, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

  let html = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startDay; i++) html += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const classes = ['cal-cell'];
    if (dateStr === selectedCustomDate) classes.push('selected');
    if (dateStr === todayStr()) classes.push('today');
    html += `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}">${d}</button>`;
  }
  grid.innerHTML = html;
}

updateCalendarToggleLabel();

function positionCalendarPopup() {
  calendarPopup.style.left = '';
  calendarPopup.style.right = '';
  const rect = calendarPopup.getBoundingClientRect();
  if (rect.right > window.innerWidth - 8) {
    calendarPopup.style.left = 'auto';
    calendarPopup.style.right = '0';
  } else if (rect.left < 8) {
    calendarPopup.style.left = '0';
    calendarPopup.style.right = 'auto';
  }
}

calendarToggle.addEventListener('click', () => {
  calendarPopup.hidden = !calendarPopup.hidden;
  if (!calendarPopup.hidden) {
    renderCalendar();
    positionCalendarPopup();
  }
});

document.getElementById('cal-prev').addEventListener('click', () => {
  calendarViewMonth -= 1;
  if (calendarViewMonth < 0) { calendarViewMonth = 11; calendarViewYear -= 1; }
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  calendarViewMonth += 1;
  if (calendarViewMonth > 11) { calendarViewMonth = 0; calendarViewYear += 1; }
  renderCalendar();
});

document.getElementById('calendar-grid').addEventListener('click', e => {
  const cell = e.target.closest('.cal-cell:not(.empty)');
  if (!cell) return;
  selectedCustomDate = cell.dataset.date;
  updateCalendarToggleLabel();
  calendarPopup.hidden = true;
  renderCalendar();
  render();
});

document.addEventListener('click', e => {
  if (!calendarPopup.hidden && !e.target.closest('.calendar-widget')) {
    calendarPopup.hidden = true;
  }
});

// ---- Table row actions ----
const tableBody = document.getElementById('table-body');
const SWIPE_REVEAL = 84;
let swipeState = null;

function closeOpenSwipes(exceptRow = null) {
  tableBody.querySelectorAll('tr.swiped').forEach(row => {
    if (row === exceptRow) return;
    row.classList.remove('swiped');
    row.querySelectorAll('td:not(.swipe-delete)').forEach(td => {
      td.style.transition = 'transform 0.2s ease';
      td.style.transform = '';
    });
  });
}

tableBody.addEventListener('touchstart', e => {
  if (e.target.closest('button')) return;
  const row = e.target.closest('tr');
  if (!row) return;
  swipeState = { row, startX: e.touches[0].clientX, startY: e.touches[0].clientY, deltaX: 0, dragging: false };
}, { passive: true });

tableBody.addEventListener('touchmove', e => {
  if (!swipeState) return;
  const touch = e.touches[0];
  const dx = touch.clientX - swipeState.startX;
  const dy = touch.clientY - swipeState.startY;
  if (!swipeState.dragging) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    swipeState.dragging = Math.abs(dx) > Math.abs(dy);
    if (!swipeState.dragging) { swipeState = null; return; }
    closeOpenSwipes(swipeState.row);
  }
  const openOffset = swipeState.row.classList.contains('swiped') ? -SWIPE_REVEAL : 0;
  const deltaX = Math.min(0, Math.max(-SWIPE_REVEAL, openOffset + dx));
  swipeState.deltaX = deltaX;
  swipeState.row.querySelectorAll('td:not(.swipe-delete)').forEach(td => {
    td.style.transition = 'none';
    td.style.transform = `translateX(${deltaX}px)`;
  });
}, { passive: true });

tableBody.addEventListener('touchend', () => {
  if (!swipeState || !swipeState.dragging) { swipeState = null; return; }
  const { row, deltaX } = swipeState;
  const shouldOpen = deltaX <= -SWIPE_REVEAL / 2;
  row.classList.toggle('swiped', shouldOpen);
  row.querySelectorAll('td:not(.swipe-delete)').forEach(td => {
    td.style.transition = 'transform 0.2s ease';
    td.style.transform = shouldOpen ? `translateX(-${SWIPE_REVEAL}px)` : '';
  });
  swipeState = null;
});

tableBody.addEventListener('click', e => {
  const row = e.target.closest('tr');
  if (row && row.classList.contains('swiped') && !e.target.closest('.swipe-delete')) {
    closeOpenSwipes();
    return;
  }
  const swipeDeleteId = e.target.closest('[data-swipe-delete]')?.dataset.swipeDelete;
  if (swipeDeleteId) {
    closeOpenSwipes();
    openConfirmDelete(swipeDeleteId);
    return;
  }
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;
  if (editId) openModal(editId);
  if (deleteId) openConfirmDelete(deleteId);
});

document.addEventListener('click', e => {
  if (!e.target.closest('#table-body')) closeOpenSwipes();
});

// ---- Delete confirmation modal ----
const confirmOverlay = document.getElementById('confirm-overlay');
let pendingDeleteId = null;

function openConfirmDelete(id) {
  pendingDeleteId = id;
  confirmOverlay.hidden = false;
}

function closeConfirmDelete() {
  confirmOverlay.hidden = true;
  pendingDeleteId = null;
}

document.getElementById('confirm-delete').addEventListener('click', () => {
  if (pendingDeleteId) {
    records = records.filter(r => r.id !== pendingDeleteId);
    saveRecords();
    render();
  }
  closeConfirmDelete();
});

document.getElementById('confirm-cancel').addEventListener('click', closeConfirmDelete);
confirmOverlay.addEventListener('click', e => {
  if (e.target === confirmOverlay) closeConfirmDelete();
});

// ---- Modal ----
const overlay = document.getElementById('modal-overlay');
const form = document.getElementById('record-form');
let selectedType = 'income';

function openModal(id = null) {
  editingId = id;
  const record = id ? records.find(r => r.id === id) : null;

  document.getElementById('modal-title').textContent = record ? 'Kaydı Düzenle' : 'Yeni Kayıt';
  document.getElementById('record-id').value = id || '';
  document.getElementById('field-description').value = record ? record.description : '';
  document.getElementById('field-amount').value = record ? record.amount : '';
  document.getElementById('field-currency').value = record ? record.currency : 'TRY';
  document.getElementById('field-date').value = record ? record.date : todayStr();
  document.getElementById('field-category').value = record ? record.category : '';
  document.getElementById('field-payment').value = record ? (record.paymentMethod || 'unspecified') : 'cash';

  selectedType = record ? record.type : 'income';
  updateTypeButtons();

  document.getElementById('form-error').hidden = true;
  overlay.hidden = false;
}

function closeModal() {
  overlay.hidden = true;
  form.reset();
  document.getElementById('form-error').hidden = true;
  editingId = null;
}

function updateTypeButtons() {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === selectedType);
  });
}

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedType = btn.dataset.type;
    updateTypeButtons();
  });
});

document.getElementById('add-btn').addEventListener('click', () => openModal());
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

const formError = document.getElementById('form-error');

form.addEventListener('submit', e => {
  e.preventDefault();
  formError.hidden = true;

  const data = {
    type: selectedType,
    description: document.getElementById('field-description').value.trim(),
    amount: parseFloat(document.getElementById('field-amount').value),
    currency: document.getElementById('field-currency').value,
    date: document.getElementById('field-date').value,
    category: document.getElementById('field-category').value.trim(),
    paymentMethod: document.getElementById('field-payment').value,
  };

  if (!data.description) {
    formError.textContent = 'Lütfen bir açıklama girin.';
    formError.hidden = false;
    return;
  }
  if (!data.amount || data.amount <= 0 || Number.isNaN(data.amount)) {
    formError.textContent = 'Lütfen geçerli bir tutar girin.';
    formError.hidden = false;
    return;
  }
  if (!data.date) {
    formError.textContent = 'Lütfen bir tarih seçin.';
    formError.hidden = false;
    return;
  }

  try {
    if (editingId) {
      const idx = records.findIndex(r => r.id === editingId);
      records[idx] = { ...records[idx], ...data };
    } else {
      records.push({ id: generateId(), ...data });
    }

    saveRecords();
    closeModal();
    render();
  } catch (err) {
    formError.textContent = 'Kayıt kaydedilemedi: ' + err.message;
    formError.hidden = false;
  }
});

// ---- Init ----
render();
