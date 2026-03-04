// --- IMPORTACIONES ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// Agregamos 'push', 'query', 'limitToLast' para manejar el historial
import { getDatabase, ref, update, onValue, push, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- TU CONFIGURACIÓN
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
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const usersListContainer = document.getElementById('users-list');
const toastContainer = document.getElementById('toast-container');

// NUEVAS REFERENCIAS PARA HISTORIAL
const historyBtn = document.getElementById('history-btn');
const historyContainer = document.getElementById('history-container');
const historyList = document.getElementById('history-list');

// Estado local
let currentUserId = localStorage.getItem('violentometro_uid');
let currentUserName = localStorage.getItem('violentometro_name');
let myPreviousScore = 0; 

// --- FUNCIONES PRINCIPALES ---

function registerUser(name) {
    const userId = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (userId.length < 3) {
        alert("Nombre muy corto.");
        return;
    }

    currentUserId = userId;
    currentUserName = name;
    
    localStorage.setItem('violentometro_uid', userId);
    localStorage.setItem('violentometro_name', name);

    const userRef = ref(db, 'users/' + userId);
    update(userRef, {
        name: name,
        lastActive: Date.now()
    })
    .then(() => {
        initDashboard();
    });
}

function initDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    userDisplay.textContent = `Soy: ${currentUserName}`;

    // 1. ESCUCHAR USUARIOS
    const allUsersRef = ref(db, 'users');
    onValue(allUsersRef, (snapshot) => {
        usersListContainer.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach((key) => {
                renderUserCard(key, data[key]);
            });
        }
    });

    // 2. ESCUCHAR HISTORIAL (Solo los últimos 50 eventos)
    const logsRef = query(ref(db, 'logs'), limitToLast(50));
    onValue(logsRef, (snapshot) => {
        historyList.innerHTML = ''; // Limpiar lista visual
        const data = snapshot.val();
        
        if (data) {
            // Firebase devuelve objetos, los convertimos a array para ordenar
            const logs = Object.values(data).reverse(); 
            
            logs.forEach(log => {
                const li = document.createElement('li');
                li.style.borderBottom = "1px solid #333";
                li.style.padding = "5px 0";
                // Formato: "tal le sumó a Invitado"
                li.innerHTML = `<span style="color:#4cd137">${log.attacker}</span> acusó a <span style="color:#ff4757">${log.victim}</span> <small style="color:#666">(${new Date(log.timestamp).toLocaleTimeString()})</small>`;
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
    
    // Alerta y Vibración
    if (isMe) {
        card.style.borderColor = "#4cd137";
        if (user.score > myPreviousScore && myPreviousScore !== 0) {
            showToast(`¡Alerta! Te han sumado un punto.`);
            // --- VIBRACIÓN AQUÍ ---
            if ("vibrate" in navigator) {
                navigator.vibrate([200, 100, 200]); // Vibra: 200ms, pausa, 200ms
            }
        }
        myPreviousScore = user.score || 0; 
    }

    const score = user.score || 0;

    // AÑADIDO: data-name en el botón para saber a quién se acusó
    card.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: ${isMe ? '#4cd137' : 'white'}">${user.name} ${isMe ? '(Tú)' : ''}</h3>
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 10px;">${score}</div>
        ${!isMe ? `<button class="attack-btn" data-uid="${userId}" data-name="${user.name}" data-score="${score}">+1 Violencia</button>` : ''}
    `;

    usersListContainer.appendChild(card);
}

// --- EVENTOS ---

// 1.REGISTRO DE HISTORIAL
usersListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('attack-btn')) {
        const targetId = e.target.dataset.uid;
        const targetName = e.target.dataset.name; // Obtenemos el nombre
        const currentScore = parseInt(e.target.dataset.score);
        
        // A) Actualizar puntaje
        update(ref(db, 'users/' + targetId), {
            score: currentScore + 1
        });

        // B) Guardar en Historial (Logs)
        push(ref(db, 'logs'), {
            attacker: currentUserName,
            victim: targetName,
            timestamp: Date.now()
        });
    }
});

// 2. MOSTRAR / OCULTAR HISTORIAL
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

loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) registerUser(name);
});

if (currentUserId && currentUserName) {
    registerUser(currentUserName);
}





