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

    contenedorTabs.innerHTML = todasLasComandas.map(p => `
        <span class="tab ${filtroId === p.id ? 'active' : ''}" 
              onclick="filtrarPorPedido('${p.id}')">#${p.id}</span>
    `).join('');

    const pedidosAMostrar = filtroId
        ? todasLasComandas.filter(p => p.id === filtroId)
        : todasLasComandas;

    contenedor.innerHTML = '';

    pedidosAMostrar.forEach(pedido => {
        // --- 1. AQUÍ VA EL CÁLCULO (Fuera del HTML) ---
        const totalComanda = pedido.articulos.reduce((acc, art) => acc + (art.precio || 0), 0);

        // --- 2. AQUÍ EMPIEZA EL HTML ---
        const cardHTML = `
            <article class="order-card" data-order-id="${pedido.id}">
                <div class="card-header">
                    <h2>Order #${pedido.id}</h2>
                    <div class="alert-icon">!</div>
                </div>
                <div class="product-list">
                    ${pedido.articulos.map(art => `
                        <div class="product-item">
                            <img src="${art.imagen}" alt="${art.nombre}">
                            <div class="details">
    <h3>${art.nombre} <span class="badge ${(art.sub || '').toLowerCase() === 'food' ? 'badge-cocina' : 'badge-barra'}">
        ${(art.sub || '').toLowerCase() === 'food' ? 'COCINA' : 'BARRA'}
    </span>
</h3>
    ${art.nota ? `<p class="note">${art.nota}</p>` : ''}
    
    ${esBarra ? `<p class="price-item">${(art.precio || 0).toFixed(2)}€</p>` : ''}
</div>
                            <span class="qty">Qty: 1</span>
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
            mesa: "3", 
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