(function comprobarSesion() {
    const usuario = localStorage.getItem('usuarioNombre');
    const rol = localStorage.getItem('usuarioRol');

    // Si no hay usuario O el rol no es 'barra', lo echamos
    if (!usuario || rol !== 'barra') {
        window.location.href = 'login.html';
    }
})();

let todasLasComandas = [];
let filtroActivoActual = null;

// Único punto de entrada
window.onload = () => {
    obtenerPedidosDeDB();
    // Actualizar automáticamente cada 5 segundos para ver pedidos nuevos
    setInterval(obtenerPedidosDeDB, 5000);
};
//  Función principal de dibujo (Maneja Cocina y Barra)
function renderizarPedidos(filtroId = null) {
    const contenedor = document.querySelector('.cards-container');
    const contenedorTabs = document.querySelector('.order-tabs');
    const esBarra = document.body.classList.contains('bar-view');

    // Dibujar las pestañas superiores
    contenedorTabs.innerHTML = todasLasComandas.map(p => `
        <span class="tab ${filtroId === p.id ? 'active' : ''}" 
              onclick="filtrarPorPedido('${p.id}')">#${p.id}</span>
    `).join('');

    const pedidosAMostrar = filtroId
        ? todasLasComandas.filter(p => p.id === filtroId)
        : todasLasComandas;

    contenedor.innerHTML = '';

    pedidosAMostrar.forEach(pedido => {
        //Detecta si el pedido está listo para servir
        const esListo = pedido.estado === 'Listo';
        const esCancelado = pedido.estado === 'Cancelado';

        // --- CÁLCULO DEL TOTAL (Suma solo lo que NO esté cancelado o se haya quitado) ---
        const totalComanda = pedido.articulos.reduce((acc, art) => {
            // Si por algún motivo el artículo viene marcado como cancelado, no lo sumamos
            if (art.cancelado === true) return acc;

            // Sumamos el resto de artículos (bebidas y platos que sí se sirven)
            return acc + (art.precio || 0);
        }, 0);

        // ---AGRUPACIÓN DE PRODUCTOS REPETIDOS ---
        const articulosAgrupados = pedido.articulos.reduce((acc, art) => {
            const existe = acc.find(item => item.nombre === art.nombre && item.nota === art.nota);
            if (existe) {
                existe.cantidad += 1;
            } else {
                acc.push({ ...art, cantidad: 1 });
            }
            return acc;
        }, []);

      // --- GENERACIÓN DEL HTML DE LA TARJETA ---
const cardHTML = `
    <article class="order-card ${esListo ? 'order-ready' : ''} ${esCancelado ? 'order-canceled' : ''}" data-order-id="${pedido.id}">
        <div class="card-header">
            <div class="header-info">
                <h2>
                    Order #${pedido.id} 
                    ${esListo ? '<span class="ready-badge"> LISTO</span>' : ''}
                    ${esCancelado ? '<span class="cancel-badge"> CANCELADO</span>' : ''}
                </h2>
                
                <div class="order-camarero ${!pedido.camareroAsignado || pedido.camareroAsignado === 'Cliente (QR)' ? 'pending' : 'assigned'}">
                    ${pedido.camareroAsignado && pedido.camareroAsignado !== 'Cliente (QR)' 
                        ? `👤 ${pedido.camareroAsignado}` 
                        : '🔔 Pendiente de atender'}
                </div>
            </div>
            <div class="alert-icon">!</div>
        </div>
        
        <div class="product-list">
            ${articulosAgrupados.map(art => `
                <div class="product-item">
                    <img src="${art.imagen}" alt="${art.nombre}">
                    <div class="details">
                        <h3>${art.nombre}</h3>
                        ${art.nota ? `<p class="note">⚠️ ${art.nota}</p>` : ''}
                        ${esBarra ? `<p class="price-item">${(art.precio || 0).toFixed(2)}€</p>` : ''}
                    </div>
                    <span class="qty">Qty: ${art.cantidad}</span>
                    ${esBarra ? `<button class="btn-delete-item" onclick="quitarArticulo('${pedido.mongoId}', '${art.nombre}')">🗑️</button>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="total-items">
            <hr class="separator">
            <div class="info-footer">
                <div class="total-price-section">
                    <p class="qty-total">x${pedido.articulos.length} Items</p>
                    ${esBarra ? `<p class="total-amount">${totalComanda.toFixed(2)}€</p>` : ''}
                </div>
                <h3 class="table-id">Mesa ${pedido.mesa}</h3>
            </div>
            <div class="card-buttons">
                ${esBarra
                    ? `<button class="btn-pay" onclick="cobrarMesa('${pedido.id}')">COBRAR CUENTA</button>`
                    : `<button class="btn-check" onclick="completarPedido('${pedido.id}')">✔ LISTO</button>`
                }
                <button class="btn-cancel" onclick="cancelarPedido('${pedido.id}')">✖</button>
            </div>
        </div>
    </article>
`;
        contenedor.innerHTML += cardHTML;
    });

    comprobarPedidosGuardados();
}

// Lógica de estados y botones
function completarPedido(id) {
    const tarjeta = document.querySelector(`[data-order-id="${id}"]`);

    if (tarjeta) {
        // 1. Feedback visual 
        const btnCont = tarjeta.querySelector('.card-buttons');
        if (btnCont) {
            btnCont.innerHTML = `<button class="btn-completed">✔ COMPLETADO</button>`;
        }
        tarjeta.classList.add('order-finished');

        // 2. Persistencia temporal (opcional)
        localStorage.setItem(`order-${id}`, 'completed');

        // 3. Limpieza de pantalla
        setTimeout(() => {
            tarjeta.style.transition = "0.3s"; 
            tarjeta.style.opacity = "0";

            setTimeout(() => {
                tarjeta.remove();

                //Actualizamos el array local para que el filtro por pestañas (#c35)
                todasLasComandas = todasLasComandas.filter(p => p.id !== id);

                console.log(`Pedido #${id} eliminado de la vista.`);
            }, 300);
        }, 1500);
    }
}

//Funcion que cancela un pedido
async function cancelarPedido(idCorto) {
    if (!confirm("¿Seguro que quieres quitar este pedido de la pantalla?")) return;

    //Buscamos el pedido en el array local para obtener el mongoId
    const pedido = todasLasComandas.find(p => p.id === idCorto);
    if (!pedido) return;

    try {
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Archivado' }) 
        });

        if (respuesta.ok) {
            const tarjeta = document.querySelector(`[data-order-id="${idCorto}"]`);

            if (tarjeta) {
                tarjeta.style.transition = "all 0.4s ease";
                tarjeta.style.opacity = "0";
                tarjeta.style.transform = "scale(0.9)";

                setTimeout(() => {
                    tarjeta.remove();

                    // 5. Limpiamos el array local
                    todasLasComandas = todasLasComandas.filter(p => p.id !== idCorto);
                    
                    console.log(`Pedido ${idCorto} archivado con éxito.`);
                }, 400);
            }
        } else {
            const errorData = await respuesta.json();
            alert("Error del servidor: " + (errorData.mensaje || "No se pudo archivar"));
        }
    } catch (error) {
        console.error("Error al archivar:", error);
        alert("Error de conexión al intentar quitar el pedido.");
    }
}
function comprobarPedidosGuardados() {
    const orders = document.querySelectorAll('.order-card');
    orders.forEach(card => {
        const id = card.getAttribute('data-order-id');
        if (localStorage.getItem(`order-${id}`) === 'completed') {
            const btnCont = card.querySelector('.card-buttons');
            if (btnCont) btnCont.innerHTML = `<button class="btn-completed">✔ COMPLETED</button>`;
            card.classList.add('order-finished');
        }
    });
}

