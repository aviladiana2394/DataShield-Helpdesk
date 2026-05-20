// admin.js - Panel Administrativo DataShield
const API_URL = 'http://localhost:3000';
let token = localStorage.getItem('token');
let ticketsCache = []; // Guardar todos los tickets para filtrar
let paginaActual = 1;
const itemsPorPagina = 10;
let ordenActual = 'fecha_desc'; // fecha_desc, fecha_asc, prioridad_desc, prioridad_asc
let chartInstance = null; // Para la gráfica

// Redirigir a login si no hay token
if (!token) {
    alert('Debes iniciar sesión primero');
    window.location.href = 'index.html';
}

// Función para obtener el rol del token
function getRoleFromToken() {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.rol;
    } catch(e) {
        return null;
    }
}

// Función para mostrar notificaciones toast
function showToast(message, type = 'info') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('success', 'error', 'info');
    toast.classList.add(type, 'show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Verificar rol
async function verificarRol() {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.rol !== 'admin' && payload.rol !== 'tecnico') {
            showToast('No tienes permisos para acceder al panel administrativo', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
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
const logoutAdminBtn = document.getElementById('logout-admin');

if (logoutAdminBtn) {
    logoutAdminBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}

const userRole = getRoleFromToken();
if (userRole !== 'admin' && btnUsuarios) {
    btnUsuarios.style.display = 'none';
}

btnTickets.addEventListener('click', () => {
    setActive(btnTickets);
    cargarTickets();
});

if (btnUsuarios) {
    btnUsuarios.addEventListener('click', () => {
        setActive(btnUsuarios);
        cargarUsuarios();
    });
}

function setActive(activeBtn) {
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

// SCROLL TO TOP
const scrollBtn = document.createElement('button');
scrollBtn.innerHTML = '↑';
scrollBtn.className = 'scroll-top';
scrollBtn.style.display = 'none';
document.body.appendChild(scrollBtn);

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollBtn.style.display = 'block';
    } else {
        scrollBtn.style.display = 'none';
    }
});
scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ==================== TICKETS ====================
async function cargarTickets() {
    contenido.innerHTML = '<div class="spinner"></div>';
    try {
        const response = await fetch(`${API_URL}/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) throw new Error('Sesión expirada');
        const data = await response.json();
        if (data.success) {
            ticketsCache = data.data;
            mostrarFiltrosYTabla(ticketsCache);
        } else {
            contenido.innerHTML = '<p>Error al cargar tickets</p>';
        }
    } catch (error) {
        contenido.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function mostrarFiltrosYTabla(tickets) {
    const userRole = getRoleFromToken();
    const isAdmin = userRole === 'admin';
    
    // Construir HTML con filtros
    let html = `
        <div class="filtros-container">
            <div class="filtros">
                <select id="filtro-estado">
                    <option value="todos">Todos los estados</option>
                    <option value="abierto">Abierto</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                </select>
                <select id="filtro-prioridad">
                    <option value="todos">Todas las prioridades</option>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                </select>
                <select id="orden-tickets">
                    <option value="fecha_desc">Más recientes primero</option>
                    <option value="fecha_asc">Más antiguos primero</option>
                    <option value="prioridad_desc">Prioridad (mayor a menor)</option>
                    <option value="prioridad_asc">Prioridad (menor a mayor)</option>
                </select>
                <button id="aplicar-filtros">Aplicar filtros</button>
                <button id="limpiar-filtros">Limpiar</button>
            </div>
            <div class="buscador-container">
                <input type="text" id="buscador-tickets" placeholder="🔍 Buscar tickets por título o descripción..." class="buscador">
            </div>
            <canvas id="grafica-tickets" class="grafica" style="max-height: 300px; margin-bottom: 30px;"></canvas>
            <div id="tickets-lista"></div>
            <div id="paginacion" class="paginacion"></div>
        </div>
    `;
    contenido.innerHTML = html;
    
    // Función para aplicar filtros y ordenamiento
    function aplicarFiltros() {
        const estadoFiltro = document.getElementById('filtro-estado').value;
        const prioridadFiltro = document.getElementById('filtro-prioridad').value;
        const orden = document.getElementById('orden-tickets').value;
        const busqueda = document.getElementById('buscador-tickets').value.toLowerCase();
        
        let ticketsFiltrados = [...tickets];
        
        // Filtro por estado
        if (estadoFiltro !== 'todos') {
            ticketsFiltrados = ticketsFiltrados.filter(t => t.estado === estadoFiltro);
        }
        // Filtro por prioridad
        if (prioridadFiltro !== 'todos') {
            ticketsFiltrados = ticketsFiltrados.filter(t => t.prioridad === prioridadFiltro);
        }
        // Búsqueda por título o descripción
        if (busqueda) {
            ticketsFiltrados = ticketsFiltrados.filter(t => 
                t.titulo.toLowerCase().includes(busqueda) || 
                t.descripcion.toLowerCase().includes(busqueda)
            );
        }
        // Ordenamiento
        const prioridadOrden = { 'critica': 4, 'alta': 3, 'media': 2, 'baja': 1 };
        switch(orden) {
            case 'fecha_desc':
                ticketsFiltrados.sort((a,b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
                break;
            case 'fecha_asc':
                ticketsFiltrados.sort((a,b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
                break;
            case 'prioridad_desc':
                ticketsFiltrados.sort((a,b) => prioridadOrden[b.prioridad] - prioridadOrden[a.prioridad]);
                break;
            case 'prioridad_asc':
                ticketsFiltrados.sort((a,b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]);
                break;
        }
        
        paginaActual = 1;
        mostrarTicketsConPaginacion(ticketsFiltrados, isAdmin);
        actualizarGrafica(ticketsFiltrados);
    }
    
    document.getElementById('aplicar-filtros').addEventListener('click', aplicarFiltros);
    document.getElementById('limpiar-filtros').addEventListener('click', () => {
        document.getElementById('filtro-estado').value = 'todos';
        document.getElementById('filtro-prioridad').value = 'todos';
        document.getElementById('orden-tickets').value = 'fecha_desc';
        document.getElementById('buscador-tickets').value = '';
        aplicarFiltros();
    });
    document.getElementById('buscador-tickets').addEventListener('keyup', aplicarFiltros);
    document.getElementById('orden-tickets').addEventListener('change', aplicarFiltros);
    
    aplicarFiltros();
}

function mostrarTicketsConPaginacion(tickets, isAdmin) {
    const totalPaginas = Math.ceil(tickets.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const ticketsPagina = tickets.slice(inicio, fin);
    
    if (!ticketsPagina.length) {
        document.getElementById('tickets-lista').innerHTML = '<p>No hay tickets que coincidan con los filtros.</p>';
        document.getElementById('paginacion').innerHTML = '';
        return;
    }
    
    // Agrupar por estado
    const grupos = { abierto: [], en_proceso: [], resuelto: [], cerrado: [] };
    ticketsPagina.forEach(t => {
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
                        Prioridad: ${ticket.prioridad} | Categoría: ${ticket.categoria}<br>
                        <small>Creado: ${new Date(ticket.fecha_creacion).toLocaleDateString()}</small>
                    </div>
                    <div class="ticket-acciones">
                        <select class="cambiar-estado" data-id="${ticket.id_ticket}">
                            <option value="abierto" ${ticket.estado === 'abierto' ? 'selected' : ''}>Abierto</option>
                            <option value="en_proceso" ${ticket.estado === 'en_proceso' ? 'selected' : ''}>En proceso</option>
                            <option value="resuelto" ${ticket.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                            <option value="cerrado" ${ticket.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                        </select>
                        <button class="btn-actualizar" data-id="${ticket.id_ticket}">Actualizar</button>`;
            if (isAdmin) {
                html += `<button class="btn-eliminar" data-id="${ticket.id_ticket}">Eliminar</button>`;
            }
            html += `</div></div>`;
        });
        html += `</div></div>`;
    }
    document.getElementById('tickets-lista').innerHTML = html;
    
    // Paginación
    let paginacionHtml = '<div class="paginacion-buttons">';
    for (let i = 1; i <= totalPaginas; i++) {
        paginacionHtml += `<button class="pagina-btn ${i === paginaActual ? 'activa' : ''}" data-pagina="${i}">${i}</button>`;
    }
    paginacionHtml += '</div>';
    document.getElementById('paginacion').innerHTML = paginacionHtml;
    
    document.querySelectorAll('.pagina-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            paginaActual = parseInt(btn.dataset.pagina);
            mostrarTicketsConPaginacion(tickets, isAdmin);
        });
    });
    
    // Eventos para actualizar estado
    document.querySelectorAll('.btn-actualizar').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const select = btn.parentElement.querySelector('.cambiar-estado');
            const nuevoEstado = select.value;
            cambiarEstado(id, nuevoEstado);
        });
    });
    
    if (isAdmin) {
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm(`¿Eliminar ticket #${id}? Esta acción no se puede deshacer.`)) {
                    await eliminarTicket(id);
                }
            });
        });
    }
}

