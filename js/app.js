// RTG v4 – APP
var mineOkter = [];
var aktivFilter = 'all';
var aktivFeedFilter = 'alle';
var selectedFeeling = 3;
var rundeVisibility = 'privat';
var redigerOktId = null;
var valgteFokus = [];
var darkMode = false;

document.addEventListener('DOMContentLoaded', function() {
  var lagretModus = localStorage.getItem('rtg-modus');
  darkMode = lagretModus === 'mork';
  applyModus();
  initDB();
});

// ---- MODUS ----
function applyModus() {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  localStorage.setItem('rtg-modus', darkMode ? 'mork' : 'lys');
}
function toggleModus() { darkMode = !darkMode; applyModus(); }

// ---- SKJERM-KONTROLL ----
function visInnlogging() {
  if (typeof deaktiverGjestOverrides === 'function') deaktiverGjestOverrides();
  document.getElementById('splash').style.display = 'flex';
  document.getElementById('splash').classList.remove('hide');
  document.getElementById('screen-setup').classList.add('hidden');
  document.getElementById('topbar').classList.add('hidden');
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('bottom-nav').classList.add('hidden');
  var banner = document.getElementById('gjest-banner');
  if (banner) banner.style.display = 'none';
  visSplash(false);
}

function visOppsett() {
  document.getElementById('splash').style.display = 'none';
  document.getElementById('screen-setup').classList.remove('hidden');
  document.getElementById('topbar').classList.add('hidden');
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('bottom-nav').classList.add('hidden');
}

function visApp() {
  if (typeof erGjestemodus !== 'undefined' && erGjestemodus) aktiverGjestOverrides();
  document.getElementById('splash').style.display = 'none';
  document.getElementById('screen-setup').classList.add('hidden');
  document.getElementById('topbar').classList.remove('hidden');
  document.getElementById('main-content').classList.remove('hidden');
  document.getElementById('bottom-nav').classList.remove('hidden');
  document.getElementById('hcp-display').textContent = parseFloat(currentProfil.hcp).toFixed(1).replace('.', ',');
  var initials = currentProfil.navn.split(' ').map(function(n){return n[0];}).join('').slice(0,2).toUpperCase();
  document.getElementById('nav-avatar').textContent = initials;
  hentMineOkter().then(function(data) {
    mineOkter = data;
    settDagensDato();
    var lagretTab = localStorage.getItem('rtg-aktiv-tab') || 'dagbok';
    showTab(lagretTab);
  });
}

// ---- GJESTEMODUS OVERRIDES ----
var erGjestemodus = false;
function aktiverGjestOverrides() {
  erGjestemodus = true;
  window._lagreOktOrig = window.lagreOkt;
  window.lagreOkt = function() { showToast('Gjestemodus – ingenting lagres \uD83D\uDC40'); return Promise.resolve(null); };
  window._slettOktOrig = window.slettOkt;
  window.slettOkt = function() { showToast('Gjestemodus – ingenting lagres \uD83D\uDC40'); return Promise.resolve(false); };
  window._hentMineOkterOrig = window.hentMineOkter;
  window.hentMineOkter = function() { return Promise.resolve(typeof GJEST_OKTER !== 'undefined' ? GJEST_OKTER : []); };
  window._hentHCPHistorikkOrig = window.hentHCPHistorikk;
  window.hentHCPHistorikk = function() { return Promise.resolve(typeof GJEST_HCP_HISTORIKK !== 'undefined' ? GJEST_HCP_HISTORIKK : []); };
}
function deaktiverGjestOverrides() {
  erGjestemodus = false;
  if (window._lagreOktOrig) window.lagreOkt = window._lagreOktOrig;
  if (window._slettOktOrig) window.slettOkt = window._slettOktOrig;
  if (window._hentMineOkterOrig) window.hentMineOkter = window._hentMineOkterOrig;
  if (window._hentHCPHistorikkOrig) window.hentHCPHistorikk = window._hentHCPHistorikkOrig;
}

// ---- NAVIGASJON ----
function showTab(tab) {
  var gyldige = ['sosialt', 'dagbok', 'ny', 'statistikk', 'profil'];
  if (!gyldige.includes(tab)) tab = 'dagbok';
  localStorage.setItem('rtg-aktiv-tab', tab);
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  document.getElementById('screen-' + tab).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.sidebar-btn').forEach(function(b){b.classList.remove('active');});
  var btn = document.querySelector('.nav-btn[data-tab="' + tab + '"]');
  if (btn) btn.classList.add('active');
  var sBtn = document.querySelector('.sidebar-btn[data-tab="' + tab + '"]');
  if (sBtn) sBtn.classList.add('active');
  if (tab === 'sosialt') renderSosialt();
  if (tab === 'dagbok') renderDagbok();
  if (tab === 'ny') { redigerOktId = null; settDagensDato(); }
  if (tab === 'statistikk') renderStatistikk();
  if (tab === 'profil') renderProfil();
  window.scrollTo(0, 0);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  settDagensDato();
  if (id === 'screen-runde') {
    startKladdTimer();
    if (!selectedCourse && !redigerOktId) gjenopprettKladd();
  } else {
    stoppKladdTimer();
  }
}

function settDagensDato() {
  var idag = new Date().toISOString().split('T')[0];
  ['r-dato','s-dato','rg-dato','n-dato'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.value) el.value = idag;
  });
}

