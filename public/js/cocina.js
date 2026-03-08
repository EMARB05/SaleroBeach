let todasLasComandas = [];

// 1. Función para calcular cuánto hace que llegó el pedido
function obtenerDiferenciaTiempo(timestamp) {
    const ahora = new Date();
    const pedidoHora = new Date(timestamp);
    const difMinutos = Math.floor((ahora - pedidoHora) / 60000);
    
    if (difMinutos < 1) return "15:30"; // O la hora fija del pedido
    return `Hace ${difMinutos} min`;
}

// 2. Función principal para pintar las tarjetas (Filtrando comida)
function renderizarPedidosCocina(filtroId = null) {
    const contenedor = document.getElementById('seccion-pedidos');
    const contenedorTabs = document.querySelector('.order-tabs'); // Asegúrate de tener este div en tu HTML
    contenedor.innerHTML = ''; 

    // 1. Dibujar las pestañas con los IDs de los pedidos actuales
    if (contenedorTabs) {
        contenedorTabs.innerHTML = todasLasComandas.map(p => `
            <span class="tab ${filtroId === p.id ? 'active' : ''}" 
                  onclick="renderizarPedidosCocina('${p.id}')">#${p.id}</span>
        `).join('');
    }

    // 2. Decidir qué pedidos mostrar (uno solo o todos)
    const pedidosAMostrar = filtroId
        ? todasLasComandas.filter(p => p.id === filtroId)
        : todasLasComandas;

    pedidosAMostrar.forEach(pedido => {
        // Filtramos solo los productos que son 'comida'
        const soloComida = pedido.articulos.filter(item => (item.sub || '').toLowerCase() === 'food');
        if (soloComida.length === 0) return;

        const tieneNotas = soloComida.some(item => item.nota && item.nota.trim() !== "");

        const tarjeta = `
            <article class="order-card" data-order-id="${pedido.id}">
                <div class="card-header">
                    <h2 class="table-id">Mesa ${pedido.mesa}</h2>
                    ${tieneNotas ? '<div class="alert-icon">!</div>' : ''}
                </div>
                
                <div class="product-list">
                    ${soloComida.map(item => `
                        <div class="product-item no-img">
                            <div class="details">
                                <h3>${item.nombre}</h3>
                                ${item.nota ? `<p class="note">⚠️ ${item.nota.toUpperCase()}</p>` : ''}
                            </div>
                            <span class="qty">x${item.cantidad || 1}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="total-items">
                    <hr class="separator">
                    <div class="info-footer">
                        <p class="qty-total">Comida pendiente</p>
                        <p>${obtenerDiferenciaTiempo(pedido.fecha)}</p>
                    </div>
                    <div class="card-buttons">
                        <button class="btn-check" onclick="completarPedido('${pedido.id}')">LISTO</button>
                        <button class="btn-cancel" onclick="cancelarPedido('${pedido.id}')">✖</button>
                    </div>
                </div>
            </article>
        `;
        contenedor.innerHTML += tarjeta;
    });
}

function mostrarSeccion(nombreSeccion) {
    const pedidos = document.getElementById('seccion-pedidos');
    const historial = document.getElementById('seccion-historial');
    const botones = document.querySelectorAll('.sidebar nav ul li');

    // 1. Cambiar visibilidad de las secciones
    if (nombreSeccion === 'pedidos') {
        pedidos.style.display = 'flex';
        historial.style.display = 'none';
    } else {
        pedidos.style.display = 'none';
        historial.style.display = 'block';
    }

    // 2. Arreglar el "brillo" (Clase Active)
    botones.forEach(boton => {
        boton.classList.remove('active');
        
        // Buscamos el texto dentro del botón para saber cuál activar
        const texto = boton.innerText.toUpperCase();
        if (nombreSeccion === 'pedidos' && texto.includes('COCINA')) {
            boton.classList.add('active');
        } else if (nombreSeccion === 'historial' && texto.includes('HISTORY')) {
            boton.classList.add('active');
        }
    });
}

async function completarPedido(idCorto) {
    const pedido = todasLasComandas.find(p => p.id === idCorto);
    if (!pedido) return;

    try {
        // En lugar de solo borrar la tarjeta, avisamos a la API
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/completar`, {
            method: 'PATCH' // O el método que use tu controlador
        });

        if (respuesta.ok) {
            // Si la DB dice OK, entonces sí lo borramos de la pantalla
            const tarjeta = document.querySelector(`[data-order-id="${idCorto}"]`);
            tarjeta.style.opacity = "0";
            setTimeout(() => {
                todasLasComandas = todasLasComandas.filter(p => p.id !== idCorto);
                renderizarPedidosCocina();
            }, 400);
        }
    } catch (error) {
        alert("Error al actualizar en la base de datos");
    }
}
async function cancelarPedido(idCorto) {
    if (!confirm("¿Seguro que quieres cancelar este pedido?")) return;
    
    const pedido = todasLasComandas.find(p => p.id === idCorto);
    
    try {
        const respuesta = await fetch(`/api/pedidos/${pedido.mongoId}/cancelar`, {
            method: 'PATCH'
        });

        if (respuesta.ok) {
            obtenerPedidosCocina(); // Refrescamos todo desde la DB
        }
    } catch (error) {
        console.error("Error al cancelar:", error);
    }
}

async function obtenerPedidosCocina() {
    try {
        // Traemos solo lo que está pendiente de cocinar
        const respuesta = await fetch('/api/pedidos/pendientes'); 
        const datos = await respuesta.json();
        
        todasLasComandas = datos.map(p => ({
            id: p._id.slice(-3),
            mongoId: p._id,
            mesa: p.mesa || "Barra",
            articulos: p.items,
            fecha: p.fecha
        }));
        
        renderizarPedidosCocina();
    } catch (error) {
        console.error("Error conectando con la DB:", error);
    }
}


window.onload = obtenerPedidosCocina;
setInterval(obtenerPedidosCocina, 15000);