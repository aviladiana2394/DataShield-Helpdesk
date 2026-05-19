// app.js - DataShield Frontend (con edición de tickets por roles)
const API_URL = 'http://localhost:3000';

// ==================== DECODIFICAR TOKEN ====================
function getRoleFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.rol; // el backend guarda el rol como 'rol'
    } catch (e) {
        return null;
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
        fetchTickets(token);
    } else {
        authSection.style.display = 'block';
        ticketsSection.style.display = 'none';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
});

// ==================== RENDERIZADO DE TICKETS CON BOTÓN EDITAR ====================
function renderTickets(tickets) {
    if (!tickets.length) {
        ticketsList.innerHTML = '<p>No hay tickets disponibles.</p>';
        return;
    }
    const userRole = getRoleFromToken();
    const canEdit = userRole === 'tecnico' || userRole === 'admin';

    const ul = document.createElement('ul');
    tickets.forEach(ticket => {
        const li = document.createElement('li');
        const estadoClass = `estado-${ticket.estado.replace('_', '-')}`;
        li.className = estadoClass;
        li.innerHTML = `
            <strong>#${ticket.id_ticket}</strong> - ${ticket.titulo} (${ticket.estado})<br>
            <small>Creado por: ${ticket.creador_nombre || ticket.usuario_id} | 
            Prioridad: ${ticket.prioridad} | Categoría: ${ticket.categoria}</small>
        `;
        if (canEdit) {
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.className = 'edit-btn';
            editBtn.style.marginTop = '8px';
            editBtn.style.width = 'auto';
            editBtn.style.padding = '6px 12px';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showEditModal(ticket);
            });
            li.appendChild(editBtn);
        }
        ul.appendChild(li);
    });
    ticketsList.innerHTML = '';
    ticketsList.appendChild(ul);
}

// Edicion para tickets (admin y tecnico)
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showEditModal(ticket) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Editar Ticket #${ticket.id_ticket}</h3>
            <label>Título:</label>
            <input type="text" id="edit-titulo" value="${escapeHtml(ticket.titulo)}">
            <label>Descripción:</label>
            <textarea id="edit-descripcion">${escapeHtml(ticket.descripcion)}</textarea>
            <label>Estado:</label>
            <select id="edit-estado">
                <option value="abierto" ${ticket.estado === 'abierto' ? 'selected' : ''}>Abierto</option>
                <option value="en_proceso" ${ticket.estado === 'en_proceso' ? 'selected' : ''}>En proceso</option>
                <option value="resuelto" ${ticket.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                <option value="cerrado" ${ticket.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
            </select>
            <label>Prioridad:</label>
            <select id="edit-prioridad">
                <option value="baja" ${ticket.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
                <option value="media" ${ticket.prioridad === 'media' ? 'selected' : ''}>Media</option>
                <option value="alta" ${ticket.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                <option value="critica" ${ticket.prioridad === 'critica' ? 'selected' : ''}>Crítica</option>
            </select>
            <label>Categoría:</label>
            <select id="edit-categoria">
                <option value="phishing" ${ticket.categoria === 'phishing' ? 'selected' : ''}>Phishing</option>
                <option value="malware" ${ticket.categoria === 'malware' ? 'selected' : ''}>Malware</option>
                <option value="acceso_no_autorizado" ${ticket.categoria === 'acceso_no_autorizado' ? 'selected' : ''}>Acceso no autorizado</option>
                <option value="vulnerabilidad" ${ticket.categoria === 'vulnerabilidad' ? 'selected' : ''}>Vulnerabilidad</option>
                <option value="otro" ${ticket.categoria === 'otro' ? 'selected' : ''}>Otro</option>
            </select>
            <button id="save-edit-btn">Guardar cambios</button>
            <div id="edit-message"></div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.remove();

    const saveBtn = modal.querySelector('#save-edit-btn');
    const editMessage = modal.querySelector('#edit-message');
    saveBtn.onclick = async () => {
        const updatedData = {
            titulo: modal.querySelector('#edit-titulo').value.trim(),
            descripcion: modal.querySelector('#edit-descripcion').value.trim(),
            estado: modal.querySelector('#edit-estado').value,
            prioridad: modal.querySelector('#edit-prioridad').value,
            categoria: modal.querySelector('#edit-categoria').value
        };
        if (updatedData.titulo.length < 5) {
            editMessage.textContent = 'El título debe tener al menos 5 caracteres.';
            editMessage.classList.add('error');
            return;
        }
        if (updatedData.descripcion.length < 10) {
            editMessage.textContent = 'La descripción debe tener al menos 10 caracteres.';
            editMessage.classList.add('error');
            return;
        }
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/tickets/${ticket.id_ticket}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al actualizar');
            editMessage.textContent = 'Ticket actualizado correctamente';
            editMessage.classList.add('success');
            setTimeout(() => {
                modal.remove();
                fetchTickets(token);
            }, 1000);
        } catch (error) {
            editMessage.textContent = error.message;
            editMessage.classList.add('error');
        }
    };
}

// Obtener y mostrar tickets (con manejo de 401)
async function fetchTickets(token) {
    ticketsList.innerHTML = 'Cargando tickets...';
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