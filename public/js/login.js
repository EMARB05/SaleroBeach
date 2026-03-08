
// Este código debe ejecutarse nada más cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const nombre = localStorage.getItem('usuarioNombre');
    if (nombre) {
        document.querySelector('.user-name').innerText = nombre;
    }
});
async function manejarLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if(!user || !pass) return alert("Rellena todos los campos");

    try {
        const respuesta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const resultado = await respuesta.json();

        if (resultado.success) {
            // Guardamos el nombre para que aparezca en el header
            localStorage.setItem('usuarioNombre', resultado.nombre);
            window.location.href = 'barra.html'; 
        } else {
            alert("❌ " + resultado.mensaje);
        }
    } catch (error) {
        alert("Servidor no disponible");
    }
}
