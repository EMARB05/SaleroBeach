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
        // --- A. CÁLCULO DEL TOTAL ---
        const totalComanda = pedido.articulos.reduce((acc, art) => acc + (art.precio || 0), 0);

        // --- B. AGRUPACIÓN DE PRODUCTOS REPETIDOS ---
        // Esto evita que salgan 5 filas de pulpo si piden 5 pulpos
        const articulosAgrupados = pedido.articulos.reduce((acc, art) => {
            // Buscamos si ya existe el producto con el mismo nombre y nota
            const existe = acc.find(item => item.nombre === art.nombre && item.nota === art.nota);
            if (existe) {
                existe.cantidad += 1;
            } else {
                acc.push({ ...art, cantidad: 1 });
            }
            return acc;
        }, []);

        // --- C. GENERACIÓN DEL HTML DE LA TARJETA ---
        const cardHTML = `
            <article class="order-card" data-order-id="${pedido.id}">
                <div class="card-header">
                    <h2>Order #${pedido.id}</h2>
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
                                ${art.nota ? `<p class="note">${art.nota}</p>` : ''}
                                ${esBarra ? `<p class="price-item">${(art.precio || 0).toFixed(2)}€</p>` : ''}
                            </div>
                            <span class="qty">Qty: ${art.cantidad}</span>
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
    const contenedorBotones = tarjeta.querySelector('.card-buttons');
    contenedorBotones.innerHTML = `<button class="btn-completed">✔ COMPLETED</button>`;
    tarjeta.classList.add('order-finished');
    localStorage.setItem(`order-${id}`, 'completed');
}



function cancelarPedido(id, sinConfirmar = false) {
    if (sinConfirmar || confirm("¿Estás seguro de que quieres eliminar este pedido?")) {
        const index = todasLasComandas.findIndex(p => p.id === id);
        if (index > -1) todasLasComandas.splice(index, 1);
        localStorage.removeItem(`order-${id}`);
        renderizarPedidos();
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
        const respuesta = await fetch('http://localhost:3000/api/pedidos/pendientes');
        const pedidosDB = await respuesta.json();
        
        todasLasComandas = pedidosDB.map(p => ({
            id: p._id.slice(-3),
            mongoId: p._id, // IMPORTANTE: Necesitamos el ID real de Mongo para el PATCH
            mesa: p.mesa || "Barra", 
            articulos: p.items,
            total: p.total
        }));
        renderizarPedidos();
    } catch (error) {
        console.error("Error cargando pedidos:", error);
    }
}

// Nueva función de COBRAR que avisa al servidor
async function cobrarMesa(idDisplay) {
    const pedido = todasLasComandas.find(p => p.id === idDisplay);
    if (!pedido) return;

    if (confirm(`¿Cobrar ${pedido.total.toFixed(2)}€ de la Mesa ${pedido.mesa}?`)) {
        try {
            const respuesta = await fetch(`http://localhost:3000/api/pedidos/${pedido.mongoId}/pagar`, {
                method: 'PATCH'
            });

            if (respuesta.ok) {
                alert("¡Pedido pagado y enviado al historial!");
                obtenerPedidosDeDB(); // Refrescamos la lista automáticamente
            }
        } catch (error) {
            alert("Error al conectar con el servidor");
        }

    }

}

async function mostrarHistorial() {
    actualizarMenuActivo('btn-history');
    document.querySelector('.cards-container').style.display = 'none';
   // 1. OCULTAMOS LO QUE NO NECESITAMOS
    document.querySelector('.cards-container').style.display = 'none'; // Tarjetas
    document.querySelector('.order-tabs').style.display = 'none';      // Los botones #c35
    document.getElementById('main-title').style.display = 'none';              // El título POS

    // 2. MOSTRAMOS EL HISTORIAL
    const viewHistory = document.getElementById('history-view');
    viewHistory.style.display = 'block';

    try {
        const respuesta = await fetch('http://localhost:3000/api/pedidos/historial');
        const historial = await respuesta.json();
        const tbody = document.getElementById('history-body');
        
        tbody.innerHTML = historial.map(pedido => {
            // --- 1. AGRUPAR ITEMS PARA LA TABLA ---
            const agrupados = pedido.items.reduce((acc, item) => {
                const existe = acc.find(a => a.nombre === item.nombre);
                if (existe) {
                    existe.cantidad += 1;
                } else {
                    acc.push({ ...item, cantidad: 1 });
                }
                return acc;
            }, []);

            // --- 2. CREAR EL TEXTO "Producto (Cantidad)" ---
            const textoMenu = agrupados
                .map(prod => `${prod.nombre} (${prod.cantidad})`)
                .join(', ');

            const fechaFormateada = new Date(pedido.fecha).toLocaleString();

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
                    <td><span class="status-badge completed">COMPLETED</span></td>
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