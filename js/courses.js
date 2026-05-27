// RTG v4 – BANER OG SCORECARD

var FASTE_BANER = [
  {
    id: 'bleik',
    navn: 'Bleik Golfstrømsbane',
    sted: 'Bleik, Andøy, Nordland',
    lat: 69.2833, lon: 15.9167,
    hull: 9,
    tees: [
      { id: 'gul', navn: 'Gul', nr: 24, farge: '#d4a843', par: [3,3,4,5,4,4,4,5,3] },
      { id: 'rod', navn: 'Rød', nr: 21, farge: '#c0392b', par: [3,3,4,5,4,4,4,5,3] }
    ],
    fast: true
  },
  {
    id: 'bodo_golfpark',
    navn: 'Bodø Golfpark',
    sted: 'Bodø, Nordland',
    lat: 67.2804, lon: 14.4047,
    hull: 18,
    tees: [
      { id: 'gul', navn: 'Gul', nr: 54, farge: '#d4a843', par: [3,4,4,5,4,3,4,3,3,4,4,5,3,3,4,5,5,4] },
      { id: 'rod', navn: 'Rød', nr: 46, farge: '#c0392b', par: [3,4,4,5,4,3,4,3,3,4,4,5,3,3,4,5,5,4] }
    ],
    fast: true
  },
  {
    id: 'bodo_tverrlandet',
    navn: 'Bodø Golfklubb Tverrlandet',
    sted: 'Bodø, Nordland',
    lat: 67.3000, lon: 14.5500,
    hull: 9,
    tees: [
      { id: 'gul', navn: 'Gul', nr: 54, farge: '#d4a843', par: [4,4,3,5,3,4,5,4,4] },
      { id: 'rod', navn: 'Rød', nr: 43, farge: '#c0392b', par: [4,4,3,5,3,4,5,4,4] }
    ],
    fast: true
  },
  {
    id: 'losby_vestmork',
    navn: 'Losby Vestmork',
    sted: 'Lørenskog, Viken',
    lat: 59.9167, lon: 10.9833,
    hull: 9,
    tees: [
      { id: '44', navn: '44', nr: 44, farge: null, par: [4,3,5,3,4,4,4,5,3] },
      { id: '36', navn: '36', nr: 36, farge: null, par: [4,3,5,3,4,4,4,5,3] },
      { id: '28', navn: '28', nr: 28, farge: null, par: [4,3,5,3,4,4,4,5,3] }
    ],
    fast: true
  },
  {
    id: 'lillestrom',
    navn: 'Lillestrøm Golfklubb',
    sted: 'Lillestrøm, Viken',
    lat: 59.9550, lon: 11.0500,
    hull: 9,
    tees: [
      { id: '28', navn: '28', nr: 28, farge: '#d4a843', par: [4,3,3,3,3,3,3,4,3] },
      { id: '25', navn: '25', nr: 25, farge: '#c0392b', par: [4,3,3,3,3,3,3,4,3] }
    ],
    fast: true
  }
];

var selectedCourse = null;
var selectedTee = null;
var searchTimeout = null;

function searchCourse(query) {
  var dropdown = document.getElementById('search-results');
  if (query.length < 2) { dropdown.innerHTML = ''; dropdown.classList.add('hidden'); return; }
  dropdown.classList.remove('hidden');
  dropdown.innerHTML = '<div class="search-loading">Søker...</div>';
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() {
    var q = query.toLowerCase();
    var lokale = FASTE_BANER.filter(function(b) {
      return b.navn.toLowerCase().includes(q) || b.sted.toLowerCase().includes(q);
    });
    window._searchCache = lokale;
    if (!lokale.length) {
      dropdown.innerHTML =
        '<div class="search-empty">Ingen treff for "' + query + '"</div>' +
        '<div class="search-result-item" onclick="selectManualCourse(\'' + query.replace(/'/g,"\\'") + '\')">' +
        '<div class="sri-name">+ Legg til "' + query + '" manuelt</div>' +
        '<div class="sri-meta">Standard par 4 per hull</div></div>';
      return;
    }
    dropdown.innerHTML = lokale.map(function(b) {
      var parTotalt = b.tees[0].par.reduce(function(a,c){return a+c;},0);
      return '<div class="search-result-item" onclick="selectCourseById(\'' + b.id + '\')">' +
        '<div class="sri-name">' + b.navn + ' \u2605</div>' +
        '<div class="sri-meta">' + b.sted + ' \u00b7 ' + b.hull + ' hull \u00b7 Par ' + parTotalt + '</div></div>';
    }).join('');
  }, 300);
}

