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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Salero Bar funcionando en http://localhost:${PORT}`);
});