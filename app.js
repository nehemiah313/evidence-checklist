let CONTROLS = [];
let EVIDENCE = { families: {}, controls: {} };
const items = {}; // "ctrlId|idx" -> {status: 'missing'|'progress'|'collected', loc: ''}
const implStatus = {}; // ctrlId -> calculator status
const LS_KEY = 'evidence-v1';
const LS_CALC = 'sprs-calc-v1';
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function byId(id) { return CONTROLS.find(c => c.id === id); }
function evList(c) { return EVIDENCE.controls[c.id] || EVIDENCE.families[c.family] || []; }
function key(id, i) { return id + '|' + i; }
function getItem(id, i) {
  const k = key(id, i);
  if (!items[k]) items[k] = { status: 'missing', loc: '' };
  return items[k];
}

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ items, implStatus })); } catch (e) {}
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (d) { Object.assign(items, d.items || {}); Object.assign(implStatus, d.implStatus || {}); }
  } catch (e) {}
}

function counts() {
  let total = 0, collected = 0;
  for (const c of CONTROLS) evList(c).forEach((_, i) => { total++; if (getItem(c.id, i).status === 'collected') collected++; });
  return { total, collected };
}

function updateProgress() {
  const { total, collected } = counts();
  $('progressFill').style.width = (total ? collected / total * 100 : 0) + '%';
  $('progressText').textContent = collected + ' of ' + total + ' evidence items collected';
  const unproven = CONTROLS.filter(c => implStatus[c.id] === 'yes' && evList(c).every((_, i) => getItem(c.id, i).status !== 'collected'));
  const box = $('unproven');
  if (unproven.length) {
    box.classList.remove('hidden');
    box.innerHTML = '<strong>' + unproven.length + ' requirement(s) marked Implemented with no evidence collected:</strong> ' +
      unproven.slice(0, 12).map(c => esc(c.id)).join(', ') + (unproven.length > 12 ? '…' : '') +
      '<br>Implemented without proof is unproven. Collect the evidence or change the status.';
  } else box.classList.add('hidden');
}

