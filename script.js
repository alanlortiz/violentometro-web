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
const pinInput = document.getElementById('pin-input');
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

// --- 1. LÓGICA DE LOGIN Y SEGURIDAD ---

async function handleLogin(name, pin) {
    // Validaciones
    const userId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (userId.length < 3) {
        alert("El nombre debe tener al menos 3 letras.");
        return;
    }
    if (pin.length < 4) {
        alert("El PIN debe ser de 4 dígitos.");
        return;
    }

    // Verificar en BD
    const dbRef = ref(db);
    try {
        const snapshot = await get(child(dbRef, `users/${userId}`));
        
        if (snapshot.exists()) {
            // Usuario existe: Verificar PIN
            const userData = snapshot.val();
            if (userData.pin && userData.pin !== pin) {
                alert("⛔ PIN INCORRECTO. Si no eres " + name + ", usa otro nombre.");
                return;
            }
            loginUser(userId, name, pin);
        } else {
            // Usuario nuevo: Crear
            if(confirm(`¿Crear usuario "${name}" con este PIN?`)) {
                loginUser(userId, name, pin);
            }
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión.");
    }
}

function loginUser(userId, name, pin) {
    currentUserId = userId;
    currentUserName = name;
    
    // Guardar sesión local
    localStorage.setItem('v_uid', userId);
    localStorage.setItem('v_name', name);
    localStorage.setItem('v_pin', pin);

    // Guardar en Firebase
    const userRef = ref(db, 'users/' + userId);
    update(userRef, {
        name: name,
        pin: pin,
        lastActive: Date.now()
    }).then(() => {
        initDashboard();
    });
}

// --- 2. LÓGICA DEL DASHBOARD ---

function initDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    userDisplay.textContent = `Soy: ${currentUserName}`;

    // A) Escuchar lista de usuarios
    onValue(ref(db, 'users'), (snapshot) => {
        usersListContainer.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach((key) => {
                renderUserCard(key, data[key]);
            });
        }
    });

    // B) Escuchar Historial (Logs)
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
                
                // FORMATO: [Víctima Verde] reportó a [Agresor Rojo]
                li.innerHTML = `<span style="color:#4cd137">${log.victim}</span> reportó a <span style="color:#ff4757">${log.attacker}</span>`;
                
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
            showToast(`¡Alerta! Te han reportado.`);
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        }
        myPreviousScore = user.score || 0; 
    }

    const score = user.score || 0;

    
    card.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: ${isMe ? '#4cd137' : 'white'}">${user.name} ${isMe ? '(Tú)' : ''}</h3>
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 10px;">${score}</div>
        ${!isMe ? `<button class="attack-btn" data-uid="${userId}" data-name="${user.name}" data-score="${score}">Reportar Violencia</button>` : ''}
    `;
    usersListContainer.appendChild(card);
}

// --- 3. EVENTOS ---

usersListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('attack-btn')) {
        const targetId = e.target.dataset.uid;
        const targetName = e.target.dataset.name; 
        const currentScore = parseInt(e.target.dataset.score);
        
        // 1. Sumamos punto al usuario de la tarjeta 
        update(ref(db, 'users/' + targetId), { score: currentScore + 1 });

        // 2. Guardamos en el historial
        push(ref(db, 'logs'), {
            attacker: targetName,      
            victim: currentUserName,   
            timestamp: Date.now()
        });
    }
});

// Botón Historial
historyBtn.addEventListener('click', () => {
    if (historyContainer.classList.contains('hidden')) {
        historyContainer.classList.remove('hidden');
        historyBtn.textContent = "Ocultar Historial";
    } else {
        historyContainer.classList.add('hidden');
        historyBtn.textContent = "📜 Historial";
    }
});

// Notificación Flotante
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style = "background: #e74c3c; color: white; padding: 10px 20px; border-radius: 5px; margin-top: 10px; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;";
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Botón Salir
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// Botón Ingresar
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    if (name && pin) {
        handleLogin(name, pin);
    } else {
        alert("Ingresa nombre y PIN");
    }
});

// Auto-login al cargar
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
