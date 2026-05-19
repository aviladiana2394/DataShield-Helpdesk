// admin.js - Panel Administrativo DataShield
const API_URL = 'http://localhost:3000';
let token = localStorage.getItem('token');

// Redirigir a login si no hay token
if (!token) {
    alert('Debes iniciar sesión primero');
    window.location.href = 'index.html';
}

// Verificar rol (solo admin o técnico pueden acceder)
async function verificarRol() {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.rol !== 'admin' && payload.rol !== 'tecnico') {
            alert('No tienes permisos para acceder al panel administrativo');
            window.location.href = 'index.html';
        }
    } catch(e) {
        window.location.href = 'index.html';
    }
}
verificarRol();

// Elementos del DOM
const btnTickets = document.getElementById('btn-tickets');
const btnUsuarios = document.getElementById('btn-usuarios');
const contenido = document.getElementById('contenido');

// Eventos del menú
btnTickets.addEventListener('click', () => {
    setActive(btnTickets);
    cargarTickets();
});
btnUsuarios.addEventListener('click', () => {
    setActive(btnUsuarios);
    cargarUsuarios();
});

function setActive(activeBtn) {
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

// ==================== TICKETS ====================
async function cargarTickets() {
    contenido.innerHTML = '<p>Cargando tickets...</p>';
    try {
        const response = await fetch(`${API_URL}/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) throw new Error('Sesión expirada');
        const data = await response.json();
        if (data.success) {
            mostrarTickets(data.data);
        } else {
            contenido.innerHTML = '<p>Error al cargar tickets</p>';
        }
    } catch (error) {
        contenido.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function mostrarTickets(tickets) {
    if (!tickets.length) {
        contenido.innerHTML = '<p>No hay tickets disponibles.</p>';
        return;
    }

    // Agrupar por estado
    const grupos = { abierto: [], en_proceso: [], resuelto: [], cerrado: [] };
    tickets.forEach(t => {
        if (grupos[t.estado]) grupos[t.estado].push(t);
        else grupos[t.estado] = [t];
    });

    let html = '';
    for (const [estado, lista] of Object.entries(grupos)) {
        if (lista.length === 0) continue;
        html += `<div class="estado-grupo">
                    <h3>${estado.toUpperCase()} (${lista.length})</h3>
                    <div class="tickets-grid">`;
        lista.forEach(ticket => {
            let prioridadClass = '';
            if (ticket.prioridad === 'alta') prioridadClass = 'prioridad-alta';
            else if (ticket.prioridad === 'critica') prioridadClass = 'prioridad-critica';
            else if (ticket.prioridad === 'media') prioridadClass = 'prioridad-media';
            else if (ticket.prioridad === 'baja') prioridadClass = 'prioridad-baja';

            html += `
                <div class="ticket-card ${prioridadClass}" data-id="${ticket.id_ticket}">
                    <div class="ticket-titulo">#${ticket.id_ticket} - ${ticket.titulo}</div>
                    <div class="ticket-descripcion">${ticket.descripcion.substring(0, 80)}...</div>
                    <div class="ticket-meta">
                        Prioridad: ${ticket.prioridad} | Categoría: ${ticket.categoria}
                    </div>
                    <div class="ticket-acciones">
                        <select class="cambiar-estado" data-id="${ticket.id_ticket}">
                            <option value="abierto" ${ticket.estado === 'abierto' ? 'selected' : ''}>Abierto</option>
                            <option value="en_proceso" ${ticket.estado === 'en_proceso' ? 'selected' : ''}>En proceso</option>
                            <option value="resuelto" ${ticket.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                            <option value="cerrado" ${ticket.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                        </select>
                        <button class="btn-actualizar" data-id="${ticket.id_ticket}">Actualizar</button>
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    }
    contenido.innerHTML = html;

    // Eventos para actualizar estado
    document.querySelectorAll('.btn-actualizar').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const select = btn.parentElement.querySelector('.cambiar-estado');
            const nuevoEstado = select.value;
            cambiarEstado(id, nuevoEstado);
        });
    });
}

async function cambiarEstado(id, nuevoEstado) {
    try {
        const response = await fetch(`${API_URL}/tickets/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Estado actualizado correctamente');
            cargarTickets(); // Recargar la lista
        } else {
            alert('Error: ' + (data.message || 'No se pudo actualizar el estado'));
        }
    } catch (error) {
        alert('Error de conexión: ' + error.message);
    }
}

async function cargarUsuarios() {
    contenido.innerHTML = '<p>Cargando usuarios...</p>';
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) throw new Error('Sesión expirada');
        const data = await response.json();
        if (data.success) {
            mostrarUsuarios(data.data);
        } else {
            contenido.innerHTML = '<p>Error al cargar usuarios</p>';
        }
    } catch (error) {
        contenido.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function mostrarUsuarios(usuarios) {
    if (!usuarios.length) {
        contenido.innerHTML = '<p>No hay usuarios registrados.</p>';
        return;
    }
    let html = `<table class="tabla-usuarios">
                    <thead>
                        <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>`;
    usuarios.forEach(user => {
        html += `<tr>
                    <td>${user.id_usuario}</td>
                    <td>${user.nombre}</td>
                    <td>${user.email}</td>
                    <td>${user.rol}</td>
                    <td>
                        <select class="rol-select" data-id="${user.id_usuario}">
                            <option value="usuario" ${user.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                            <option value="tecnico" ${user.rol === 'tecnico' ? 'selected' : ''}>Técnico</option>
                            <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                        <button class="btn-actualizar-rol" data-id="${user.id_usuario}">Actualizar rol</button>
                     </td>
                 </tr>`;
    });
    html += `</tbody> </table>`;
    contenido.innerHTML = html;

    // Eventos para actualizar rol
    document.querySelectorAll('.btn-actualizar-rol').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.id;
            const select = btn.parentElement.querySelector('.rol-select');
            const nuevoRol = select.value;
            cambiarRol(userId, nuevoRol);
        });
    });
}

// Función para cambiar rol (similar a cambiarEstado)
async function cambiarRol(userId, nuevoRol) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rol: nuevoRol })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Rol actualizado correctamente');
            cargarUsuarios(); // recargar la tabla
        } else {
            alert('Error: ' + (data.message || 'No se pudo actualizar el rol'));
        }
    } catch (error) {
        alert('Error de conexión: ' + error.message);
    }
}
// Cargar tickets por defecto al iniciar
cargarTickets();