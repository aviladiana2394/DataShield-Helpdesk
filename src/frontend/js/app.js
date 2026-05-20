// app.js - DataShield Frontend (con visualización de detalles)
const API_URL = 'http://localhost:3000';
const API_URL = 'https://datashield-backend.onrender.com'; 

// ==================== DECODIFICAR TOKEN ====================
function getRoleFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.rol;
    } catch (e) {
        return null;
    }
}

// Mostrar/ocultar botón de panel admin según rol
function checkAdminAccess() {
    const token = localStorage.getItem('token');
    const adminBtn = document.getElementById('admin-panel-btn');
    if (!adminBtn) return;
    if (!token) {
        adminBtn.style.display = 'none';
        return;
    }
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.rol === 'admin' || payload.rol === 'tecnico') {
            adminBtn.style.display = 'inline-block';
        } else {
            adminBtn.style.display = 'none';
        }
    } catch(e) {
        adminBtn.style.display = 'none';
    }
}

// Elementos de autenticación
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register-btn');
const backToLoginBtn = document.getElementById('back-to-login-btn');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');

// Elementos de tickets
const ticketsSection = document.getElementById('tickets-section');
const logoutBtn = document.getElementById('logout-btn');
const ticketsList = document.getElementById('tickets-list');

// Elementos del formulario de tickets
const createBtn = document.getElementById('create-ticket-btn');
const createMessage = document.getElementById('create-message');
const tituloInput = document.getElementById('titulo');
const descripcionInput = document.getElementById('descripcion');
const categoriaSelect = document.getElementById('categoria');
const prioridadSelect = document.getElementById('prioridad');

// Función para mostrar mensajes
function showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.classList.remove('success', 'error');
    element.classList.add(type);
    setTimeout(() => {
        if (element.classList.contains(type)) {
            element.textContent = '';
            element.classList.remove(type);
        }
    }, 3000);
}

// Mostrar formulario de registro
showRegisterBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

// Volver al login
backToLoginBtn.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    registerMessage.textContent = '';
    loginMessage.textContent = '';
});

// REGISTRO
registerBtn.addEventListener('click', async () => {
    const nombre = document.getElementById('register-nombre').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const rol = document.getElementById('register-rol').value;

    if (!nombre || nombre.length < 3) {
        showMessage(registerMessage, 'El nombre debe tener al menos 3 caracteres', 'error');
        return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showMessage(registerMessage, 'Correo electrónico inválido', 'error');
        return;
    }
    if (!password || password.length < 6) {
        showMessage(registerMessage, 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    registerMessage.textContent = 'Registrando...';
    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, rol })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en registro');
        showMessage(registerMessage, 'Registro exitoso. Ahora inicia sesión.', 'success');
        setTimeout(() => {
            backToLoginBtn.click();
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = '';
        }, 1500);
    } catch (error) {
        showMessage(registerMessage, error.message, 'error');
    }
});

// LOGIN
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
        showMessage(loginMessage, 'Completa todos los campos', 'error');
        return;
    }
    loginMessage.textContent = 'Cargando...';
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en login');
        localStorage.setItem('token', data.token);
        showMessage(loginMessage, 'Login exitoso', 'success');
        authSection.style.display = 'none';
        ticketsSection.style.display = 'block';
        checkAdminAccess();
        fetchTickets(data.token);
    } catch (error) {
        showMessage(loginMessage, error.message, 'error');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    ticketsSection.style.display = 'none';
    authSection.style.display = 'block';
    ticketsList.innerHTML = '';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-nombre').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    if (createMessage) createMessage.textContent = '';
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginMessage.textContent = '';
    registerMessage.textContent = '';
});

// Persistencia de sesión
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        authSection.style.display = 'none';
        ticketsSection.style.display = 'block';
        checkAdminAccess();
        fetchTickets(token);
    } else {
        authSection.style.display = 'block';
        ticketsSection.style.display = 'none';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
});

