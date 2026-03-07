import { initializeApp as _iA } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase as _gD, ref as _r, update as _u, onValue as _oV, push as _p, query as _q, limitToLast as _lL, get as _g, child as _c, serverTimestamp as _sT } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const _cfg = { apiKey: "AIzaSyC8ZPiMupLCq9dQ4sKbpVKpoPl_WTFpkRk", authDomain: "violentometro-web.firebaseapp.com", projectId: "violentometro-web", storageBucket: "violentometro-web.firebasestorage.app", messagingSenderId: "475117870090", appId: "1:475117870090:web:b5d76edb4d7655f58893f3", measurementId: "G-NHTG5VCSHB" };
const _app = _iA(_cfg), _db = _gD(_app);
const $ = (id) => document.getElementById(id);
const [e_l, e_d, i_u, i_p, b_l, b_o, t_u, c_u, c_t, b_h, c_h, l_h] = ['login-screen', 'dashboard-screen', 'username-input', 'pin-input', 'login-btn', 'logout-btn', 'user-display', 'users-list', 'toast-container', 'history-btn', 'history-container', 'history-list'].map($);
let _uid = null, _un = null, _prev = 0;

async function _init(_n, _p) {
    const _id = _n.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (_id.length < 3) return alert("Nombre muy corto");
    if (_p.length < 4) return alert("PIN de 4 dígitos");
    try {
        const _s = await _g(_c(_r(_db), `users/${_id}`));
        if (_s.exists()) {
            const _v = _s.val();
            if (_v.pin && _v.pin !== _p) return alert("⛔ PIN INCORRECTO.");
            _access(_id, _n, _p, _v.score || 0);
        } else if (confirm(`¿Crear usuario "${_n}"?`)) _access(_id, _n, _p, 0);
    } catch (e) { console.error(e); alert("Error de conexión."); }
}

function _access(id, n, p, s) {
    _uid = id; _un = n;
    ['v_uid', 'v_name', 'v_pin'].forEach((k, i) => localStorage.setItem(k, [id, n, p][i]));
    const up = {}; const k1 = `/users/${id}`, k2 = `/public_scores/${id}`;
    up[`${k1}/name`] = n; up[`${k1}/pin`] = p; up[`${k1}/score`] = s;
    up[`${k2}/name`] = n; up[`${k2}/score`] = s;
    _u(_r(_db), up).then(() => _core()).catch(() => _core());
}

function _core() {
    e_l.classList.add('hidden'); e_d.classList.remove('hidden'); t_u.textContent = `Soy: ${_un}`;
    _oV(_r(_db, 'public_scores'), s => {
        c_u.innerHTML = ''; const d = s.val();
        if (d) Object.keys(d).forEach(k => _draw(k, d[k]));
    });
    _oV(_q(_r(_db, 'logs'), _lL(10)), s => {
        l_h.innerHTML = ''; const d = s.val();
        if (d) Object.values(d).reverse().forEach(l => {
            const el = document.createElement('li');
            el.style = "border-bottom:1px solid #333;padding:5px 0";
            el.innerHTML = `<span style="color:#4cd137">${l.victim}</span> reportó a <span style="color:#ff4757">${l.attacker}</span>`;
            l_h.appendChild(el);
        });
    });
}

function _draw(id, u) {
    const el = document.createElement('div'), isMe = id === _uid, sc = u.score || 0;
    el.className = 'user-card'; el.style = "background:#333;padding:15px;border-radius:8px;text-align:center;border:1px solid #444;margin:10px;";
    if (isMe) {
        el.style.borderColor = "#4cd137";
        if (sc > _prev && _prev !== 0) { _toast(`¡Alerta! Te han reportado.`); if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]); }
        _prev = sc;
    }
    el.innerHTML = `<h3 style="margin:0 0 10px 0;color:${isMe ? '#4cd137' : 'white'}">${u.name} ${isMe ? '(Tú)' : ''}</h3><div style="font-size:2rem;font-weight:bold;margin-bottom:10px;">${sc}</div>${!isMe ? `<button class="attack-btn" data-x="${id}" data-y="${u.name}" data-z="${sc}">Reportar Violencia</button>` : ''}`;
    c_u.appendChild(el);
}

c_u.addEventListener('click', (e) => {
    if (e.target.classList.contains('attack-btn')) {
        const { x: tid, y: tnm, z: tsc } = e.target.dataset;
        const nS = parseInt(tsc) + 1, up = {}, ts = _sT();
        [`/users/${tid}`, `/public_scores/${tid}`].forEach(p => { up[`${p}/score`] = nS; up[`${p}/lastActive`] = ts; up[`${p}/name`] = tnm; });
        _u(_r(_db), up).then(() => _p(_r(_db, 'logs'), { attacker: tnm, victim: _un, timestamp: ts })).catch(() => _toast("⏳ Espera 5 segundos o verifica permisos."));
    }
});

b_h.addEventListener('click', () => { c_h.classList.toggle('hidden'); b_h.textContent = c_h.classList.contains('hidden') ? "📜 Historial" : "Ocultar Historial"; });
function _toast(m) {
    const t = document.createElement('div'); t.textContent = m; t.style = "background:#e74c3c;color:white;padding:10px 20px;border-radius:5px;margin-top:10px;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:1000;";
    c_t.appendChild(t); setTimeout(() => t.remove(), 3000);
}
b_o.addEventListener('click', () => { localStorage.clear(); location.reload(); });
b_l.addEventListener('click', () => { const n = i_u.value.trim(), p = i_p.value.trim(); (n && p) ? _init(n, p) : alert("Ingresa nombre y PIN"); });
window.addEventListener('DOMContentLoaded', () => {
    const [id, nm, pn] = ['v_uid', 'v_name', 'v_pin'].map(k => localStorage.getItem(k));
    if (id && nm && pn) { _uid = id; _un = nm; _core(); }
});