// ---- KLADD ----
var kladdeTimer = null;
function lagreKladd() {
  if (!selectedCourse || !selectedTee) return;
  var scores = selectedTee.par.map(function(par, i) {
    var el = document.getElementById('sc-slag-' + i);
    return el ? (parseInt(el.value) || null) : null;
  });
  var kladd = {
    baneId: selectedCourse.id, teeId: selectedTee.id,
    dato: document.getElementById('r-dato') ? document.getElementById('r-dato').value : '',
    notat: document.getElementById('r-notat') ? document.getElementById('r-notat').value : '',
    gir: document.getElementById('r-gir') ? document.getElementById('r-gir').value : '',
    fairways: document.getElementById('r-fairways') ? document.getElementById('r-fairways').value : '',
    fairwaysMulige: document.getElementById('r-fairways-mulige') ? document.getElementById('r-fairways-mulige').value : '',
    putts: document.getElementById('r-putts') ? document.getElementById('r-putts').value : '',
    scores: scores, tid: Date.now()
  };
  localStorage.setItem('rtg-kladd', JSON.stringify(kladd));
}
function gjenopprettKladd() {
  var raw = localStorage.getItem('rtg-kladd');
  if (!raw) return;
  try {
    var kladd = JSON.parse(raw);
    if (Date.now() - kladd.tid > 24 * 60 * 60 * 1000) { localStorage.removeItem('rtg-kladd'); return; }
    var bane = FASTE_BANER.find(function(b){return b.id===kladd.baneId||b.id===kladd.baneId.replace('_2x9','');});
    if (!bane) return;
    _applyCourse(bane, null);
    setTimeout(function() {
      if (kladd.teeId) velgTee(kladd.teeId);
      if (kladd.scores && kladd.scores.length) buildScorecard(selectedCourse, selectedTee, kladd.scores);
      if (kladd.dato) document.getElementById('r-dato').value = kladd.dato;
      if (kladd.notat) document.getElementById('r-notat').value = kladd.notat;
      if (kladd.gir) document.getElementById('r-gir').value = kladd.gir;
      if (kladd.fairways) document.getElementById('r-fairways').value = kladd.fairways;
      if (kladd.fairwaysMulige) document.getElementById('r-fairways-mulige').value = kladd.fairwaysMulige;
      if (kladd.putts) document.getElementById('r-putts').value = kladd.putts;
      showToast('Kladd gjenopprettet! \uD83D\uDCCB');
    }, 300);
  } catch(e) { localStorage.removeItem('rtg-kladd'); }
}
function slettKladd() { localStorage.removeItem('rtg-kladd'); }
function startKladdTimer() { clearInterval(kladdeTimer); kladdeTimer = setInterval(lagreKladd, 5000); }
function stoppKladdTimer() { clearInterval(kladdeTimer); }

// ---- HJELPEFUNKSJONER ----
function fmtDato(d) {
  if (!d) return '';
  var p = String(d).split('T')[0].split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}
function fmtScore(diff) {
  if (diff === undefined || diff === null || isNaN(diff)) return '\u2013';
  if (diff === 0) return 'E';
  return diff > 0 ? '+' + diff : '' + diff;
}
function scoreKlasse(diff) {
  if (diff < 0) return 'score-under';
  if (diff > 0) return 'score-over';
  return 'score-even';
}
function vaerIkon(temp, vind, nedbor) {
  if (nedbor > 2) return '\uD83C\uDF27\uFE0F';
  if (nedbor > 0) return '\uD83C\uDF26\uFE0F';
  if (vind > 20) return '\uD83D\uDCA8';
  if (temp > 20) return '\u2600\uFE0F';
  if (temp > 10) return '\u26C5';
  return '\uD83C\uDF24\uFE0F';
}
function lagTeeLabel(okt) {
  if (!okt.tee_navn) return '';
  var prikk = okt.tee_farge ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + okt.tee_farge + ';margin-right:4px;vertical-align:middle"></span>' : '';
  var nr = okt.tee_nr ? ' (' + okt.tee_nr + ')' : '';
  return '<span style="font-size:11px;color:' + (okt.tee_farge || '#d4a843') + '">' + prikk + okt.tee_navn + nr + '</span>';
}

// ---- SOSIALT ----
function renderSosialt() {
  var el = document.getElementById('sosialt-content');
  el.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>';
  Promise.all([hentAlleProfilHCP(), hentAlleFeedMedMine()]).then(function(results) {
    var hcpListe = results[0];
    var feed = results[1];
    var hcpHTML = '<div class="section-label">HCP-rangering</div>' +
      '<div class="hcp-liste">' +
      hcpListe.map(function(p, i) {
        var erDeg = p.bruker_id === currentUser.id;
        var init = p.navn.split(' ').map(function(n){return n[0];}).join('').slice(0,2).toUpperCase();
        var trend = '';
        return '<div class="hcp-rad' + (erDeg ? ' hcp-rad-deg' : '') + '">' +
          '<div class="hcp-rank">' + (i+1) + '</div>' +
          '<div class="hcp-avatar">' + init + '</div>' +
          '<div class="hcp-navn">' + p.navn + (erDeg ? ' (deg)' : '') + '</div>' +
          '<div class="hcp-verdi">' + parseFloat(p.hcp).toFixed(1).replace('.',',') + '</div>' +
          '</div>';
      }).join('') + '</div>';

    var filterHTML = '<div class="filter-tabs">' +
      '<button class="filter-btn ' + (aktivFeedFilter==='alle'?'active':'') + '" onclick="setFeedFilter(\'alle\')">Alle</button>' +
      '<button class="filter-btn ' + (aktivFeedFilter==='runder'?'active':'') + '" onclick="setFeedFilter(\'runder\')">Runder</button>' +
      '<button class="filter-btn ' + (aktivFeedFilter==='simulator'?'active':'') + '" onclick="setFeedFilter(\'simulator\')">Simulator</button>' +
      '</div>';

    var filtrert = feed.filter(function(o) {
      if (aktivFeedFilter === 'runder') return o.type === 'runde';
      if (aktivFeedFilter === 'simulator') return o.type === 'simulator';
      return true;
    });

    var feedHTML = filtrert.length
      ? '<div class="log-list">' + filtrert.map(lagFeedItem).join('') + '</div>'
      : '<div class="empty-state"><div class="empty-icon">\u26F3</div><div class="empty-title">Ingen runder ennå</div><div class="empty-text">Logg en runde for å se den her!</div></div>';

    el.innerHTML = hcpHTML + filterHTML + feedHTML;

    // Last reaksjoner og kommentarer
    filtrert.forEach(function(o) {
      hentReaksjoner(o.id).then(function(reaksjoner) {
        var rEl = document.getElementById('reaksjon-' + o.id);
        if (rEl) {
          var harReagert = reaksjoner.some(function(r){return r.bruker_id===currentUser.id;});
          rEl.innerHTML = '<i class="ti ti-thumb-up" style="font-size:14px" aria-hidden="true"></i> ' + reaksjoner.length;
          rEl.style.color = harReagert ? '#2a8a58' : '';
          rEl.style.fontWeight = harReagert ? '500' : '400';
          rEl.dataset.liked = harReagert ? '1' : '0';
        }
      });
      hentKommentarer(o.id).then(function(kommentarer) {
        var kEl = document.getElementById('kommentarer-' + o.id);
        if (kEl && kommentarer.length) {
          kEl.innerHTML = kommentarer.map(function(k) {
            return '<div class="kommentar"><strong>' + k.bruker_navn + ':</strong> ' + k.tekst + '</div>';
          }).join('');
        }
      });
    });
  });
}

