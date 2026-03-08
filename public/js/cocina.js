// 1. Función para calcular cuánto hace que llegó el pedido
function obtenerDiferenciaTiempo(timestamp) {
    const ahora = new Date();
    const pedidoHora = new Date(timestamp);
    const difMinutos = Math.floor((ahora - pedidoHora) / 60000);
    
    if (difMinutos < 1) return "15:30"; // O la hora fija del pedido
    return `Hace ${difMinutos} min`;
}

// 2. Función principal para pintar las tarjetas (Filtrando comida)
function renderizarPedidosCocina(pedidosNuevos) {
    const contenedor = document.getElementById('seccion-pedidos'); // Usamos el ID del nuevo HTML
    contenedor.innerHTML = ''; 

    pedidosNuevos.forEach(pedido => {
        const soloComida = pedido.productos.filter(item => item.categoria === 'comida');
        if (soloComida.length === 0) return;

        // LÓGICA DEL CÍRCULO: Revisamos si ALGÚN producto tiene nota
        const tieneNotas = soloComida.some(item => item.nota && item.nota.trim() !== "");

        const tarjeta = `
            <article class="order-card">
                <div class="card-header">
                    <h2 class="table-id">Mesa ${pedido.mesa}</h2>
                    ${tieneNotas ? '<div class="alert-icon">!</div>' : ''}
                </div>
                
                <div class="product-list">
                    ${soloComida.map(item => `
                        <div class="product-item">
                            <div class="details">
                                <h3>${item.nombre}</h3>
                                ${item.nota ? `<p class="note">${item.nota}</p>` : ''}
                            </div>
                            <span class="qty">x${item.cantidad}</span>
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
                        <button class="btn-check" onclick="marcarListo('${pedido.id}')">LISTO</button>
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