function actualizarGrafica(tickets) {
    const estados = ['abierto', 'en_proceso', 'resuelto', 'cerrado'];
    const conteos = estados.map(e => tickets.filter(t => t.estado === e).length);
    const ctx = document.getElementById('grafica-tickets').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Abierto', 'En proceso', 'Resuelto', 'Cerrado'],
            datasets: [{
                label: 'Cantidad de tickets',
                data: conteos,
                backgroundColor: ['#28a745', '#ffc107', '#17a2b8', '#6c757d'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Tickets por estado' }
            }
        }
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
            showToast('Estado actualizado correctamente', 'success');
            cargarTickets();
        } else {
            showToast(data.message || 'No se pudo actualizar el estado', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
    }
}

async function eliminarTicket(id) {
    try {
        const response = await fetch(`${API_URL}/tickets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Ticket eliminado correctamente', 'success');
            cargarTickets();
        } else {
            showToast(data.message || data.error || 'No se pudo eliminar el ticket', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
    }
}

// ==================== USUARIOS (solo admin) ====================
async function cargarUsuarios() {
    if (getRoleFromToken() !== 'admin') {
        contenido.innerHTML = '<p>Acceso denegado. Solo administradores pueden ver usuarios.</p>';
        return;
    }
    
    contenido.innerHTML = '<div class="spinner"></div>';
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
                      </div>
                  `;
    });
    html += `</tbody> </div>`;
    contenido.innerHTML = html;
    
    document.querySelectorAll('.btn-actualizar-rol').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.id;
            const select = btn.parentElement.querySelector('.rol-select');
            const nuevoRol = select.value;
            cambiarRol(userId, nuevoRol);
        });
    });
}

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
            showToast('Rol actualizado correctamente', 'success');
            cargarUsuarios();
        } else {
            showToast(data.message || 'No se pudo actualizar el rol', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
    }
}

// Cargar tickets por defecto
cargarTickets();