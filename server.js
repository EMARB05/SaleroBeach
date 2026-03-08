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



// 1. Esquema y Modelo de Usuarios
const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nombreReal: String
});
const Usuario = mongoose.model('Usuario', usuarioSchema, 'usuarios');

  // Función para crear el admin inicial si no existe
async function crearAdminInicial() {
    const existe = await Usuario.findOne({ username: 'Admin1_resto' });
    if (!existe) {
        await Usuario.create({
            username: 'Admin1_resto',
            password: 'abc123.', // Pon la que quieras
            nombreReal: 'Staff_Barra'
        });
        console.log("👤 Usuario Admin1_resto creado con éxito");
    }
}
// Llama a la función después de conectar a Mongo
mongoose.connect('mongodb://localhost:27017/SaleroBeach')
  .then(() => {
      console.log('✅ Conectado a MongoDB');
      crearAdminInicial(); // <-- Añade esta línea aquí
  });

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
    mesa: String,
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


app.get('/api/pedidos/pendientes', async (req, res) => {
    try {
        // ✅ SOLO queremos los que están estrictamente en 'Pendiente'
        // Esto ignorará automáticamente los 'Pagados' y los 'Cancelados'
        const pedidos = await Pedido.find({ 
            estado: 'Pendiente' 
        }).sort({ fecha: -1 }); 
        
        res.json(pedidos);
    } catch (error) {
        res.status(500).send("Error al obtener pedidos pendientes");
    }
});

// 3. Ruta para el HISTORY (Solo pagados)
app.get('/api/pedidos/historial', async (req, res) => {
    const historial = await Pedido.find({ estado: 'Pagado','Cancelado' }).sort({ fecha: -1 });
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



// 2. RUTA POST para el Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Buscamos un usuario que coincida exactamente con lo enviado
        const user = await Usuario.findOne({ username, password });

        if (user) {
            res.json({ success: true, nombre: user.nombreReal });
        } else {
            res.status(401).json({ success: false, mensaje: "Credenciales inválidas" });
        }
    } catch (error) {
        res.status(500).send("Error en el servidor");
    }
});

app.patch('/api/pedidos/:id/cancelar', async (req, res) => {
    try {
        // ✅ Cambiamos el estado a Cancelado en lugar de borrarlo
        await Pedido.findByIdAndUpdate(req.params.id, { estado: 'Cancelado' });
        res.send("Pedido cancelado con éxito");
    } catch (error) {
        res.status(500).send("Error al cancelar el pedido");
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Salero Bar funcionando en http://localhost:${PORT}`);
});