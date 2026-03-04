// --- IMPORTACIONES CORRECTAS PARA NAVEGADOR ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Tu configuración (La dejé tal cual me la pasaste)
const firebaseConfig = {
  apiKey: "AIzaSyC8ZPiMupLCq9dQ4sKbpVKpoPl_WTFpkRk",
  authDomain: "violentometro-web.firebaseapp.com",
  projectId: "violentometro-web",
  storageBucket: "violentometro-web.firebasestorage.app",
  messagingSenderId: "475117870090",
  appId: "1:475117870090:web:b5d76edb4d7655f58893f3",
  measurementId: "G-NHTG5VCSHB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app); // Necesitamos iniciar la base de datos

// Referencias del DOM
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const usersListContainer = document.getElementById('users-list');
const toastContainer = document.getElementById('toast-container');

// Estado local
let currentUserId = localStorage.getItem('violentometro_uid');
let currentUserName = localStorage.getItem('violentometro_name');
let myPreviousScore = 0; 

// --- FUNCIONES PRINCIPALES ---

function registerUser(name) {
    // Si no tenemos ID, creamos uno único
    if (!currentUserId) {
        currentUserId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('violentometro_uid', currentUserId);
    }
    
    currentUserName = name;
    localStorage.setItem('violentometro_name', name);

    // Guardar en Firebase
    const userRef = ref(db, 'users/' + currentUserId);
    
    // Guardamos nombre y fecha
    update(userRef, {
        name: name,
        lastActive: Date.now()
    })
    .then(() => {
        console.log("Usuario guardado en Firebase");
        initDashboard();
    })
    .catch((error) => {
        alert("Error al guardar usuario: " + error.message);
    });
}

function initDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    userDisplay.textContent = `Soy: ${currentUserName}`;

    // ESCUCHAR CAMBIOS EN TIEMPO REAL
    const allUsersRef = ref(db, 'users');
    onValue(allUsersRef, (snapshot) => {
        usersListContainer.innerHTML = ''; // Limpiar lista
        const data = snapshot.val();

        if (data) {
            Object.keys(data).forEach((key) => {
                const user = data[key];
                renderUserCard(key, user);
            });
        } else {
            usersListContainer.innerHTML = '<p>No hay nadie conectado aún.</p>';
        }
    });
}

// Dibujar la tarjeta de cada usuario
function renderUserCard(userId, user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.style = "background: #333; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #444; margin: 10px;";

    // Verificar si soy yo o es otro
    const isMe = userId === currentUserId;
    
    // Lógica para detectar si me atacaron
    if (isMe) {
        card.style.borderColor = "#4cd137"; // Borde verde para mí
        if (user.score > myPreviousScore && myPreviousScore !== 0) {
            showToast(`¡Alerta! Te han sumado un punto.`);
        }
        myPreviousScore = user.score || 0; 
    }

    const score = user.score || 0;

    card.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: ${isMe ? '#4cd137' : 'white'}">${user.name} ${isMe ? '(Tú)' : ''}</h3>
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 10px;">${score}</div>
        ${!isMe ? `<button class="attack-btn" data-uid="${userId}" data-score="${score}">+1 Violencia</button>` : ''}
    `;

    usersListContainer.appendChild(card);
}

// --- ACCIONES ---

// Detectar clics en botones de ataque
usersListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('attack-btn')) {
        const targetId = e.target.dataset.uid;
        const currentScore = parseInt(e.target.dataset.score);
        
        const targetRef = ref(db, 'users/' + targetId);
        update(targetRef, {
            score: currentScore + 1
        });
    }
});

// Mostrar notificación flotante
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style = "background: #e74c3c; color: white; padding: 10px 20px; border-radius: 5px; margin-top: 10px; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;";
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Botón Salir
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// Botón Ingresar (CON DEBUG)
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    
    if (!name) {
        alert("¡Escribe un nombre primero!");
        return;
    }

    // Intento directo de registro
    registerUser(name);
});

// Auto-login al cargar
if (currentUserId && currentUserName) {
    registerUser(currentUserName);
}