function selectCourseById(id) {
  var bane = (window._searchCache||[]).find(function(b){return b.id===id;})
    || FASTE_BANER.find(function(b){return b.id===id;});
  if (!bane) return;
  _applyCourse(bane, null);
}

function _applyCourse(bane, eksisterendeScores) {
  selectedCourse = bane;
  selectedTee = bane.tees[0];
  document.getElementById('bane-search').value = '';
  var dd = document.getElementById('search-results');
  dd.innerHTML = ''; dd.classList.add('hidden');
  document.getElementById('sc-name').textContent = bane.navn;
  document.getElementById('sc-meta').textContent = bane.sted + ' \u00b7 ' + bane.hull + ' hull';
  document.getElementById('selected-course').classList.remove('hidden');
  document.getElementById('scorecard-section').classList.remove('hidden');
  _buildTeeButtons();
  var wrap = document.getElementById('toggle-2x9-wrap');
  if (wrap) {
    wrap.style.display = (bane.hull === 9) ? 'block' : 'none';
    var cb = document.getElementById('toggle-2x9');
    if (cb) cb.checked = false;
  }
  buildScorecard(bane, selectedTee, eksisterendeScores);
}

function _buildTeeButtons() {
  var teeWrap = document.getElementById('tee-valg');
  if (!teeWrap) return;
  teeWrap.innerHTML = '<div class="form-section-label" style="margin-top:12px">Velg tee</div>' +
    '<div class="tee-grid">' +
    selectedCourse.tees.map(function(tee) {
      var prikk = tee.farge ? '<span class="tee-dot" style="background:' + tee.farge + '"></span>' : '';
      var isActive = tee.id === selectedTee.id;
      return '<button class="tee-btn' + (isActive ? ' active' : '') + '" ' +
        'onclick="velgTee(\'' + tee.id + '\')" ' +
        'style="--tee-color:' + (tee.farge || '#2a8a58') + '">' +
        prikk + '<span>' + tee.navn + '</span>' +
        '<span style="font-size:11px;opacity:0.6;margin-left:3px">(' + tee.nr + ')</span>' +
        '</button>';
    }).join('') + '</div>';
  teeWrap.classList.remove('hidden');
}

function velgTee(teeId) {
  if (!selectedCourse) return;
  var nyTee = selectedCourse.tees.find(function(t){return t.id===teeId;});
  if (!nyTee) return;
  selectedTee = nyTee;
  _buildTeeButtons();
  buildScorecard(selectedCourse, selectedTee, null);
}

function changeCourse() {
  selectedCourse = null; selectedTee = null;
  document.getElementById('selected-course').classList.add('hidden');
  document.getElementById('scorecard-section').classList.add('hidden');
  var tw = document.getElementById('tee-valg');
  if (tw) tw.classList.add('hidden');
  document.getElementById('bane-search').value = '';
  document.getElementById('bane-search').focus();
}

function selectManualCourse(navn) {
  _applyCourse({
    id: 'manual-' + Date.now(), navn: navn, sted: 'Manuelt lagt til',
    lat: null, lon: null, hull: 18,
    tees: [{ id: 'standard', navn: 'Standard', nr: null, farge: '#2a8a58', par: Array(18).fill(4) }],
    fast: false
  }, null);
}

function toggle2x9() {
  if (!selectedCourse || !selectedTee) return;
  var is2x9 = document.getElementById('toggle-2x9').checked;
  var baseId = selectedCourse.id.replace('_2x9','');
  var original = FASTE_BANER.find(function(b){return b.id===baseId;});
  if (!original) return;
  if (is2x9) {
    var dobbel = JSON.parse(JSON.stringify(original));
    dobbel.id = original.id + '_2x9';
    dobbel.hull = 18;
    dobbel.tees = original.tees.map(function(t) {
      return { id: t.id, navn: t.navn, nr: t.nr, farge: t.farge, par: t.par.concat(t.par) };
    });
    selectedCourse = dobbel;
    selectedTee = dobbel.tees.find(function(t){return t.id===selectedTee.id;}) || dobbel.tees[0];
  } else {
    selectedCourse = original;
    selectedTee = original.tees.find(function(t){return t.id===selectedTee.id;}) || original.tees[0];
  }
  _buildTeeButtons();
  buildScorecard(selectedCourse, selectedTee, null);
  setTimeout(function() {
    var cb = document.getElementById('toggle-2x9');
    if (cb) cb.checked = is2x9;
  }, 50);
}

