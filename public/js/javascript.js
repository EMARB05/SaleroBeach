(function comprobarSesion() {
    const usuario = localStorage.getItem('usuarioNombre');

    if (!usuario) {
        // Si no hay nadie logueado, lo mandamos al diseño naranja
        window.location.href = 'login.html';
    }
})();
// 1. Datos Unificados (Sustituye a 'pedidosActivos')
let todasLasComandas = [];

// 2. Único punto de entrada
window.onload = () => {
    obtenerPedidosDeDB();
    // Actualizar automáticamente cada 15 segundos para ver pedidos nuevos
    setInterval(obtenerPedidosDeDB, 15000);
};
// 3. Función principal de dibujo (Maneja Cocina y Barra)
function renderizarPedidos(filtroId = null) {
    const contenedor = document.querySelector('.cards-container');
    const contenedorTabs = document.querySelector('.order-tabs');
    const esBarra = document.body.classList.contains('bar-view');

    // 1. Dibujar las pestañas superiores
    contenedorTabs.innerHTML = todasLasComandas.map(p => `
        <span class="tab ${filtroId === p.id ? 'active' : ''}" 
              onclick="filtrarPorPedido('${p.id}')">#${p.id}</span>
    `).join('');

    const pedidosAMostrar = filtroId
        ? todasLasComandas.filter(p => p.id === filtroId)
        : todasLasComandas;

    contenedor.innerHTML = '';

    pedidosAMostrar.forEach(pedido => {
        //Detecta si el pedido está listo para servir ---
        const esListo = pedido.estado === 'Listo';
        const esCancelado = pedido.estado === 'Cancelado';

        // --- A. CÁLCULO DEL TOTAL ---
        // --- CÁLCULO DEL TOTAL REAL ---
        // --- A. CÁLCULO DEL TOTAL (Suma solo lo que NO esté cancelado o se haya quitado) ---
        const totalComanda = pedido.articulos.reduce((acc, art) => {
            // Si por algún motivo el artículo viene marcado como cancelado, no lo sumamos
            if (art.cancelado === true) return acc;

            // Sumamos el resto de artículos (bebidas y platos que sí se sirven)
            return acc + (art.precio || 0);
        }, 0);

        // --- B. AGRUPACIÓN DE PRODUCTOS REPETIDOS ---
        const articulosAgrupados = pedido.articulos.reduce((acc, art) => {
            const existe = acc.find(item => item.nombre === art.nombre && item.nota === art.nota);
            if (existe) {
                existe.cantidad += 1;
            } else {
                acc.push({ ...art, cantidad: 1 });
            }
            return acc;
        }, []);

        // --- C. GENERACIÓN DEL HTML DE LA TARJETA ---
        // Añadimos la clase 'order-ready' si el estado es 'Listo'
        const cardHTML = `
           
           <article class="order-card ${esListo ? 'order-ready' : ''} ${esCancelado ? 'order-canceled' : ''}" data-order-id="${pedido.id}">
        <div class="card-header">
            <h2>
                Order #${pedido.id} 
                ${esListo ? '<span class="ready-badge"> LISTO</span>' : ''}
                ${esCancelado ? '<span class="cancel-badge">❌ CANCELADO</span>' : ''}
            </h2>
            <div class="alert-icon">!</div>
        </div>
                <div class="product-list">
                    ${articulosAgrupados.map(art => `
                        <div class="product-item">
                            <img src="${art.imagen}" alt="${art.nombre}">
                            <div class="details">
                                <h3>${art.nombre} 
                                    <span class="badge ${(art.sub || '').toLowerCase() === 'food' ? 'badge-cocina' : 'badge-barra'}">
                                        ${(art.sub || '').toLowerCase() === 'food' ? 'COCINA' : 'BARRA'}
                                    </span>
                                </h3>
                                
                                ${art.nota ? `<p class="note">⚠️ ${art.nota}</p>` : ''}
                                
                                ${esBarra ? `<p class="price-item">${(art.precio || 0).toFixed(2)}€</p>` : ''}
                            </div>
                            <span class="qty">Qty: ${art.cantidad}</span>
                            ${esBarra ? `<button class="btn-delete-item" onclick="quitarArticulo('${pedido.id}', '${art.nombre}')">🗑️</button>` : ''}
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
                ? `<button class="btn-pay" onclick="cobrarMesa('${pedido.id}')">💳 COBRAR CUENTA</button>`
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

// 4. Lógica de estados y botones
function completarPedido(id) {
    const tarjeta = document.querySelector(`[data-order-id="${id}"]`);

    if (tarjeta) {
        // 1. Feedback visual (Botón naranja de COMPLETADO)
        const btnCont = tarjeta.querySelector('.card-buttons');
        if (btnCont) {
            btnCont.innerHTML = `<button class="btn-completed">✔ COMPLETADO</button>`;
        }
        tarjeta.classList.add('order-finished');

        // 2. Persistencia temporal (opcional)
        localStorage.setItem(`order-${id}`, 'completed');

        // 3. Limpieza de pantalla
        setTimeout(() => {
            tarjeta.style.transition = "0.3s"; // Asegúrate de que tenga transición
            tarjeta.style.opacity = "0";

            setTimeout(() => {
                tarjeta.remove();

                // 4. Actualizamos el array local para que el filtro por pestañas (#c35)
                todasLasComandas = todasLasComandas.filter(p => p.id !== id);

                console.log(`Pedido #${id} eliminado de la vista.`);
            }, 300);
        }, 1500);
    }
}

async function cancelarPedido(idCorto) { // Recibe el ID de 3 letras (ej: 'a2b')
    if (!confirm("¿Seguro que quieres cancelar este pedido, fiera?")) return;

    try {
        // 1. Buscamos el objeto completo en nuestro array local para sacar el mongoId
        const pedido = todasLasComandas.find(p => p.id === idCorto);

        if (!pedido) {
            console.error("No se encontró el pedido localmente");
            return;
        }

        // 2. Hacemos el fetch usando el mongoId real
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/cancelar`, {
            method: 'PATCH'
        });

        if (respuesta.ok) {
            // 3. ¡IMPORTANTE! Limpiamos el filtro de pestañas para que no intente 
            // renderizar un pedido que ya no va a existir en 'pendientes'
            obtenerPedidosDeDB();
            console.log("Pedido cancelado con éxito");
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
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
    const pestañaActiva = document.querySelector(`.tab.active`);
    if (pestañaActiva && pestañaActiva.innerText.includes(id)) {
        renderizarPedidos();
    } else {
        renderizarPedidos(id);
    }
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
            mongoId: p._id, // IMPORTANTE: Necesitamos el ID real de Mongo para el PATCH
            mesa: p.mesa || "Barra",
            articulos: p.items,
            total: p.total,
            estado: p.estado
        }));
        renderizarPedidos();
    } catch (error) {
        console.error("Error cargando pedidos:", error);
    }
}

//Función de COBRAR que avisa al servidor, hace Ptach a la api
async function cobrarMesa(idDisplay) {
    const pedido = todasLasComandas.find(p => p.id === idDisplay);
    if (!pedido) return;

    if (confirm(`¿Cobrar ${pedido.total.toFixed(2)}€ de la Mesa ${pedido.mesa}?`)) {
        try {
            const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/pagar`, {
                method: 'PATCH'
            });

            if (respuesta.ok) {
                // Eliminamos la tarjeta del DOM inmediatamente
                const tarjeta = document.querySelector(`[data-order-id="${idDisplay}"]`);
                if (tarjeta) tarjeta.remove();

                // Quitamos del array para que el refresco automático no la vuelva a pintar
                todasLasComandas = todasLasComandas.filter(p => p.id !== idDisplay);

                alert("¡Pedido pagado y enviado al historial!");
                obtenerPedidosDeDB();
            }
        } catch (error) {
            alert("Error al conectar con el servidor");
        }
    }
}

async function mostrarHistorial() {
    actualizarMenuActivo('btn-history');
    document.querySelector('.cards-container').style.display = 'none';
    document.querySelector('.order-tabs').style.display = 'none';
    document.getElementById('main-title').style.display = 'none';

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

            const fechaFormateada = new Date(pedido.fecha).toLocaleString();

            // Si el estado es 'Cancelado', usamos la clase 'canceled' (rojo), si no, 'completed' (verde)
            const esCancelado = pedido.estado === 'Cancelado';
            const claseEstado = esCancelado ? 'canceled' : 'completed';
            const textoEstado = esCancelado ? 'CANCELADO' : 'COMPLETED';

            return `
                <tr>
                    <td>Mesa ${pedido.mesa || 'N/A'}</td>
                    <td>#${pedido._id.slice(-5)}</td>
                    <td>
                        <div class="menu-info">
                            <strong>${textoMenu}</strong><br>
                            <span class="history-price">${pedido.total.toFixed(2)}€</span>
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
    // 1. VOLVEMOS A MOSTRAR LO DEL HOME/BARRA
    const tituloPrincipal = document.getElementById('main-title');
    if (tituloPrincipal) tituloPrincipal.style.display = 'block'; // Mostramos "POS - CONTROL DE CAJA"

    const tabs = document.querySelector('.order-tabs');
    if (tabs) tabs.style.display = 'flex'; // Mostramos los botones #c35

    const cards = document.querySelector('.cards-container');
    if (cards) cards.style.display = 'flex'; // Mostramos las tarjetas
    document.getElementById('history-view').style.display = 'none';
    document.querySelector('.cards-container').style.display = 'flex';
    obtenerPedidosDeDB();
}
function cerrarSesion() {
    if (confirm("¿Seguro que quieres cerrar sesión, fiera?")) {
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