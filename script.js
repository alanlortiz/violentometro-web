// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8ZPiMupLCq9dQ4sKbpVKpoPl_WTFpkRk",
  authDomain: "violentometro-web.firebaseapp.com",
  projectId: "violentometro-web",
  storageBucket: "violentometro-web.firebasestorage.app",
  messagingSenderId: "475117870090",
  appId: "1:475117870090:web:b5d76edb4d7655f58893f3",
  measurementId: "G-NHTG5VCSHB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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
let myPreviousScore = 0; // Para saber si me sumaron puntos

// --- FUNCIONES PRINCIPALES ---

function registerUser(name) {
    // Si no tenemos ID, creamos uno único basado en la fecha y un random
    if (!currentUserId) {
        currentUserId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('violentometro_uid', currentUserId);
    }
    
    currentUserName = name;
    localStorage.setItem('violentometro_name', name);

    // Guardar en Firebase
    const userRef = ref(db, 'users/' + currentUserId);
    
    // update: actualiza o crea si no existe. Mantenemos el score si ya existía.
    update(userRef, {
        name: name,
        lastActive: Date.now(),
        // Nota: No sobrescribimos el score aquí para no reiniciarlo a 0 si recarga
    });

    // Configurar desconexión (opcional: borrar usuario al salir? Por ahora lo dejamos persistente)
    // onDisconnect(userRef).remove(); 

    initDashboard();
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
        }
    });
}

// Dibujar la tarjeta de cada usuario
function renderUserCard(userId, user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.style = "background: #333; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #444;";

    // Verificar si soy yo o es otro
    const isMe = userId === currentUserId;
    
    // Lógica para detectar si me atacaron
    if (isMe) {
        card.style.borderColor = "#4cd137"; // Borde verde para mí
        if (user.score > myPreviousScore && myPreviousScore !== 0) {
            showToast(`¡Alerta! Te han sumado un punto.`);
        }
        myPreviousScore = user.score || 0; // Actualizar referencia
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

// Detectar clics en botones de ataque (Delegación de eventos)
usersListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('attack-btn')) {
        const targetId = e.target.dataset.uid;
        const currentScore = parseInt(e.target.dataset.score);
        
        // Enviar actualización a Firebase
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
    toast.style = "background: #e74c3c; color: white; padding: 10px 20px; border-radius: 5px; margin-top: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); animation: fadein 0.5s, fadeout 0.5s 2.5s;";
    toastContainer.appendChild(toast);

    // Eliminar después de 3 segundos
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Botón Salir
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// --- MODIFICACIÓN PARA DETECTAR ERRORES ---

loginBtn.addEventListener('click', async () => {
    const name = usernameInput.value.trim();
    
    if (!name) {
        alert("¡Escribe un nombre primero!");
        return;
    }

    try {
        alert("1. Intentando conectar... (Si no pasa de aquí, es tu Internet o la API Key)");
        
        // Intentamos escribir en Firebase para probar la conexión
        const testRef = ref(db, '.info/connected');
        
        onValue(testRef, (snap) => {
            if (snap.val() === true) {
                alert("2. ¡Conexión exitosa con Firebase!");
                // Si llegamos aquí, procedemos a registrar
                registerUser(name);
            } else {
                console.log("Aun no conecta...");
            }
        }, { onlyOnce: true });

        // Forzamos el registro directo para ver si hay error de permisos
        registerUser(name);

    } catch (error) {
        alert("ERROR FATAL: " + error.message);
        console.error(error);
    }
});

// Auto-login al cargar
if (currentUserId && currentUserName) {
    registerUser(currentUserName);

}