function filtrarPorPedido(id) {
    if (filtroActivoActual === id) {
        filtroActivoActual = null;
    } else {
        filtroActivoActual = id;
    }

    renderizarPedidos(filtroActivoActual);
}

function inicializarMenu() {
    const menuItems = document.querySelectorAll('.sidebar nav ul li');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const activeItem = document.querySelector('.sidebar nav ul li.active');
            if (activeItem) activeItem.classList.remove('active');
            item.classList.add('active');
        });
    });
}


// Cambiamos la URL para traer solo PENDIENTES
async function obtenerPedidosDeDB() {
    try {
        const respuesta = await fetch('/api/pedidos/pendientes');
        const pedidosDB = await respuesta.json();

        todasLasComandas = pedidosDB.map(p => ({
            id: p._id.slice(-3),
            mongoId: p._id,
            mesa: p.mesa || "Barra",
            articulos: p.items,
            total: p.total,
            estado: p.estado,
            camareroAsignado: p.camareroAsignado
        }));
        renderizarPedidos(filtroActivoActual);
    } catch (error) {
        console.error("Error cargando pedidos:", error);
    }
}

//Función de COBRAR que avisa al servidor, hace Ptach a la api
async function cobrarMesa(idDisplay) {
    const pedido = todasLasComandas.find(p => p.id === idDisplay);
    if (!pedido) return;

    if (confirm(`¿Confirmar cobro de ${pedido.total.toFixed(2)}€ para la Mesa ${pedido.mesa}?`)) {
        try {
            // Usamos la ruta /estado
            const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'Pagado' }) //Enviamos el nuevo estado
            });

            if (respuesta.ok) {
                //Quitamos la tarjeta del HTML rápido para que el usuario vea el cambio
                const tarjeta = document.querySelector(`[data-order-id="${idDisplay}"]`);
                if (tarjeta) {
                    tarjeta.style.opacity = "0.5"; 
                    tarjeta.remove();
                }

                // 2. Limpiamos el array local
                todasLasComandas = todasLasComandas.filter(p => p.id !== idDisplay);

                console.log(`Mesa ${pedido.mesa} pagada con éxito.`);
                
                
                // obtenerPedidosDeDB(); 
            } else {
                alert("El servidor no pudo procesar el pago.");
            }
        } catch (error) {
            console.error("Error en cobrarMesa:", error);
            alert("Error de conexión con el servidor");
        }
    }
}

