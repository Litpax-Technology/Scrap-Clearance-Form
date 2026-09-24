'use strict';

const $ = (id) => document.getElementById(id);
const itemsBox = $('items');

let baaki = null;        // server se aaya current baaki (+ = party pe baaki, - = advance)
let saving = false;      // double-submit guard
let reqId = newReqId();  // same entry dobara save na ho

/* ---------- helpers ---------- */
function newReqId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function r2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
function rupee(n) {
  return '₹ ' + r2(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
function fillSelect(sel, list, placeholder) {
  sel.innerHTML = '';
  if (placeholder) sel.add(new Option(placeholder, ''));
  list.forEach(v => sel.add(new Option(v, v)));
}
function showMsg(text, type) {
  const m = $('msg');
  m.textContent = text;
  m.className = 'msg ' + (type || '');
}

/* ---------- JSONP call (timeout ke saath) ---------- */
function api(action, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = 'jp_' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 20000);
    function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
    window[cb] = (res) => { cleanup(); resolve(res); };
    const qs = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    s.src = CONFIG.API_URL + '?action=' + action + '&callback=' + cb + (qs ? '&' + qs : '');
    s.onerror = () => { cleanup(); reject(new Error('network')); };
    document.body.appendChild(s);
  });
}

/* ---------- scrap lines ---------- */
function addItem() {
  const row = document.createElement('div');
  row.className = 'item';
  row.innerHTML = `
    <select class="i-type" aria-label="Scrap type"></select>
    <input class="i-qty" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Kg" aria-label="Kg" />
    <input class="i-rate" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Rate ₹/Kg" aria-label="Rate" />
    <span class="i-amt">₹ 0</span>
    <button type="button" class="i-del" aria-label="Line hatao">×</button>
  `;
  fillSelect(row.querySelector('.i-type'), CONFIG.SCRAP_TYPES, 'Scrap type');
  row.querySelector('.i-del').addEventListener('click', () => {
    row.remove();
    if (!itemsBox.children.length) addItem();
    update();
  });
  itemsBox.appendChild(row);
  return row;
}

// khaali line ignore; aadhi bhari line = error
function readItems() {
  const items = [];
  let error = null;
  itemsBox.querySelectorAll('.item').forEach(row => {
    const type = row.querySelector('.i-type').value;
    const qtyRaw = row.querySelector('.i-qty').value;
    const rateRaw = row.querySelector('.i-rate').value;
    const qty = Number(qtyRaw), rate = Number(rateRaw);

    row.querySelector('.i-amt').textContent = rupee(qty * rate);

    if (!type && !qtyRaw && !rateRaw) return;
    if (!type || !(qty > 0) || !(rate > 0)) {
      error = error || 'Scrap ki har line mein type, Kg aur rate teeno bharo.';
      return;
    }
    items.push({ type, qty: r2(qty), rate: r2(rate) });
  });
  return { items, error };
}

/* ---------- live "save ke baad" line ---------- */
function update() {
  const { items } = readItems();
  const bana = r2(items.reduce((s, i) => s + r2(i.qty * i.rate), 0));
  const mila = r2($('mila').value);
  const line = $('afterLine');

  if (!bana && !mila) { line.textContent = ''; line.className = 'after-line'; return; }

  if (baaki === null) {
    line.textContent = 'Aaj: Bana ' + rupee(bana) + ', Mila ' + rupee(mila);
    line.className = 'after-line due';
    return;
  }

  const after = r2(baaki + bana - mila);
  if (after > 0) {
    line.textContent = 'Save ke baad baaki: ' + rupee(after);
    line.className = 'after-line due';
  } else if (after < 0) {
    line.textContent = 'Save ke baad advance: ' + rupee(-after);
    line.className = 'after-line ok';
  } else {
    line.textContent = 'Save ke baad sab clear ✓';
    line.className = 'after-line ok';
  }
}

/* ---------- upar wala bada amount ---------- */
function showBaaki(n) {
  baaki = r2(n);
  const hero = $('hero'), amt = $('baakiAmount'), label = $('baakiLabel');
  if (baaki > 0) {
    label.textContent = 'Abhi Baaki';
    amt.textContent = rupee(baaki);
    hero.dataset.state = 'due';
  } else if (baaki < 0) {
    label.textContent = 'Advance (party ka paisa jama hai)';
    amt.textContent = rupee(-baaki);
    hero.dataset.state = 'ok';
  } else {
    label.textContent = 'Abhi Baaki — sab clear';
    amt.textContent = rupee(0);
    hero.dataset.state = 'ok';
  }
  amt.classList.remove('bump');
  void amt.offsetWidth;
  amt.classList.add('bump');
}

async function loadBaaki() {
  try {
    const r = await api('summary');
    if (r.ok) showBaaki(r.baaki);
    else throw new Error(r.message);
  } catch (e) {
    $('baakiLabel').textContent = 'Baaki load nahi hua — page refresh karo';
    $('baakiAmount').textContent = '—';
  }
  update();
}

/* ---------- save ---------- */
async function onSave(e) {
  e.preventDefault();
  if (saving) return;

  const { items, error } = readItems();
  if (error) return showMsg(error, 'bad');

  const mila = r2($('mila').value);
  if (mila < 0) return showMsg('Paisa minus mein nahi ho sakta.', 'bad');
  if (!items.length && !(mila > 0)) return showMsg('Scrap ya paisa, kam se kam ek bharo.', 'bad');

  const kaise = $('kaise').value;
  if (mila > 0 && !kaise) return showMsg('Paisa kaise mila, ye chuno.', 'bad');

  const kisne = $('kisne').value.trim();
  if (!kisne) return showMsg('Kisne ka naam bharo.', 'bad');

  saving = true;
  const btn = $('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Save ho raha hai…';
  showMsg('', '');

  try {
    const payload = { reqId, items, mila, kaise, kisne, note: $('note').value.trim() };
    const r = await api('save', { data: JSON.stringify(payload) });
    if (!r.ok) { showMsg(r.message || 'Save nahi hua. Dobara try karo.', 'bad'); return; }

    // form saaf, naam rehne do
    $('khataForm').reset();
    $('kisne').value = kisne;
    itemsBox.innerHTML = '';
    addItem();
    reqId = newReqId();
    showBaaki(r.baaki);
    update();
    showMsg('Save ho gaya ✓', 'ok');
  } catch (err) {
    // form data waise hi rehta hai
    showMsg('Network problem. Data form mein hai, dobara Save dabao.', 'bad');
  } finally {
    saving = false;
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

/* ---------- start ---------- */
fillSelect($('kaise'), CONFIG.PAY_MODES, 'Chuno');
addItem();

$('addItemBtn').addEventListener('click', () => {
  addItem().querySelector('.i-type').focus();
});
$('khataForm').addEventListener('input', () => {
  reqId = newReqId();   // kuch badla = nayi entry
  update();
});
$('khataForm').addEventListener('submit', onSave);

loadBaaki();
