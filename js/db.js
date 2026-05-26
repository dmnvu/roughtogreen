// RTG v4 – DATABASE
var _sb = null;
var currentUser = null;
var currentProfil = null;
var INVITASJONSKODE = 'RTG2025';

function initDB() {
  _sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storageKey: 'rtg-auth',
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Ping for å vekke Supabase
  _sb.from('profiler').select('bruker_id').limit(1).then(function() {});

  _sb.auth.onAuthStateChange(function(event, session) {
    if (event === 'SIGNED_IN' && session && session.user) {
      currentUser = session.user;
      if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      lastProfil();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null; currentProfil = null;
      visInnlogging();
    }
  });

  _sb.auth.getSession().then(function(result) {
    if (result.data && result.data.session && result.data.session.user) {
      currentUser = result.data.session.user;
      lastProfil();
    } else {
      visInnlogging();
    }
  });
}

function loggInnGoogle() {
  _sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

function loggUt() {
  _sb.auth.signOut().then(function() { visInnlogging(); });
}

function lastProfil() {
  _sb.from('profiler').select('*').eq('bruker_id', currentUser.id).single().then(function(result) {
    if (result.data) {
      currentProfil = result.data;
      // Vis splash med "Gå til RTG"-knapp – ikke gå inn automatisk
      if (typeof visSplash === 'function') visSplash(true);
      else visApp();
    } else {
      visOppsett();
    }
  });
}

function fullforOppsett() {
  var navn = document.getElementById('setup-navn').value.trim();
  var hcp = parseFloat(document.getElementById('setup-hcp').value);
  var kode = document.getElementById('setup-kode').value.trim().toUpperCase();
  if (!navn) { showToast('Skriv inn et kallenavn'); return; }
  if (isNaN(hcp)) { showToast('Skriv inn handicap'); return; }
  if (kode !== INVITASJONSKODE) { showToast('Feil invitasjonskode'); return; }
  var profil = { bruker_id: currentUser.id, email: currentUser.email, navn: navn, hcp: hcp, opprettet: new Date().toISOString() };
  _sb.from('profiler').upsert(profil).then(function(result) {
    if (result.error) { showToast('Kunne ikke lagre profil'); return; }
    currentProfil = profil;
    lagreHCPHistorikk(hcp);
    visApp();
  });
}

function oppdaterProfil(felt, verdi) {
  var oppdatering = {};
  oppdatering[felt] = verdi;
  _sb.from('profiler').update(oppdatering).eq('bruker_id', currentUser.id).then(function(result) {
    if (!result.error) {
      currentProfil[felt] = verdi;
      if (felt === 'hcp') {
        document.getElementById('hcp-display').textContent = parseFloat(verdi).toFixed(1).replace('.', ',');
        lagreHCPHistorikk(verdi);
      }
    }
  });
}

function lagreOkt(okt, forsok) {
  okt.id = okt.id || Date.now().toString();
  okt.bruker_id = currentUser.id;
  okt.bruker_navn = currentProfil.navn;
  okt.opprettet = new Date().toISOString();
  forsok = forsok || 1;
  return _sb.from('okter').upsert(okt).then(function(result) {
    if (result.error) {
      if (forsok < 3) {
        showToast('Prøver igjen... (' + forsok + '/3)');
        return new Promise(function(resolve) {
          setTimeout(function() { resolve(lagreOkt(okt, forsok + 1)); }, 2000);
        });
      }
      showToast('Lagring feilet etter 3 forsøk');
      return null;
    }
    return okt;
  });
}

function slettOkt(id) {
  return _sb.from('okter').delete().eq('id', id).then(function(result) {
    if (result.error) { showToast('Kunne ikke slette'); return false; }
    return true;
  });
}

function hentMineOkter() {
  return _sb.from('okter').select('*').eq('bruker_id', currentUser.id)
    .order('dato', { ascending: false }).then(function(result) {
      return result.error ? [] : (result.data || []);
    });
}

function hentAlleProfilHCP() {
  return _sb.from('profiler').select('navn, hcp, hcp_mal, bruker_id')
    .order('hcp', { ascending: true }).then(function(result) { return result.data || []; });
}

function lagreHCPHistorikk(hcp) {
  var dato = new Date().toISOString().split('T')[0];
  _sb.from('hcp_historikk').upsert({ id: currentUser.id + '_' + dato, bruker_id: currentUser.id, hcp: hcp, dato: dato });
}

function hentHCPHistorikk() {
  return _sb.from('hcp_historikk').select('*').eq('bruker_id', currentUser.id)
    .order('dato', { ascending: true }).then(function(result) { return result.data || []; });
}

function hentBanerekorder() {
  return _sb.from('okter').select('*').eq('bruker_id', currentUser.id).eq('type', 'runde')
    .order('diff', { ascending: true }).then(function(result) {
      if (!result.data) return {};
      var rekorder = {};
      result.data.forEach(function(okt) {
        if (!rekorder[okt.bane] || okt.diff < rekorder[okt.bane].diff) rekorder[okt.bane] = okt;
      });
      return rekorder;
    });
}