function setFeedFilter(filter) {
  aktivFeedFilter = filter;
  renderSosialt();
}

function lagFeedItem(o) {
  var erMin = o.bruker_id === currentUser.id;
  var erPrivat = o.synlighet === 'privat';
  if (erPrivat && !erMin) return ''; // Aldri vis andres private runder
  var init = (o.bruker_navn||'?').split(' ').map(function(n){return n[0];}).join('').slice(0,2).toUpperCase();
  var diff = (o.total_slag||0) - (o.total_par||0);
  var vaer = o.vaer_temp ? vaerIkon(o.vaer_temp, o.vaer_vind, o.vaer_nedbor) + ' ' + o.vaer_temp + '\u00b0C' : '';
  var privBadge = erPrivat ? '<span class="type-pill pill-priv" style="display:inline-flex;align-items:center;gap:3px"><i class="ti ti-lock" style="font-size:10px" aria-hidden="true"></i> Privat</span>' : '';
  var sletteKnapp = erMin ? '<button class="slett-btn" onclick="bekreftSlettFeed(\'' + o.id + '\')">&#128465;</button>' : '';

  // Stats
  var girVal = o.gir !== null && o.gir !== undefined ? o.gir : null;
  var fwVal = (o.fairways !== null && o.fairways !== undefined && o.fairways_mulige) ? o.fairways + '/' + o.fairways_mulige : null;
  var puttsVal = o.putts !== null && o.putts !== undefined ? o.putts : null;
  var puttsHull = (puttsVal && o.hull) ? (o.putts / o.hull).toFixed(1) : null;
  var statBox = function(val, lbl) {
    var v = val !== null ? String(val) : 'N/A';
    var isNA = val === null;
    return '<div class="stat-box"><div class="stat-val' + (isNA?' stat-na':'') + '">' + v + '</div><div class="stat-lbl">' + lbl + '</div></div>';
  };

  return '<div class="log-item" id="okt-' + o.id + '">' +
    '<div class="log-item-header">' +
    '<div class="log-item-left">' +
    '<span class="type-pill ' + (o.type==='runde'?'type-runde':'type-simulator') + '">' + (o.type==='runde'?'RUNDE':'SIMULATOR') + '</span>' +
    lagTeeLabel(o) + privBadge +
    (vaer ? '<span class="vaer-info">' + vaer + '</span>' : '') +
    '</div>' +
    '<div class="log-item-right"><span class="log-date">' + fmtDato(o.dato) + '</span>' + sletteKnapp + '</div>' +
    '</div>' +
    '<div class="feed-author"><div class="av-sm' + (erMin?' av-you':'') + '">' + init + '</div><div class="author-name">' + (erMin ? 'Deg' : o.bruker_navn) + '</div></div>' +
    '<div class="feed-body">' +
    '<div class="feed-bane" onclick="' + (erMin ? "visRundeDetalj('" + o.id + "')" : '') + '" style="' + (erMin?'cursor:pointer':'') + '">' + o.bane +
    (erMin ? '<span class="detalj-link">Se detaljer \u203a</span>' : '') + '</div>' +
    '<div class="score-row">' +
    '<span class="score-big ' + scoreKlasse(diff) + '">' + (o.total_slag||'\u2013') + '</span>' +
    '<span class="score-diff">(' + fmtScore(diff) + ')</span>' +
    '<span class="score-meta">Par ' + (o.total_par||'\u2013') + ' \u00b7 ' + (o.hull||'') + ' hull</span>' +
    '</div>' +
    '<div class="stats-grid">' +
    statBox(girVal, 'GIR') +
    statBox(fwVal, 'Fairway') +
    statBox(puttsVal, 'Putts') +
    statBox(puttsHull, 'Putts/hull') +
    '</div>' +
    (erPrivat && erMin ? '<div class="priv-rad"><i class="ti ti-eye-off" style="font-size:12px" aria-hidden="true"></i> Kun synlig for deg</div>' : '') +
    '</div>' +
    '<div class="feed-actions">' +
    '<button class="act-btn" id="reaksjon-' + o.id + '" onclick="handleReaksjon(\'' + o.id + '\')">' +
    '<i class="ti ti-thumb-up" style="font-size:14px" aria-hidden="true"></i> 0</button>' +
    '<button class="act-btn" onclick="toggleKommentarFelt(\'' + o.id + '\')">' +
    '<i class="ti ti-message" style="font-size:14px" aria-hidden="true"></i> Kommenter</button>' +
    '</div>' +
    '<div id="kommentarer-' + o.id + '" class="kommentarer-liste"></div>' +
    '<div id="kommentar-felt-' + o.id + '" class="kommentar-felt hidden">' +
    '<input type="text" placeholder="Skriv en kommentar..." id="kommentar-input-' + o.id + '" ' +
    'onkeydown="if(event.key===\'Enter\')sendKommentar(\'' + o.id + '\')">' +
    '<button onclick="sendKommentar(\'' + o.id + '\')">Send</button>' +
    '</div></div>';
}

