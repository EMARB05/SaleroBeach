const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express(); // 1º Creamos la aplicación

// 2º Configuramos los Middlewares (Permisos y JSON)
app.use(cors()); 
app.use(express.json());

// 3º Servimos los archivos estáticos de tu carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// 4º Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5º Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/SaleroBeach')
  .then(() => console.log('✅ Conectado a MongoDB: SaleroBeach'))
  .catch(err => console.error('❌ Error al conectar a Mongo:', err));

// 6º Esquema y Modelo
const productoSchema = new mongoose.Schema({
    id: String,
    nombre: String,
    precio: Number,
    categoria: String,
    sub: String,
    imagen: String
});
const Producto = mongoose.model('Producto', productoSchema, 'productos');

// 7º Ruta de la API
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (error) {
        res.status(500).send("Error al obtener productos");
    }
});


// 1. Esquema para los Pedidos (Orders)
const pedidoSchema = new mongoose.Schema({
    items: Array,        // Aquí guardaremos la lista de productos del carrito
    total: Number,       // El precio total del pedido
    fecha: { type: Date, default: Date.now }, // Para saber cuándo se hizo el pedido
    estado: { type: String, default: 'Pendiente' } // Para que el camarero sepa si está listo
});

const Pedido = mongoose.model('Pedido', pedidoSchema, 'pedidos');


// 2. RUTA POST: Para recibir el pedido del cliente y guardarlo en la DB
app.post('/api/pedidos', async (req, res) => {
    try {
        const nuevoPedido = new Pedido(req.body); // Recibe { items, total }
        await nuevoPedido.save();
        res.status(201).json({ mensaje: "✅ Pedido guardado con éxito", id: nuevoPedido._id });
    } catch (error) {
        console.error("Error al guardar pedido:", error);
        res.status(500).send("Error al procesar el pedido");
    }
});


// SUSTITUYE TU app.get('/api/pedidos') POR ESTA:
app.get('/api/pedidos/pendientes', async (req, res) => {
    try {
        // Buscamos los que NO estén pagados ($ne significa "not equal")
        // Así te saldrán los nuevos y los que no tengan el campo estado todavía
        const pedidos = await Pedido.find({ 
            estado: { $ne: 'Pagado' } 
        }).sort({ fecha: -1 }); 
        
        res.json(pedidos);
    } catch (error) {
        console.error("Error en /api/pedidos/pendientes:", error);
        res.status(500).send("Error al obtener pedidos pendientes");
    }
});

// 3. Ruta para el HISTORY (Solo pagados)
app.get('/api/pedidos/historial', async (req, res) => {
    const historial = await Pedido.find({ estado: 'Pagado' }).sort({ fecha: -1 });
    res.json(historial);
});

// 4. Ruta para CAMBIAR A PAGADO (PATCH)
app.patch('/api/pedidos/:id/pagar', async (req, res) => {
    try {
        await Pedido.findByIdAndUpdate(req.params.id, { estado: 'Pagado' });
        res.send("Pedido pagado correctamente");
    } catch (error) {
        res.status(500).send("Error al procesar el pago");
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Salero Bar funcionando en http://localhost:${PORT}`);
});