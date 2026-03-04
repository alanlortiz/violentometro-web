// --- IMPORTACIONES  ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, update, onValue, push, query, limitToLast, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- TU CONFIGURACIÓN ---
const firebaseConfig = {
  apiKey: "AIzaSyC8ZPiMupLCq9dQ4sKbpVKpoPl_WTFpkRk",
  authDomain: "violentometro-web.firebaseapp.com",
  projectId: "violentometro-web",
  storageBucket: "violentometro-web.firebasestorage.app",
  messagingSenderId: "475117870090",
  appId: "1:475117870090:web:b5d76edb4d7655f58893f3",
  measurementId: "G-NHTG5VCSHB"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Referencias del DOM
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const usernameInput = document.getElementById('username-input');
const pinInput = document.getElementById('pin-input'); // NUEVO
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const usersListContainer = document.getElementById('users-list');
const toastContainer = document.getElementById('toast-container');
const historyBtn = document.getElementById('history-btn');
const historyContainer = document.getElementById('history-container');
const historyList = document.getElementById('history-list');

// Estado local
let currentUserId = null;
let currentUserName = null;
let myPreviousScore = 0; 

// --- FUNCIONES DE SEGURIDAD ---

async function handleLogin(name, pin) {
    // 1. Validaciones básicas
    const userId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (userId.length < 3) {
        alert("El nombre debe tener al menos 3 letras.");
        return;
    }
    if (pin.length < 4) {
        alert("El PIN debe ser de 4 dígitos.");
        return;
    }

    // 2. Verificar en la Base de Datos si el usuario existe
    const dbRef = ref(db);
    
    try {
        const snapshot = await get(child(dbRef, `users/${userId}`));
        
        if (snapshot.exists()) {
            // A) EL USUARIO YA EXISTE: Verificar PIN
            const userData = snapshot.val();
            
            
            if (userData.pin && userData.pin !== pin) {
                alert("⛔ ERROR: El PIN es incorrecto para este usuario. Si no eres " + name + ", usa otro nombre.");
                return; // DETENER AQUÍ
            }
            
            // PIN Correcto: Proceder
            loginUser(userId, name, pin);
            
        } else {
            // B) USUARIO NUEVO: Registrarlo con el PIN
            if(confirm(`¿Quieres crear el usuario "${name}" con este PIN?`)) {
                loginUser(userId, name, pin);
            }
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al verificar usuario.");
    }
}

function loginUser(userId, name, pin) {
    // Guardar en local
    currentUserId = userId;
    currentUserName = name;
    localStorage.setItem('v_uid', userId);
    localStorage.setItem('v_name', name);
    localStorage.setItem('v_pin', pin); // Guardamos PIN para auto-login futuro

    // Guardar/Actualizar en Firebase (incluyendo el PIN)
    const userRef = ref(db, 'users/' + userId);
    update(userRef, {
        name: name,
        pin: pin, // GUARDAMOS EL SECRETO
        lastActive: Date.now()
    }).then(() => {
        initDashboard();
    });
}

// --- FUNCIONES DEL DASHBOARD ---

function initDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    userDisplay.textContent = `Soy: ${currentUserName}`;

    // Escuchar usuarios
    onValue(ref(db, 'users'), (snapshot) => {
        usersListContainer.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach((key) => {
                renderUserCard(key, data[key]);
            });
        }
    });

    // Escuchar historial
    const logsRef = query(ref(db, 'logs'), limitToLast(10));
    onValue(logsRef, (snapshot) => {
        historyList.innerHTML = ''; 
        const data = snapshot.val();
        if (data) {
            const logs = Object.values(data).reverse(); 
            logs.forEach(log => {
                const li = document.createElement('li');
                li.style.borderBottom = "1px solid #333";
                li.style.padding = "5px 0";
                li.innerHTML = `<span style="color:#ff4757">${log.attacker}</span> atacó a <span style="color:#4cd137">${log.victim}</span>`;
                historyList.appendChild(li);
            });
        }
    });
}

function renderUserCard(userId, user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.style = "background: #333; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #444; margin: 10px;";

    const isMe = userId === currentUserId;
    
    if (isMe) {
        card.style.borderColor = "#4cd137";
        if (user.score > myPreviousScore && myPreviousScore !== 0) {
            showToast(`¡Alerta! Te han sumado un punto.`);
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        }
        myPreviousScore = user.score || 0; 
    }

    const score = user.score || 0;

    card.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: ${isMe ? '#4cd137' : 'white'}">${user.name} ${isMe ? '(Tú)' : ''}</h3>
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 10px;">${score}</div>
        ${!isMe ? `<button class="attack-btn" data-uid="${userId}" data-name="${user.name}" data-score="${score}">+1 Violencia</button>` : ''}
    `;
    usersListContainer.appendChild(card);
}

// --- EVENTOS ---

usersListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('attack-btn')) {
        const targetId = e.target.dataset.uid;
        const targetName = e.target.dataset.name;
        const currentScore = parseInt(e.target.dataset.score);
        
        update(ref(db, 'users/' + targetId), { score: currentScore + 1 });
        push(ref(db, 'logs'), {
            attacker: currentUserName,
            victim: targetName,
            timestamp: Date.now()
        });
    }
});

historyBtn.addEventListener('click', () => {
    if (historyContainer.classList.contains('hidden')) {
        historyContainer.classList.remove('hidden');
        historyBtn.textContent = "Ocultar Historial";
    } else {
        historyContainer.classList.add('hidden');
        historyBtn.textContent = "📜 Historial";
    }
});

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style = "background: #e74c3c; color: white; padding: 10px 20px; border-radius: 5px; margin-top: 10px; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;";
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// NUEVO: LOGIN CON PIN
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (name && pin) {
        handleLogin(name, pin);
    } else {
        alert("Por favor ingresa nombre y PIN");
    }
});

// Auto-login (Ahora verificamos también el PIN guardado)
window.addEventListener('DOMContentLoaded', () => {
    const savedId = localStorage.getItem('v_uid');
    const savedName = localStorage.getItem('v_name');
    const savedPin = localStorage.getItem('v_pin');

    if (savedId && savedName && savedPin) {
        
        currentUserId = savedId;
        currentUserName = savedName;
        initDashboard();
    }
});
