// Archivo productos.js completo
const productos = [
    // --- SECCIÓN COMIDA (Food Category) ---
    // Usamos las imágenes que tienes en tu carpeta public/img/
    { id: 'f1', nombre: 'Pulpo a la Feira', precio: 18.00, cat: 'Cocina', sub: 'Food', img: './img/clienteImg/pulpoFeira.png' },
    { id: 'f2', nombre: 'Pimientos Padrón', precio: 6.50, cat: 'Cocina', sub: 'Food', img: '../img/pimientosPadron.png' },
    { id: 'f3', nombre: 'Tortilla Española', precio: 12.00, cat: 'Cocina', sub: 'Food', img: '../img/tortilla.png' },

    // --- SECCIÓN BEBIDAS (Drinks) ---
    // He mantenido tus bebidas pero asegurando que tengan sub: 'Drinks'
    { id: 'c1', nombre: 'Estrella Galicia', precio: 2.50, cat: 'Barra', sub: 'Drinks', img: '../img/clienteImg/estrella.webp' },
    { id: 'c2', nombre: '1906', precio: 2.70, cat: 'Barra', sub: 'Drinks', img: '../img/clienteImg/1906.jpg' },
    { id: 'c3', nombre: 'Cañón Estrella (60cl)', precio: 5.00, cat: 'Barra', sub: 'Drinks', img: '../img/clienteImg/cañon-estrella.png' },
    { id: 'r1', nombre: 'Coca Cola', precio: 2.50, cat: 'Barra', sub: 'Drinks', img: '../img/clienteImg/cola.jpg' },
    { id: 'r2', nombre: 'Aquarius Naranja', precio: 2.50, cat: 'Barra', sub: 'Drinks', img: '../img/clienteImg/aquarius.jpg' },
    { id: 'i1', nombre: 'Poleo Menta', precio: 1.50, cat: 'Barra', sub: 'Drinks', img: '../img/clienteImg/infusion.jpg' }
];