async function mostrarHistorial() {
    actualizarMenuActivo('btn-history');
    document.querySelector('.cards-container').style.display = 'none';
    document.querySelector('.order-tabs').style.display = 'none';
    document.getElementById('main-title').style.display = 'none';
    document.getElementById('products-view').style.display = 'none';
    document.getElementById('gestion-sala').style.display = 'none';
    document.getElementById('gestion-usuarios').style.display='none';
    

    const viewHistory = document.getElementById('history-view');
    viewHistory.style.display = 'block';

    try {
        const respuesta = await fetch('/api/pedidos/historial');
        const historial = await respuesta.json();
        const tbody = document.getElementById('history-body');

        tbody.innerHTML = historial.map(pedido => {
            const agrupados = pedido.items.reduce((acc, item) => {
                const existe = acc.find(a => a.nombre === item.nombre);
                if (existe) {
                    existe.cantidad += 1;
                } else {
                    acc.push({ ...item, cantidad: 1 });
                }
                return acc;
            }, []);

            const textoMenu = agrupados
                .map(prod => `${prod.nombre} (${prod.cantidad})`)
                .join(', ');

            const fechaFormateada = new Date(pedido.fecha).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Si el estado es 'Cancelado', usamos la clase 'canceled' (rojo), si no, 'completed' (verde)
            const esCancelado = pedido.estado === 'Cancelado';
            const claseEstado = esCancelado ? 'canceled' : 'completed';
            const textoEstado = esCancelado ? 'CANCELED' : 'COMPLETED';

            return `
                <tr>
                    <td>Mesa ${pedido.mesa || 'N/A'}</td>
                    <td>#${pedido._id.slice(-5)}</td>
                    <td>
                        <div class="menu-info">
                            <strong>${textoMenu}</strong><br>
                            <span class="history-price">${(pedido.total || 0).toFixed(2)}€</span>
                        </div>
                    </td>
                    <td>${fechaFormateada}</td>
                    <td><span class="status-badge ${claseEstado}">${textoEstado}</span></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error("Error al cargar historial:", error);
    }
}

function mostrarGestionMesas() {
    // Ocultamos todo lo demás
    document.querySelector('.cards-container').style.display = 'none';
    document.getElementById('history-view').style.display = 'none';
    document.querySelector('.order-tabs').style.display = 'none';
    document.getElementById('products-view').style.display = 'none';
    document.getElementById('gestion-usuarios').style.display='none';
    
    // Mostramos la gestión de mesas
    document.getElementById('gestion-sala').style.display = 'block';
    
    // Actualizamos el menú activo
    actualizarMenuActivo('btn-mesas');
    
    // Cargamos los datos de las mesas
    cargarGestionMesas();
}

function actualizarMenuActivo(idBoton) {
    // Quitamos la clase active de todos los LI del menú
    document.querySelectorAll('.sidebar li').forEach(li => {
        li.classList.remove('active');
    });
    // Se la ponemos solo al que pulsamos
    document.getElementById(idBoton).classList.add('active');
}

function mostrarHome() {
    actualizarMenuActivo('btn-home');

    // Volvemos a mostrar lo del Home/barra
    const tituloPrincipal = document.getElementById('main-title');
    if (tituloPrincipal) tituloPrincipal.style.display = 'block';

    const tabs = document.querySelector('.order-tabs');
    if (tabs) tabs.style.display = 'flex';

    const cards = document.querySelector('.cards-container');
    if (cards) cards.style.display = 'flex';

    //Ocultamos las otras vistas historial y productos
    document.getElementById('history-view').style.display = 'none';
    document.getElementById('gestion-sala').style.display = 'none';
    document.getElementById('gestion-usuarios').style.display= 'none';

    // ESTA LÍNEA PARA LIMPIAR LA PANTALLA DE PRODUCTOS
    const vistaProductos = document.getElementById('products-view');
    if (vistaProductos) vistaProductos.style.display = 'none';

    obtenerPedidosDeDB();
}
function cerrarSesion() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem('usuarioNombre');
        window.location.href = 'login.html';
    }
}
async function quitarArticulo(mongoId, nombreArticulo) {
    if (!confirm(`¿Seguro que quieres quitar "${nombreArticulo}"?`)) return;

    try {
        const respuesta = await fetch(`/api/pedidos/${mongoId}/quitar-item`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }, // Decimos que enviamos JSON
            body: JSON.stringify({ nombre: nombreArticulo }) // Enviamos el nombre
        });

        if (respuesta.ok) {
            obtenerPedidosDeDB(); // Recargamos la lista para que desaparezca visualmente
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
async function mostrarGestionProductos() {
    actualizarMenuActivo('btn-barra'); // Para que se quede naranja el botón PRODUCTS

    // 1. Ocultamos todo lo demás
    document.getElementById('main-title').style.display = 'none';
    document.querySelector('.order-tabs').style.display = 'none';
    document.querySelector('.cards-container').style.display = 'none';
    document.getElementById('history-view').style.display = 'none';
    document.getElementById('gestion-sala').style.display = 'none';
    document.getElementById('gestion-usuarios').style.display='none';

    // 2. Mostramos la vista de productos
    const viewProducts = document.getElementById('products-view');
    viewProducts.style.display = 'block';

    try {
        const respuesta = await fetch('/api/productos');
        const productos = await respuesta.json();
        const contenedor = document.getElementById('products-admin-list');

        contenedor.innerHTML = productos.map(prod => `
            <div class="product-stock-card">
                <img src="${prod.imagen}" alt="${prod.nombre}">
                <div class="product-stock-info">
                    <h4>${prod.nombre}</h4>
                    <span>${prod.precio.toFixed(2)}€</span>
                </div>
                <label class="switch">
                    <input type="checkbox" ${prod.disponible !== false ? 'checked' : ''} 
                           onchange="actualizarDisponibilidad('${prod._id}', this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

// Cargar la lista de gestión
async function cargarGestionMesas() {
    const res = await fetch('/api/mesas');
    const mesas = await res.json();
    
    const tbody = document.getElementById('lista-gestion-mesas');
    tbody.innerHTML = mesas.map(m => `
        <tr>
            <td>Mesa ${m.numero}</td>
            <td>${m.zona}</td>
            <td>
                <span class="status-pill ${m.activa ? 'active' : 'inactive'}">
                    ${m.activa ? 'Habilitada' : 'Deshabilitada'}
                </span>
            </td>
            <td>
                <button onclick="toggleMesa('${m.numero}', ${!m.activa})">
                    ${m.activa ? 'Deshabilitar' : 'Habilitar'}
                </button>
            </td>
        </tr>
    `).join('');
}

// Función para "apagar/encender" la mesa
async function toggleMesa(numero, nuevoEstado) {
    await fetch(`/api/mesas/${numero}/activar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: nuevoEstado })
    });
    cargarGestionMesas(); // Refrescar tabla
    
}

// --- FUNCIÓN EN BARRA.JS ---
async function crearNuevaMesa() {
    // 1. Recogemos los valores de la interfaz
    const inputNum = document.getElementById('nuevo-num-mesa');
    const inputZona = document.getElementById('nueva-zona-mesa');

    const numeroMesa = inputNum.value;
    const zonaMesa = inputZona.value.toLowerCase();

    if (!numeroMesa || !zonaMesa) {
        return alert("Por favor, rellena el número de mesa.");
    }
    console.log("Enviando a DB:", { numero: numeroMesa, zona: zonaMesa });

    try {
        // 2. Enviamos los datos al servidor vía API
        const respuesta = await fetch('/api/mesas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                numero: numeroMesa,
                zona: zonaMesa 
            })
        });

        if (respuesta.ok) {
            // 3.Limpiamos y refrescamos
            alert(`Mesa ${numeroMesa} creada con éxito.`);
            inputNum.value = ''; // Limpiar el input
            
            // if (typeof cargarGestionMesas === 'function') cargarGestionMesas(); 
        } else {
            const error = await respuesta.text();
            alert("❌ Error: " + error);
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Error de conexión con el servidor.");
    }
}

// Función para avisar al servidor del cambio
async function actualizarDisponibilidad(id, estado) {
    try {
        await fetch(`/api/productos/${id}/disponibilidad`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disponible: estado })
        });
    } catch (error) {
        alert("Error al actualizar el stock");
    }
}
// 1. Cargar la lista al entrar en la sección
async function cargarUsuariosDesdeDB() {
    try {
        const res = await fetch('/api/usuarios');
        
        // SI LA RESPUESTA NO ES OK (ej. 404), NO INTENTAMOS LEER JSON
        if (!res.ok) {
            console.error("El servidor respondió con error:", res.status);
            return; 
        }

        const usuarios = await res.json();
        const tbody = document.getElementById('lista-usuarios-body');
        if (!tbody) return;

        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td><strong>${u.nombreReal}</strong></td>
                <td>${u.username}</td>
                <td><span class="badge ${u.rol}">${u.rol.toUpperCase()}</span></td>
                <td>
                    <button onclick="eliminarUsuario('${u._id}', '${u.username}')" class="btn-delete" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Error crítico en cargarUsuariosDesdeDB:", err);
    }
}

// Crear o Modificar usuario 
async function crearNuevoUsuario() {
    const nombreReal = document.getElementById('user-nombre').value.trim();
    const username = document.getElementById('user-login').value.trim();
    const password = document.getElementById('user-pass').value;
    const rol = document.getElementById('user-rol').value;
    console.log("Datos a enviar:", { nombreReal, username, password, rol });

    if (!nombreReal || !username || !password) {
        return alert("Por favor, rellena todos los campos.");
    }

    try {
        const res = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreReal, username, password, rol })
        });

        if (res.ok) {
            alert("Usuario guardado correctamente.");
            // Limpiar campos
            document.getElementById('user-nombre').value = '';
            document.getElementById('user-login').value = '';
            document.getElementById('user-pass').value = '';
            cargarUsuariosDesdeDB(); 
        } else {
            const error = await res.text();
            alert("Error: " + error);
        }
    } catch (err) {
        alert("Error de conexión con el servidor.");
    }
}

// Elimina un usuario segun su id
async function eliminarUsuario(id, username) {
    if (username === 'Admin1_resto') return alert("No puedes eliminar al administrador principal.");
    
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${username}?`)) return;

    try {
        const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cargarUsuariosDesdeDB();
        }
    } catch (err) {
        alert("No se pudo eliminar al usuario.");
    }
}

function mostrarGestionUsuarios() {
    // Ocultamos todas las secciones primero 
    const secciones = [
        '.cards-container', 
        '#history-view', 
        '#gestion-sala', 
        '#gestion-usuarios',
        '#products-view',
        '#main-title'
    ];

    secciones.forEach(selector => {
        const el = document.querySelector(selector) || document.getElementById(selector.replace('#',''));
        if (el) el.style.display = 'none';
    });
    document.querySelector('.order-tabs').style.display = 'none';
    //Mostramos solo la de usuarios
    document.getElementById('gestion-usuarios').style.display = 'block';

    

    //Marcamos el botón del menú como "activo"
    actualizarMenuActivo('btn-usuarios-nav');

    //Cargamos los datos de la base de datos inmediatamente
    cargarUsuariosDesdeDB();
}