// ==================== MODAL DE DETALLES (SOLO VISUALIZACIÓN) ====================
function mostrarDetallesTicket(ticket) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Detalles del Ticket #${ticket.id_ticket}</h3>
            <div class="detalle-campo">
                <strong>Título:</strong> ${escapeHtml(ticket.titulo)}
            </div>
            <div class="detalle-campo">
                <strong>Descripción:</strong><br>
                ${escapeHtml(ticket.descripcion)}
            </div>
            <div class="detalle-campo">
                <strong>Estado:</strong> 
                <span class="estado-badge estado-${ticket.estado}">${ticket.estado}</span>
            </div>
            <div class="detalle-campo">
                <strong>Prioridad:</strong> 
                <span class="prioridad-badge prioridad-${ticket.prioridad}">${ticket.prioridad}</span>
            </div>
            <div class="detalle-campo">
                <strong>Categoría:</strong> ${ticket.categoria || 'No especificada'}
            </div>
            <div class="detalle-campo">
                <strong>Creado por:</strong> ${ticket.creador_nombre || ticket.usuario_id}
            </div>
            <div class="detalle-campo">
                <strong>Fecha de creación:</strong> ${new Date(ticket.fecha_creacion).toLocaleString()}
            </div>
            <div class="detalle-campo">
                <strong>Última actualización:</strong> ${new Date(ticket.fecha_actualizacion).toLocaleString()}
            </div>
            <button id="cerrar-modal" class="btn-cerrar-modal">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    modal.querySelector('.close').onclick = () => modal.remove();
    modal.querySelector('#cerrar-modal').onclick = () => modal.remove();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== RENDERIZADO DE TICKETS CON BOTÓN "VER DETALLES" ====================
function renderTickets(tickets) {
    if (!tickets.length) {
        ticketsList.innerHTML = '<p>No hay tickets disponibles.</p>';
        return;
    }

    const ul = document.createElement('ul');
    tickets.forEach(ticket => {
        const li = document.createElement('li');
        const estadoClass = `estado-${ticket.estado.replace('_', '-')}`;
        li.className = estadoClass;
        li.innerHTML = `
            <strong>#${ticket.id_ticket}</strong> - ${ticket.titulo} (${ticket.estado})<br>
            <small>Creado por: ${ticket.creador_nombre || ticket.usuario_id} | 
            Prioridad: ${ticket.prioridad} | Categoría: ${ticket.categoria}<br>
            Fecha: ${new Date(ticket.fecha_creacion).toLocaleString()}</small>
        `;
        
        // Botón para ver detalles
        const detalleBtn = document.createElement('button');
        detalleBtn.textContent = 'Ver detalles';
        detalleBtn.className = 'detalle-btn';
        detalleBtn.style.marginTop = '8px';
        detalleBtn.style.width = 'auto';
        detalleBtn.style.padding = '6px 12px';
        detalleBtn.style.backgroundColor = '#17a2b8';
        detalleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarDetallesTicket(ticket);
        });
        li.appendChild(detalleBtn);
        
        ul.appendChild(li);
    });
    ticketsList.innerHTML = '';
    ticketsList.appendChild(ul);
}

// Obtener y mostrar tickets (con manejo de 401)
async function fetchTickets(token) {
    ticketsList.innerHTML = '<div class="spinner"></div>';
    try {
        const response = await fetch(`${API_URL}/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            alert('Sesión expirada. Vuelve a iniciar sesión.');
            ticketsSection.style.display = 'none';
            authSection.style.display = 'block';
            return;
        }
        if (!response.ok) throw new Error('Error al obtener tickets');
        const data = await response.json();
        if (data.success) {
            renderTickets(data.data);
        } else {
            ticketsList.innerHTML = 'Error: ' + data.message;
        }
    } catch (error) {
        ticketsList.innerHTML = 'Error al cargar tickets: ' + error.message;
    }
}

// Crear ticket
if (createBtn) {
    createBtn.addEventListener('click', async () => {
        const titulo = tituloInput.value.trim();
        const descripcion = descripcionInput.value.trim();
        if (titulo.length < 5) {
            showMessage(createMessage, 'El título debe tener al menos 5 caracteres', 'error');
            return;
        }
        if (descripcion.length < 10) {
            showMessage(createMessage, 'La descripción debe tener al menos 10 caracteres', 'error');
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            showMessage(createMessage, 'No estás autenticado. Inicia sesión.', 'error');
            return;
        }
        createMessage.textContent = 'Enviando...';
        try {
            const response = await fetch(`${API_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    titulo,
                    descripcion,
                    categoria: categoriaSelect.value,
                    prioridad: prioridadSelect.value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al crear ticket');
            showMessage(createMessage, 'Ticket creado con éxito', 'success');
            tituloInput.value = '';
            descripcionInput.value = '';
            fetchTickets(token);
        } catch (error) {
            showMessage(createMessage, error.message, 'error');
        }
    });
}