function handleReaksjon(oktId) {
  if (typeof erGjestemodus !== 'undefined' && erGjestemodus) { showToast('Gjestemodus \uD83D\uDC40'); return; }
  toggleReaksjon(oktId);
}

function toggleKommentarFelt(oktId) {
  var el = document.getElementById('kommentar-felt-' + oktId);
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) document.getElementById('kommentar-input-' + oktId).focus();
}

function sendKommentar(oktId) {
  if (typeof erGjestemodus !== 'undefined' && erGjestemodus) { showToast('Gjestemodus \uD83D\uDC40'); return; }
  var input = document.getElementById('kommentar-input-' + oktId);
  var tekst = (input.value||'').trim();
  if (!tekst) return;
  lagreKommentar(oktId, tekst).then(function(k) {
    if (k) {
      var kEl = document.getElementById('kommentarer-' + oktId);
      kEl.innerHTML += '<div class="kommentar"><strong>' + k.bruker_navn + ':</strong> ' + k.tekst + '</div>';
      input.value = '';
      document.getElementById('kommentar-felt-' + oktId).classList.add('hidden');
    }
  });
}

function bekreftSlettFeed(id) {
  if (confirm('Slette denne økten?')) {
    slettOkt(id).then(function(ok) {
      if (ok) { mineOkter = mineOkter.filter(function(o){return o.id!==id;}); showToast('Økt slettet'); renderSosialt(); }
    });
  }
}

// ---- DAGBOK ----
function renderDagbok() {
  hentMineOkter().then(function(data) {
    mineOkter = data;
    renderDashboard();
    renderLogg();
  });
}

function renderDashboard() {
  var runder = mineOkter.filter(function(o){return o.type==='runde';});
  var treninger = mineOkter.filter(function(o){return o.type==='range'||o.type==='simulator';});
  var scores = runder.map(function(r){return r.total_slag-r.total_par;});
  var snitt = scores.length ? (scores.reduce(function(a,b){return a+b;},0)/scores.length).toFixed(1) : null;
  document.getElementById('dash-runder').textContent = runder.length;
  document.getElementById('dash-snitt').textContent = snitt !== null ? fmtScore(parseFloat(snitt)) : '\u2013';
  document.getElementById('dash-treninger').textContent = treninger.length;
  document.getElementById('dash-totalt').textContent = mineOkter.length;
}

function setFilter(filter) {
  aktivFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(function(b){b.classList.toggle('active', b.dataset.filter===filter);});
  renderLogg();
}

function renderLogg() {
  var filtrert = mineOkter.filter(function(o) {
    if (aktivFilter==='all') return true;
    if (aktivFilter==='rounds') return o.type==='runde';
    if (aktivFilter==='range') return o.type==='range';
    if (aktivFilter==='simulator') return o.type==='simulator';
    if (aktivFilter==='notes') return o.type==='notat';
    return true;
  });
  var el = document.getElementById('dagbok-log');
  if (!filtrert.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">\u26F3</div><div class="empty-title">Ingen \u00f8kter enn\u00e5</div><div class="empty-text">Trykk + for \u00e5 logge din f\u00f8rste \u00f8kt!</div></div>';
    return;
  }
  el.innerHTML = filtrert.map(lagDagbokItem).join('');
}

function lagDagbokItem(o) {
  var sletteKnapp = '<button class="slett-btn" onclick="bekreftSlett(\'' + o.id + '\')">&#128465;</button>';
  var redigerKnapp = '<button class="rediger-btn" onclick="redigerOkt(\'' + o.id + '\')">&#9999;&#65039;</button>';
  if (o.type === 'runde') {
    var diff = o.total_slag - o.total_par;
    return '<div class="log-item" id="okt-' + o.id + '">' +
      '<div class="log-item-header">' +
      '<div class="log-item-left"><span class="type-pill type-runde">RUNDE</span>' + lagTeeLabel(o) + '</div>' +
      '<div class="log-item-right"><span class="log-date">' + fmtDato(o.dato) + '</span>' + redigerKnapp + sletteKnapp + '</div>' +
      '</div><div class="log-item-body" onclick="visRundeDetalj(\'' + o.id + '\')" style="cursor:pointer">' +
      '<div class="log-bane">' + o.bane + '<span class="detalj-link">Se detaljer \u203a</span></div>' +
      '<div class="score-row"><span class="score-big ' + scoreKlasse(diff) + '">' + o.total_slag + '</span>' +
      '<span class="score-diff">(' + fmtScore(diff) + ')</span>' +
      '<span class="score-meta">Par ' + o.total_par + ' \u00b7 ' + o.hull + ' hull</span></div>' +
      '</div></div>';
  }
  if (o.type === 'simulator') {
    var diff2 = o.total_slag - o.total_par;
    return '<div class="log-item" id="okt-' + o.id + '">' +
      '<div class="log-item-header"><span class="type-pill type-simulator">SIMULATOR</span>' +
      '<div class="log-item-right"><span class="log-date">' + fmtDato(o.dato) + '</span>' + redigerKnapp + sletteKnapp + '</div>' +
      '</div><div class="log-item-body"><div class="log-bane">' + (o.bane||'Simulator') + '</div>' +
      '<div class="score-row"><span class="score-big ' + scoreKlasse(diff2) + '">' + o.total_slag + '</span>' +
      '<span class="score-diff">(' + fmtScore(diff2) + ')</span>' +
      '<span class="score-meta">Par ' + o.total_par + '</span></div>' +
      '</div></div>';
  }
  if (o.type === 'range') {
    var emoji = ['','&#128533;','&#128528;','&#128578;','&#128522;','&#129321;'][o.feeling||3];
    var fokusListe = Array.isArray(o.fokus) ? o.fokus.join(', ') : (o.fokus||'');
    return '<div class="log-item" id="okt-' + o.id + '">' +
      '<div class="log-item-header"><span class="type-pill type-range">RANGE</span>' +
      '<div class="log-item-right"><span class="log-date">' + fmtDato(o.dato) + '</span>' + redigerKnapp + sletteKnapp + '</div>' +
      '</div><div class="log-item-body"><div class="log-bane">' + fokusListe + '</div>' +
      '<div class="log-meta">' + (o.tid?o.tid+' min':'') + (o.baller?' \u00b7 '+o.baller+' baller':'') + ' ' + emoji + '</div>' +
      '</div></div>';
  }
  if (o.type === 'notat') {
    return '<div class="log-item" id="okt-' + o.id + '">' +
      '<div class="log-item-header"><span class="type-pill type-notat">NOTAT</span>' +
      '<div class="log-item-right"><span class="log-date">' + fmtDato(o.dato) + '</span>' + redigerKnapp + sletteKnapp + '</div>' +
      '</div><div class="log-item-body"><div class="log-bane">' + o.tittel + '</div>' +
      (o.notat ? '<div class="log-note">' + o.notat + '</div>' : '') +
      '</div></div>';
  }
  return '';
}