function buildUI() {
  const fams = {};
  for (const c of CONTROLS) (fams[c.family] = fams[c.family] || []).push(c);
  const fs = $('familyFilter');
  for (const f of Object.keys(fams).sort((a, b) => parseFloat(a) - parseFloat(b))) {
    const o = document.createElement('option');
    o.value = f; o.textContent = f + ' ' + fams[f][0].family_name;
    fs.appendChild(o);
  }
  $('families').innerHTML = Object.keys(fams).sort((a, b) => parseFloat(a) - parseFloat(b)).map(f => {
    const list = fams[f];
    return '<div class="family" data-fam="' + f + '"><h2>' + f + ' ' + esc(list[0].family_name) + ' <span class="fam-prog" data-fprog="' + f + '"></span></h2>' +
      list.map(c => {
        const ev = evList(c);
        const done = ev.filter((_, i) => getItem(c.id, i).status === 'collected').length;
        return '<div class="ctrl" data-ctrl="' + c.id + '" data-req="' + esc((c.requirement + ' ' + ev.join(' ')).toLowerCase()) + '">' +
          '<div class="ctrl-head"><span class="ctrl-id">' + c.id + '</span>' +
          '<span class="badge w' + c.weight.replace('/', '') + '">' + c.weight + 'pt</span>' +
          (c.never_deferrable ? '<span class="badge nd">NEVER DEFERRABLE</span>' : '') +
          (implStatus[c.id] === 'yes' ? '<span class="badge impl">calculator: implemented</span>' : '') +
          '<span class="ev-count">' + done + '/' + ev.length + '</span></div>' +
          '<p class="ctrl-req">' + esc(c.requirement) + '</p>' +
          '<div class="evlist">' + ev.map((eitem, i) => {
            const it = getItem(c.id, i);
            return '<div class="ev" data-ev="' + i + '">' +
              '<div class="seg">' +
              ['missing', 'progress', 'collected'].map(s =>
                '<button data-s="' + s + '" class="' + (it.status === s ? 'on-' + s : '') + '">' +
                (s === 'missing' ? 'Missing' : s === 'progress' ? 'In progress' : 'Collected') + '</button>').join('') +
              '</div>' +
              '<span class="ev-name">' + esc(eitem) + '</span>' +
              '<input class="ev-loc" data-loc placeholder="Where is it? (share, ticket #, URL…)" value="' + esc(it.loc) + '">' +
              '</div>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
  }).join('');
  $('families').querySelectorAll('.ev .seg button').forEach(b => {
    b.addEventListener('click', () => {
      const ev = b.closest('.ev');
      const id = b.closest('[data-ctrl]').dataset.ctrl;
      const it = getItem(id, +ev.dataset.ev);
      it.status = b.dataset.s;
      ev.querySelectorAll('button').forEach(x => x.className = x.dataset.s === it.status ? 'on-' + x.dataset.s : '');
      save(); updateProgress(); updateFamBars();
    });
  });
  $('families').querySelectorAll('.ev-loc').forEach(inp => {
    inp.addEventListener('change', () => {
      const ev = inp.closest('.ev');
      const id = inp.closest('[data-ctrl]').dataset.ctrl;
      getItem(id, +ev.dataset.ev).loc = inp.value;
      save();
    });
  });
  updateFamBars();
}

function updateFamBars() {
  document.querySelectorAll('[data-fprog]').forEach(el => {
    const f = el.dataset.fprog;
    let t = 0, d = 0;
    for (const c of CONTROLS.filter(c => c.family === f)) evList(c).forEach((_, i) => { t++; if (getItem(c.id, i).status === 'collected') d++; });
    el.textContent = d + '/' + t;
  });
}

function applyFilters() {
  const q = ($('search').value || '').toLowerCase();
  const fam = $('familyFilter').value;
  const sf = $('statusFilter').value;
  const gaps = $('onlyGaps').checked;
  document.querySelectorAll('#families .family').forEach(f => {
    let vis = 0;
    f.querySelectorAll('[data-ctrl]').forEach(el => {
      const c = byId(el.dataset.ctrl);
      let show = true;
      if (fam && c.family !== fam) show = false;
      if (q && !el.dataset.req.includes(q) && !c.id.includes(q)) show = false;
      if (sf) {
        const sts = evList(c).map((_, i) => getItem(c.id, i).status);
        if (!sts.includes(sf)) show = false;
      }
      if (gaps) {
        const done = evList(c).filter((_, i) => getItem(c.id, i).status === 'collected').length;
        if (done === evList(c).length) show = false;
      }
      el.style.display = show ? '' : 'none';
      if (show) vis++;
    });
    f.style.display = vis ? '' : 'none';
  });
}

function importFromCalc() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(LS_CALC) || '{}'); } catch (e) {}
  let n = 0;
  for (const id of Object.keys(d)) { if (byId(id)) { implStatus[id] = d[id]; n++; } }
  $('importNote').textContent = n ? 'Imported ' + n + ' statuses. Requirements marked Implemented with no evidence are flagged above.' : 'No saved calculator answers in this browser.';
  save(); buildUI(); updateProgress(); applyFilters();
}

function csvCell(v) {
  v = String(v == null ? '' : v).replace(/\r?\n/g, ' | ');
  return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function exportCsv() {
  const head = ['Control ID', 'Family', 'Weight', 'Requirement', 'Evidence Item', 'Status', 'Location'];
  const lines = [head.join(',')];
  for (const c of CONTROLS) evList(c).forEach((eitem, i) => {
    const it = getItem(c.id, i);
    lines.push([c.id, c.family + ' ' + c.family_name, c.weight, c.requirement, eitem, it.status, it.loc].map(csvCell).join(','));
  });
  download('evidence-checklist.csv', lines.join('\n'), 'text/csv');
}

function exportMd() {
  const { total, collected } = counts();
  let s = '# Evidence Checklist — NIST SP 800-171 Rev. 2\n\n';
  s += 'Collected ' + collected + ' of ' + total + ' evidence items. Generated ' + new Date().toISOString().slice(0, 10) + '.\n\n';
  s += '> An assessor verifies implementation through evidence. Collect the proof before the assessment, not during it.\n\n';
  const fams = {};
  for (const c of CONTROLS) (fams[c.family] = fams[c.family] || []).push(c);
  for (const f of Object.keys(fams).sort((a, b) => parseFloat(a) - parseFloat(b))) {
    s += '## ' + f + ' ' + fams[f][0].family_name + '\n\n';
    for (const c of fams[f]) {
      s += '### ' + c.id + ' (' + c.weight + '-point)\n\n' + c.requirement + '\n\n';
      evList(c).forEach((eitem, i) => {
        const it = getItem(c.id, i);
        s += '- [' + (it.status === 'collected' ? 'x' : ' ') + '] ' + eitem +
          (it.status !== 'missing' ? ' _(' + it.status + ')_' : '') +
          (it.loc ? ' — ' + it.loc : '') + '\n';
      });
      s += '\n';
    }
  }
  download('evidence-checklist.md', s, 'text/markdown');
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

async function init() {
  const [rc, re] = await Promise.all([
    fetch('data/nist-800-171-controls.json').then(r => r.json()),
    fetch('data/evidence.json').then(r => r.json()),
  ]);
  CONTROLS = rc.controls;
  EVIDENCE = re;
  load();
  buildUI();
  updateProgress();
  applyFilters();
  $('search').addEventListener('input', applyFilters);
  $('familyFilter').addEventListener('change', applyFilters);
  $('statusFilter').addEventListener('change', applyFilters);
  $('onlyGaps').addEventListener('change', applyFilters);
  $('importCalc').addEventListener('click', importFromCalc);
  $('exportCsv').addEventListener('click', exportCsv);
  $('exportMd').addEventListener('click', exportMd);
  $('printBtn').addEventListener('click', () => window.print());
  $('resetAll').addEventListener('click', () => {
    if (confirm('Clear all evidence tracking?')) {
      Object.keys(items).forEach(k => delete items[k]);
      Object.keys(implStatus).forEach(k => delete implStatus[k]);
      save(); buildUI(); updateProgress(); applyFilters();
    }
  });
}
init();