function buildScorecard(bane, tee, eksisterendeScores) {
  var container = document.getElementById('sc-rows');
  var totalPar = tee.par.reduce(function(a,c){return a+c;},0);
  document.getElementById('sc-par-total').textContent = totalPar;
  document.getElementById('sc-slag-total').textContent = '\u2013';
  document.getElementById('sc-diff-total').textContent = '\u2013';
  container.innerHTML = tee.par.map(function(par, i) {
    var slag = (eksisterendeScores && eksisterendeScores[i]) ? eksisterendeScores[i] : '';
    return '<div class="sc-row">' +
      '<div>Hull ' + (i+1) + '</div>' +
      '<div>' + par + '</div>' +
      '<div><input type="number" id="sc-slag-' + i + '" min="1" max="20" inputmode="numeric" pattern="[0-9]*" placeholder="\u2013" value="' + slag + '" oninput="updateScorecard()" onchange="updateScorecard()"></div>' +
      '<div><span class="sc-diff" id="sc-diff-' + i + '">\u2013</span></div>' +
      '</div>';
  }).join('');
  if (eksisterendeScores && eksisterendeScores.length) updateScorecard();
}

function updateScorecard() {
  if (!selectedCourse || !selectedTee) return;
  var totalSlag = 0, totalPar = 0;
  selectedTee.par.forEach(function(par, i) {
    var input = document.getElementById('sc-slag-' + i);
    var diffEl = document.getElementById('sc-diff-' + i);
    var val = parseInt(input && input.value);
    totalPar += par;
    if (val > 0) {
      totalSlag += val;
      var diff = val - par;
      diffEl.textContent = diff === 0 ? 'E' : (diff > 0 ? '+' + diff : diff);
      diffEl.className = 'sc-diff ' + (diff < 0 ? 'score-under' : diff > 0 ? 'score-over' : 'score-even');
    } else {
      diffEl.textContent = '\u2013'; diffEl.className = 'sc-diff';
    }
  });
  if (totalSlag > 0) {
    document.getElementById('sc-slag-total').textContent = totalSlag;
    var d = totalSlag - totalPar;
    var el = document.getElementById('sc-diff-total');
    el.textContent = d === 0 ? 'E' : (d > 0 ? '+' + d : d);
    el.className = 'sc-total-diff ' + (d < 0 ? 'score-under' : d > 0 ? 'score-over' : 'score-even');
  } else {
    document.getElementById('sc-slag-total').textContent = '\u2013';
    document.getElementById('sc-diff-total').textContent = '\u2013';
  }
  if (typeof lagreKladd === 'function') lagreKladd();
}

function getScorecardData() {
  if (!selectedCourse || !selectedTee) return null;
  var scores = selectedTee.par.map(function(par, i) {
    var el = document.getElementById('sc-slag-' + i);
    var v = parseInt(el && el.value);
    return isNaN(v) ? null : v;
  });
  var totalSlag = scores.reduce(function(a,c){return a+(c||0);},0);
  var totalPar = selectedTee.par.reduce(function(a,c){return a+c;},0);
  return {
    bane: selectedCourse.navn, baneId: selectedCourse.id,
    sted: selectedCourse.sted, hull: selectedCourse.hull,
    lat: selectedCourse.lat, lon: selectedCourse.lon,
    teeId: selectedTee.id, teeNavn: selectedTee.navn,
    teeNr: selectedTee.nr, teeFarge: selectedTee.farge,
    parArray: selectedTee.par, scores: scores,
    totalPar: totalPar, totalSlag: totalSlag, diff: totalSlag - totalPar
  };
}

async function hentVaer(lat, lon, dato) {
  if (!lat || !lon) return null;
  try {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
      '&longitude=' + lon +
      '&daily=temperature_2m_max,precipitation_sum,windspeed_10m_max' +
      '&start_date=' + dato + '&end_date=' + dato +
      '&timezone=Europe%2FOslo';
    var res = await fetch(url);
    var data = await res.json();
    if (data.daily) {
      return {
        temp: Math.round(data.daily.temperature_2m_max[0]),
        nedbor: data.daily.precipitation_sum[0],
        vind: Math.round(data.daily.windspeed_10m_max[0])
      };
    }
    return null;
  } catch(e) { return null; }
}