// ---- SLETT ----
function bekreftSlett(id) {
  if (confirm('Slette denne \u00f8kten?')) {
    slettOkt(id).then(function(ok) {
      if (ok) { mineOkter = mineOkter.filter(function(o){return o.id!==id;}); showToast('\u00d8kt slettet'); renderDashboard(); renderLogg(); }
    });
  }
}

// ---- REDIGER ----
function redigerOkt(id) {
  var okt = mineOkter.find(function(o){return o.id===id;});
  if (!okt) return;
  redigerOktId = id;
  if (okt.type === 'runde') {
    var bane = FASTE_BANER.find(function(b){return b.id===okt.bane_id||b.id===(okt.bane_id||'').replace('_2x9','');});
    if (!bane) bane = { id: okt.bane_id||'rediger', navn: okt.bane, sted: okt.sted||'', lat: null, lon: null, hull: okt.hull, tees: [{id:'standard',navn:'Standard',nr:null,farge:'#2a8a58',par:okt.par_array||[]}], fast: false };
    showScreen('screen-runde');
    _applyCourse(bane, okt.scores||[]);
    setTimeout(function() {
      if (okt.tee_id) velgTee(okt.tee_id);
      document.getElementById('r-dato').value = okt.dato||'';
      document.getElementById('r-notat').value = okt.notat||'';
      if (okt.gir !== null && okt.gir !== undefined) document.getElementById('r-gir').value = okt.gir;
      if (okt.fairways !== null && okt.fairways !== undefined) document.getElementById('r-fairways').value = okt.fairways;
      if (okt.fairways_mulige) document.getElementById('r-fairways-mulige').value = okt.fairways_mulige;
      if (okt.putts !== null && okt.putts !== undefined) document.getElementById('r-putts').value = okt.putts;
      setVisibility(okt.synlighet||'privat');
    }, 200);
  }
  if (okt.type === 'simulator') {
    showScreen('screen-simulator');
    document.getElementById('s-dato').value = okt.dato||'';
    document.getElementById('s-bane').value = okt.bane||'';
    document.getElementById('s-par').value = okt.total_par||'';
    document.getElementById('s-total').value = okt.total_slag||'';
    document.getElementById('s-notat').value = okt.notat||'';
  }
  if (okt.type === 'range') {
    showScreen('screen-range');
    document.getElementById('rg-dato').value = okt.dato||'';
    document.getElementById('rg-tid').value = okt.tid||'';
    document.getElementById('rg-baller').value = okt.baller||'';
    document.getElementById('rg-notat').value = okt.notat||'';
    valgteFokus = Array.isArray(okt.fokus) ? okt.fokus.slice() : [];
    document.querySelectorAll('.fokus-btn').forEach(function(b){b.classList.toggle('active', valgteFokus.indexOf(b.dataset.val)>=0);});
    setFeeling(okt.feeling||3);
  }
  if (okt.type === 'notat') {
    showScreen('screen-notat');
    document.getElementById('n-dato').value = okt.dato||'';
    document.getElementById('n-tittel').value = okt.tittel||'';
    document.getElementById('n-tekst').value = okt.notat||'';
  }
}

// ---- RUNDE DETALJ ----
function visRundeDetalj(id) {
  var okt = mineOkter.find(function(o){return o.id===id;});
  if (!okt) return;
  var diff = okt.total_slag - okt.total_par;
  var par = okt.par_array||[];
  var scores = okt.scores||[];
  document.getElementById('detalj-tittel').textContent = okt.bane||'Runde';
  document.getElementById('detalj-sub').innerHTML = fmtDato(okt.dato) + (okt.tee_navn ? ' \u00b7 ' + lagTeeLabel(okt) : '');

  var vaerHTML = okt.vaer_temp ? '<div class="vaer-detalj">' + vaerIkon(okt.vaer_temp, okt.vaer_vind, okt.vaer_nedbor) + ' ' + okt.vaer_temp + '\u00b0C \u00b7 Vind ' + okt.vaer_vind + ' km/t \u00b7 Nedb\u00f8r ' + okt.vaer_nedbor + ' mm</div>' : '';

  var statBox = function(val, lbl) {
    var isNA = val === null || val === undefined;
    return '<div class="dash-card"><div class="dash-label">' + lbl + '</div><div class="dash-val' + (isNA?' stat-na':'') + '">' + (isNA ? 'N/A' : val) + '</div></div>';
  };

  var notHTML = okt.notat ? '<div style="margin:0 20px 16px"><div class="log-note" style="font-style:italic">\u201c' + okt.notat + '\u201d</div></div>' : '';

  var statsHTML = '<div class="dash-grid" style="grid-template-columns:repeat(4,1fr);padding:0 20px 16px">' +
    statBox(okt.gir !== null && okt.gir !== undefined ? okt.gir : null, 'GIR') +
    statBox((okt.fairways !== null && okt.fairways !== undefined && okt.fairways_mulige) ? okt.fairways + '/' + okt.fairways_mulige : null, 'Fairway') +
    statBox(okt.putts !== null && okt.putts !== undefined ? okt.putts : null, 'Putts') +
    statBox((okt.putts && okt.hull) ? (okt.putts/okt.hull).toFixed(1) : null, 'Putts/hull') +
    '</div>';

  var radHTML = '';
  if (par.length && scores.length) {
    radHTML = '<div style="margin:0 20px 16px">' +
      '<div class="scorecard-table">' +
      '<div class="sc-header"><div>Hull</div><div>Par</div><div>Slag</div><div>+/\u2212</div></div>' +
      par.map(function(p, i) {
        var s = scores[i]; var d = s ? s-p : null;
        var dTxt = d===null?'\u2013':d===0?'E':(d>0?'+'+d:d);
        var dKls = d===null?'':d<0?'score-under':d>0?'score-over':'score-even';
        return '<div class="sc-row"><div>Hull '+(i+1)+'</div><div>'+p+'</div><div style="font-weight:500">'+(s||'\u2013')+'</div><div class="'+dKls+'">'+dTxt+'</div></div>';
      }).join('') +
      '<div class="sc-total" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr">' +
      '<div style="padding:12px 14px">Totalt</div>' +
      '<div style="padding:12px 8px;text-align:center">'+okt.total_par+'</div>' +
      '<div style="padding:12px 8px;text-align:center;font-weight:700">'+okt.total_slag+'</div>' +
      '<div style="padding:12px 8px;text-align:center" class="sc-total-diff '+scoreKlasse(diff)+'">'+fmtScore(diff)+'</div>' +
      '</div></div></div>';
  }

  document.getElementById('detalj-content').innerHTML =
    '<div class="dash-grid" style="grid-template-columns:1fr 1fr;padding:0 20px 16px">' +
    '<div class="dash-card"><div class="dash-label">Score</div><div class="dash-val '+scoreKlasse(diff)+'">' + okt.total_slag + '</div><div class="dash-sub">'+fmtScore(diff)+' vs par</div></div>' +
    '<div class="dash-card"><div class="dash-label">HCP</div><div class="dash-val">' + (okt.hcp_ved_start||'\u2013') + '</div></div>' +
    '</div>' +
    (vaerHTML ? '<div style="padding:0 20px 12px">' + vaerHTML + '</div>' : '') +
    statsHTML + notHTML + radHTML;

  showScreen('screen-runde-detalj');
}

// ---- STATISTIKK ----
function renderStatistikk() {
  hentHCPHistorikk().then(function(historikk) {
    var el = document.getElementById('statistikk-content');
    var runder = mineOkter.filter(function(o){return o.type==='runde';});
    var scores = runder.map(function(r){return r.total_slag-r.total_par;});
    var beste = scores.length ? Math.min.apply(null, scores) : null;
    var snitt = scores.length ? (scores.reduce(function(a,b){return a+b;},0)/scores.length).toFixed(1) : null;

    var grafHTML = '';
    if (historikk.length > 1) {
      var hMin = Math.min.apply(null, historikk.map(function(h){return h.hcp;}));
      var hMax = Math.max.apply(null, historikk.map(function(h){return h.hcp;}));
      var hRange = hMax - hMin || 1;
      var W=320, H=160, pL=36, pR=12, pT=12, pB=28;
      var pts = historikk.map(function(item, i) {
        var x = pL + (i/Math.max(historikk.length-1,1))*(W-pL-pR);
        var y = pT + ((hMax-item.hcp)/hRange)*(H-pT-pB);
        return {x:x.toFixed(1), y:y.toFixed(1), hcp:item.hcp, dato:item.dato};
      });
      var polyline = pts.map(function(p){return p.x+','+p.y;}).join(' ');
      var area = 'M'+pts[0].x+','+pts[0].y+' '+pts.map(function(p){return 'L'+p.x+','+p.y;}).join(' ')+' L'+pts[pts.length-1].x+','+(H-pB)+' L'+pL+','+(H-pB)+' Z';
      var yLabels = [hMax,(hMax+hMin)/2,hMin].map(function(v,i){
        var y = pT+(i/2)*(H-pT-pB);
        return '<text x="'+(pL-4)+'" y="'+(y+4)+'" font-size="9" fill="var(--muted)" text-anchor="end" font-family="Outfit,sans-serif">'+v.toFixed(1)+'</text>';
      }).join('');
      var dots = pts.map(function(p){return '<circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="#d4a843"/>';}).join('');
      grafHTML = '<div class="stats-graf-wrap">' +
        '<div class="stats-graf-title">HCP-utvikling over tid</div>' +
        '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;display:block;border-radius:8px;overflow:hidden">' +
        '<rect width="'+W+'" height="'+H+'" fill="var(--graf-bg)"/>' +
        yLabels +
        '<path d="'+area+'" fill="var(--green-mid)" opacity="0.15"/>' +
        '<polyline points="'+polyline+'" fill="none" stroke="var(--green-mid)" stroke-width="2.5" stroke-linejoin="round"/>' +
        dots +
        '<text x="'+pL+'" y="'+(H-6)+'" font-size="8" fill="var(--muted)" font-family="Outfit,sans-serif">'+fmtDato(historikk[0].dato)+'</text>' +
        '<text x="'+(W-pR)+'" y="'+(H-6)+'" font-size="8" fill="var(--muted)" text-anchor="end" font-family="Outfit,sans-serif">'+fmtDato(historikk[historikk.length-1].dato)+'</text>' +
        '</svg>' +
        '<div class="hcp-endring-row">' +
        '<div><div class="dash-label">Start</div><div class="dash-val">'+historikk[0].hcp+'</div></div>' +
        '<div style="text-align:center"><div class="dash-label">Endring</div><div class="dash-val '+(historikk[historikk.length-1].hcp<historikk[0].hcp?'score-under':'score-over')+'">'+(historikk[historikk.length-1].hcp-historikk[0].hcp>0?'+':'')+(historikk[historikk.length-1].hcp-historikk[0].hcp).toFixed(1)+'</div></div>' +
        '<div style="text-align:right"><div class="dash-label">N\u00e5</div><div class="dash-val score-under">'+historikk[historikk.length-1].hcp+'</div></div>' +
        '</div></div>';
    } else {
      grafHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCC8</div><div class="empty-title">Ikke nok data</div><div class="empty-text">Oppdater HCP i profilen for \u00e5 starte grafen.</div></div>';
    }

    el.innerHTML = grafHTML +
      '<div class="stats-rader">' +
      '<div class="stats-rad"><span class="stats-label">Runder spilt</span><span class="stats-val">'+runder.length+'</span></div>' +
      '<div class="stats-rad"><span class="stats-label">Beste runde</span><span class="stats-val '+(beste!==null?scoreKlasse(beste):'')+'">'+( beste!==null?fmtScore(beste):'\u2013')+'</span></div>' +
      '<div class="stats-rad"><span class="stats-label">Snitt score</span><span class="stats-val">'+(snitt!==null?fmtScore(parseFloat(snitt)):'\u2013')+'</span></div>' +
      '<div class="stats-rad"><span class="stats-label">N\u00e5v\u00e6rende HCP</span><span class="stats-val" style="color:var(--green-mid)">'+parseFloat(currentProfil.hcp).toFixed(1).replace('.',',')+'</span></div>' +
      '</div>';
  });
}

// ---- PROFIL ----
function renderProfil() {
  var init = currentProfil.navn.split(' ').map(function(n){return n[0];}).join('').slice(0,2).toUpperCase();
  document.getElementById('profil-content').innerHTML =
    '<div class="profil-header"><div class="profil-avatar">'+init+'</div>' +
    '<div><div class="profil-navn">'+currentProfil.navn+'</div>' +
    '<div class="profil-email">'+(currentProfil.email||'')+'</div>' +
    '<div class="profil-hcp">HCP '+parseFloat(currentProfil.hcp).toFixed(1).replace('.',',')+'</div></div></div>' +

    '<div class="profil-section"><div class="profil-section-title">Oppdater HCP</div>' +
    '<div class="profil-row"><div class="profil-row-item"><span class="pri-label">HCP</span>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<input type="number" id="hcp-input-ny" class="pri-input" step="0.1" min="0" max="54" value="'+currentProfil.hcp+'" inputmode="decimal">' +
    '<button onclick="bekreftHCP()" class="confirm-btn">\u2713</button></div></div></div></div>' +

    '<div class="profil-section"><div class="profil-section-title">HCP-m\u00e5l</div>' +
    '<div class="profil-row"><div class="profil-row-item"><span class="pri-label">M\u00e5l</span>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<input type="number" id="hcp-mal-input" class="pri-input" step="0.1" min="0" max="54" placeholder="f.eks. 5.0" value="'+(currentProfil.hcp_mal||'')+'" inputmode="decimal">' +
    '<button onclick="bekreftHCPMal()" class="confirm-btn">\u2713</button></div></div></div>' +
    (currentProfil.hcp_mal ? '<div style="padding:8px 16px;font-size:13px;color:var(--muted)">Du er '+Math.abs(parseFloat(currentProfil.hcp)-parseFloat(currentProfil.hcp_mal)).toFixed(1)+' HCP unna m\u00e5let ditt p\u00e5 '+currentProfil.hcp_mal+'</div>' : '') +
    '</div>' +

    '<div class="profil-section"><div class="profil-section-title">Kallenavn</div>' +
    '<div class="profil-row"><div class="profil-row-item"><span class="pri-label">Navn</span>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<input type="text" id="navn-input" class="pri-input" style="width:120px;text-align:right" value="'+currentProfil.navn+'">' +
    '<button onclick="bekreftNavn()" class="confirm-btn">\u2713</button></div></div></div></div>' +

    '<div class="profil-section"><div class="profil-section-title">Utseende</div>' +
    '<div class="profil-row"><div class="profil-row-item"><span class="pri-label">M\u00f8rk modus</span>' +
    '<input type="checkbox" id="modus-check" '+(darkMode?'checked':'')+' onchange="toggleModus()" style="width:20px;height:20px;accent-color:var(--green);cursor:pointer"></div></div></div>' +

    '<button class="btn-loggut" onclick="loggUt()">Logg ut</button><div style="height:16px"></div>';
}

function bekreftHCP() {
  var val = parseFloat(document.getElementById('hcp-input-ny').value);
  if (isNaN(val)) { showToast('Ugyldig HCP'); return; }
  oppdaterProfil('hcp', val);
  showToast('HCP oppdatert til ' + val.toFixed(1).replace('.',',') + ' \u2713');
}
function bekreftHCPMal() {
  var val = parseFloat(document.getElementById('hcp-mal-input').value);
  if (isNaN(val)) { showToast('Ugyldig m\u00e5l'); return; }
  oppdaterProfil('hcp_mal', val);
  showToast('HCP-m\u00e5l satt til ' + val.toFixed(1).replace('.',',') + ' \uD83C\uDFAF');
  setTimeout(renderProfil, 500);
}
function bekreftNavn() {
  var val = document.getElementById('navn-input').value.trim();
  if (!val) { showToast('Skriv inn et navn'); return; }
  oppdaterProfil('navn', val);
  showToast('Navn oppdatert \u2713');
}

// ---- VISIBILITY ----
function setVisibility(val) {
  rundeVisibility = val;
  document.getElementById('vis-venner').classList.toggle('active', val==='venner');
  document.getElementById('vis-privat').classList.toggle('active', val==='privat');
}

// ---- FEELING ----
function setFeeling(val) {
  selectedFeeling = val;
  document.querySelectorAll('.feel-btn').forEach(function(b){b.classList.toggle('selected', parseInt(b.dataset.val)===val);});
}

// ---- FOKUS ----
function toggleFokus(val) {
  var idx = valgteFokus.indexOf(val);
  if (idx >= 0) valgteFokus.splice(idx,1); else valgteFokus.push(val);
  document.querySelectorAll('.fokus-btn').forEach(function(b){b.classList.toggle('active', valgteFokus.indexOf(b.dataset.val)>=0);});
}

// ---- LAGRE ----
async function saveRunde() {
  var sc = getScorecardData();
  if (!sc) { showToast('Velg en bane f\u00f8rst'); return; }
  if (sc.totalSlag === 0) { showToast('Fyll inn slag for minst ett hull'); return; }
  var erRediger = !!redigerOktId;
  var dato = document.getElementById('r-dato').value;

  var vaer = null;
  if (sc.lat && sc.lon && dato) vaer = await hentVaer(sc.lat, sc.lon, dato);

  // Hent stats
  var girEl = document.getElementById('r-gir');
  var fwEl = document.getElementById('r-fairways');
  var fwMEl = document.getElementById('r-fairways-mulige');
  var puttsEl = document.getElementById('r-putts');
  var girVal = girEl && girEl.value !== '' ? parseInt(girEl.value) : null;
  var fwVal = fwEl && fwEl.value !== '' ? parseInt(fwEl.value) : null;
  var fwMVal = fwMEl && fwMEl.value !== '' ? parseInt(fwMEl.value) : null;
  var puttsVal = puttsEl && puttsEl.value !== '' ? parseInt(puttsEl.value) : null;

  var okt = {
    id: redigerOktId || undefined, type: 'runde', dato: dato,
    bane: sc.bane, bane_id: sc.baneId, sted: sc.sted,
    hull: sc.hull, par_array: sc.parArray, scores: sc.scores,
    total_par: sc.totalPar, total_slag: sc.totalSlag, diff: sc.diff,
    tee_id: sc.teeId, tee_navn: sc.teeNavn, tee_nr: sc.teeNr, tee_farge: sc.teeFarge,
    gir: girVal, fairways: fwVal, fairways_mulige: fwMVal, putts: puttsVal,
    notat: document.getElementById('r-notat').value,
    synlighet: rundeVisibility,
    hcp_ved_start: parseFloat(currentProfil.hcp),
    vaer_temp: vaer ? vaer.temp : null,
    vaer_vind: vaer ? vaer.vind : null,
    vaer_nedbor: vaer ? vaer.nedbor : null,
  };
  lagreOkt(okt).then(function(res) {
    if (!res) return;
    hentMineOkter().then(function(data){mineOkter=data;});
    document.getElementById('r-notat').value = '';
    if (girEl) girEl.value = '';
    if (fwEl) fwEl.value = '';
    if (fwMEl) fwMEl.value = '';
    if (puttsEl) puttsEl.value = '';
    changeCourse();
    stoppKladdTimer(); slettKladd();
    redigerOktId = null;
    showToast(erRediger ? 'Runde oppdatert! \u26F3' : 'Runde lagret! \u26F3' + (vaer?' '+vaerIkon(vaer.temp,vaer.vind,vaer.nedbor):''));
    showTab('dagbok');
  });
}

function saveSimulator() {
  var par = parseInt(document.getElementById('s-par').value)||72;
  var total = parseInt(document.getElementById('s-total').value)||0;
  var erRediger = !!redigerOktId;
  var okt = {
    id: redigerOktId||undefined, type: 'simulator',
    dato: document.getElementById('s-dato').value,
    bane: document.getElementById('s-bane').value||'Simulator',
    total_par: par, total_slag: total, diff: total-par,
    notat: document.getElementById('s-notat').value,
    synlighet: rundeVisibility
  };
  lagreOkt(okt).then(function(res) {
    if (!res) return;
    hentMineOkter().then(function(data){mineOkter=data;});
    ['s-bane','s-par','s-total','s-notat'].forEach(function(id){document.getElementById(id).value='';});
    redigerOktId = null;
    showToast(erRediger?'Simulator oppdatert! \uD83D\uDDA5\uFE0F':'Simulatorrunde lagret! \uD83D\uDDA5\uFE0F');
    showTab('dagbok');
  });
}

function saveRange() {
  if (!valgteFokus.length) { showToast('Velg minst ett fokusomr\u00e5de'); return; }
  var erRediger = !!redigerOktId;
  var okt = {
    id: redigerOktId||undefined, type: 'range',
    dato: document.getElementById('rg-dato').value,
    tid: parseInt(document.getElementById('rg-tid').value)||0,
    baller: parseInt(document.getElementById('rg-baller').value)||0,
    fokus: valgteFokus.slice(), feeling: selectedFeeling,
    notat: document.getElementById('rg-notat').value, synlighet: 'privat'
  };
  lagreOkt(okt).then(function(res) {
    if (!res) return;
    hentMineOkter().then(function(data){mineOkter=data;});
    ['rg-tid','rg-baller','rg-notat'].forEach(function(id){document.getElementById(id).value='';});
    valgteFokus = [];
    document.querySelectorAll('.fokus-btn').forEach(function(b){b.classList.remove('active');});
    setFeeling(3); redigerOktId = null;
    showToast(erRediger?'\u00d8kt oppdatert! \uD83C\uDFAF':'Trenings\u00f8kt lagret! \uD83C\uDFAF');
    showTab('dagbok');
  });
}

function saveNotat() {
  var erRediger = !!redigerOktId;
  var okt = {
    id: redigerOktId||undefined, type: 'notat',
    dato: document.getElementById('n-dato').value,
    tittel: document.getElementById('n-tittel').value||'Notat',
    notat: document.getElementById('n-tekst').value, synlighet: 'privat'
  };
  lagreOkt(okt).then(function(res) {
    if (!res) return;
    hentMineOkter().then(function(data){mineOkter=data;});
    ['n-tittel','n-tekst'].forEach(function(id){document.getElementById(id).value='';});
    redigerOktId = null;
    showToast(erRediger?'Notat oppdatert! \uD83D\uDCDD':'Notat lagret! \uD83D\uDCDD');
    showTab('dagbok');
  });
}

// ---- TOAST ----
var toastTimeout = null;
function showToast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function(){el.classList.add('hidden');}, 3000);
}

var lastTouch = 0;
document.addEventListener('touchend', function(e) {
  var now = Date.now();
  if (now - lastTouch < 300) e.preventDefault();
  lastTouch = now;
}, { passive: false });
