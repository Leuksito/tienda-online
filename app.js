let productos = [];
let usuario = null;
let carrito = [];
let categoriaActual = "Todo";
let busqueda = "";
let orden = "relevancia";

const CLAVE_CARRITO = "tactical-airsoft-carrito";

async function iniciar() {
  try {
    const respuestaProductos = await fetch("productos.json");
    productos = await respuestaProductos.json();

    const respuestaUsuario = await fetch("userData.json");
    usuario = await respuestaUsuario.json();
  } catch (error) {
    productos = window.PRODUCTOS_RESPALDO || [];
    usuario = window.USUARIO_RESPALDO || null;
  }

  if (productos.length === 0) {
    mostrarError();
    return;
  }

  cargarCarritoGuardado();
  crearBotonesCategorias();
  mostrarProductos();
  actualizarContador();
}

function cargarCarritoGuardado() {
  let guardado = null;

  try {
    guardado = localStorage.getItem(CLAVE_CARRITO);
  } catch (error) {
    guardado = null;
  }

  if (guardado === null) return;

  try {
    const ids = JSON.parse(guardado);
    for (let i = 0; i < ids.length; i++) {
      const producto = buscarProducto(ids[i]);
      if (producto !== null && producto.stock > 0) {
        carrito.push(ids[i]);
      }
    }
  } catch (error) {
    carrito = [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  } catch (error) {
    return;
  }
}

function buscarProducto(id) {
  for (let i = 0; i < productos.length; i++) {
    if (productos[i].id === id) {
      return productos[i];
    }
  }
  return null;
}

function contarCantidad(id) {
  let cantidad = 0;
  for (let i = 0; i < carrito.length; i++) {
    if (carrito[i] === id) {
      cantidad++;
    }
  }
  return cantidad;
}

function formatoPrecio(precio) {
  return precio.toFixed(2).replace(".", ",") + " €";
}

function crearBotonesCategorias() {
  const contenedor = document.getElementById("filtros");
  const categorias = ["Todo"];

  for (let i = 0; i < productos.length; i++) {
    const producto = productos[i];
    if (producto.stock > 0 && categorias.indexOf(producto.category) === -1) {
      categorias.push(producto.category);
    }
  }

  let html = "";
  for (let i = 0; i < categorias.length; i++) {
    let clase = "filter-btn";
    if (categorias[i] === categoriaActual) {
      clase = "filter-btn active";
    }
    html += '<button type="button" class="' + clase + '" onclick="filtrarCategoria(\'' + categorias[i] + '\')">' + categorias[i] + "</button>";
  }

  contenedor.innerHTML = html;
}

function filtrarCategoria(categoria) {
  categoriaActual = categoria;
  crearBotonesCategorias();
  mostrarProductos();
}

function obtenerProductosVisibles() {
  const lista = [];

  for (let i = 0; i < productos.length; i++) {
    const producto = productos[i];

    if (producto.stock === 0) {
      continue;
    }

    if (categoriaActual !== "Todo" && producto.category !== categoriaActual) {
      continue;
    }

    if (busqueda !== "") {
      const nombre = producto.name.toLowerCase();
      const descripcion = producto.description.toLowerCase();
      if (nombre.indexOf(busqueda) === -1 && descripcion.indexOf(busqueda) === -1) {
        continue;
      }
    }

    lista.push(producto);
  }

  if (orden === "precio-asc") {
    lista.sort(function (a, b) {
      return a.price - b.price;
    });
  } else if (orden === "precio-desc") {
    lista.sort(function (a, b) {
      return b.price - a.price;
    });
  } else if (orden === "nombre-az") {
    lista.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  } else if (orden === "stock-desc") {
    lista.sort(function (a, b) {
      return b.stock - a.stock;
    });
  }

  return lista;
}

function crearTarjeta(producto) {
  let etiquetaStock = producto.stock + " en stock";
  let claseStock = "card__stock";

  if (producto.stock <= 5) {
    etiquetaStock = "Últimas " + producto.stock + " uds.";
    claseStock = "card__stock card__stock--low";
  }

  return `
    <article class="card">
      <div class="card__media">
        <img src="${producto.image}" alt="${producto.name}" loading="lazy"
             onerror="this.onerror=null;this.src='img/placeholder.svg';">
        <span class="card__category">${producto.category}</span>
        <span class="${claseStock}">${etiquetaStock}</span>
      </div>
      <div class="card__body">
        <h3 class="card__title">${producto.name}</h3>
        <p class="card__desc">${producto.description}</p>
        <div class="card__footer">
          <span class="card__price">${formatoPrecio(producto.price)}</span>
          <button type="button" class="btn btn--add" onclick="agregarAlCarrito(${producto.id})">
            Añadir a la cesta
          </button>
        </div>
      </div>
    </article>
  `;
}

function mostrarProductos() {
  const contenedor = document.getElementById("gridProductos");
  const lista = obtenerProductosVisibles();

  let html = "";
  for (let i = 0; i < lista.length; i++) {
    html += crearTarjeta(lista[i]);
  }
  contenedor.innerHTML = html;

  const sinResultados = document.getElementById("sinResultados");
  if (lista.length === 0) {
    sinResultados.classList.remove("hidden");
  } else {
    sinResultados.classList.add("hidden");
  }

  const contador = document.getElementById("contadorResultados");
  if (lista.length === 1) {
    contador.textContent = "1 producto";
  } else {
    contador.textContent = lista.length + " productos";
  }
}

function agregarAlCarrito(id) {
  const producto = buscarProducto(id);
  if (producto === null) {
    return;
  }

  if (contarCantidad(id) >= producto.stock) {
    mostrarToast("No queda más stock de " + producto.name, "warning");
    return;
  }

  carrito.push(id);
  guardarCarrito();
  actualizarContador();
  mostrarToast(producto.name + " añadido a la cesta", "success");
}

function actualizarContador() {
  const contador = document.getElementById("contadorCesta");
  const boton = document.getElementById("btnCesta");

  contador.textContent = carrito.length;

  if (carrito.length === 0) {
    contador.classList.add("hidden");
    boton.classList.remove("has-items");
  } else {
    contador.classList.remove("hidden");
    boton.classList.add("has-items");
  }
}

function abrirCesta() {
  mostrarCesta();
  const modal = document.getElementById("modalCesta");
  modal.classList.add("modal--open");
  modal.setAttribute("aria-hidden", "false");
}

function cerrarCesta() {
  const modal = document.getElementById("modalCesta");
  modal.classList.remove("modal--open");
  modal.setAttribute("aria-hidden", "true");
}

function mostrarCesta() {
  const lista = document.getElementById("listaCesta");
  const ids = [];
  let total = 0;

  for (let i = 0; i < carrito.length; i++) {
    if (ids.indexOf(carrito[i]) === -1) {
      ids.push(carrito[i]);
    }
  }

  if (ids.length === 0) {
    lista.innerHTML = `
      <div class="cart-empty">
        <strong>Tu cesta está vacía</strong>
        <p>Añade réplicas, accesorios, uniformes o parches desde el catálogo.</p>
      </div>
    `;
  } else {
    let html = "";

    for (let i = 0; i < ids.length; i++) {
      const producto = buscarProducto(ids[i]);
      if (producto === null) {
        continue;
      }

      const cantidad = contarCantidad(ids[i]);
      const subtotal = producto.price * cantidad;
      total = total + subtotal;

      html += `
        <div class="cart-item">
          <img class="cart-item__img" src="${producto.image}" alt="${producto.name}"
               onerror="this.onerror=null;this.src='img/placeholder.svg';">
          <div class="cart-item__info">
            <h4>${producto.name}</h4>
            <span class="cart-item__price">${formatoPrecio(producto.price)} / unidad</span>
            <div class="qty">
              <button type="button" class="qty__btn" onclick="cambiarCantidad(${producto.id}, -1)" aria-label="Quitar una unidad">−</button>
              <span class="qty__value">${cantidad}</span>
              <button type="button" class="qty__btn" onclick="cambiarCantidad(${producto.id}, 1)" aria-label="Añadir una unidad">+</button>
            </div>
          </div>
          <div class="cart-item__right">
            <span class="cart-item__subtotal">${formatoPrecio(subtotal)}</span>
            <button type="button" class="cart-item__remove" onclick="eliminarProducto(${producto.id})">Eliminar</button>
          </div>
        </div>
      `;
    }

    lista.innerHTML = html;
  }

  document.getElementById("totalCesta").textContent = formatoPrecio(total);

  const botonFinalizar = document.getElementById("btnFinalizar");
  if (ids.length === 0) {
    botonFinalizar.disabled = true;
  } else {
    botonFinalizar.disabled = false;
  }

  const mensaje = document.getElementById("mensajeEnvio");
  if (usuario !== null) {
    mensaje.innerHTML = "Enviando pedido a: <strong>" + usuario.name + "</strong>, " + usuario.address;
  }
}

function cambiarCantidad(id, cambio) {
  const producto = buscarProducto(id);
  if (producto === null) {
    return;
  }

  if (cambio > 0) {
    if (contarCantidad(id) >= producto.stock) {
      mostrarToast("No queda más stock de " + producto.name, "warning");
      return;
    }
    carrito.push(id);
  } else {
    for (let i = carrito.length - 1; i >= 0; i--) {
      if (carrito[i] === id) {
        carrito.splice(i, 1);
        break;
      }
    }
  }

  guardarCarrito();
  actualizarContador();
  mostrarCesta();
}

function eliminarProducto(id) {
  const nuevoCarrito = [];

  for (let i = 0; i < carrito.length; i++) {
    if (carrito[i] !== id) {
      nuevoCarrito.push(carrito[i]);
    }
  }

  carrito = nuevoCarrito;
  guardarCarrito();
  actualizarContador();
  mostrarCesta();
}

function finalizarCompra() {
  if (carrito.length === 0) {
    return;
  }

  carrito = [];
  guardarCarrito();
  actualizarContador();
  mostrarCesta();
  cerrarCesta();
  mostrarToast("Pedido realizado con éxito. ¡Gracias por tu compra!", "success");
}

function mostrarToast(mensaje, tipo) {
  const contenedor = document.getElementById("toasts");
  const toast = document.createElement("div");

  toast.className = "toast toast--" + tipo;
  toast.innerHTML = '<span class="toast__icon"></span><span>' + mensaje + "</span>";
  contenedor.appendChild(toast);

  setTimeout(function () {
    toast.classList.add("toast--out");
  }, 2700);

  setTimeout(function () {
    toast.remove();
  }, 3000);
}

function iniciarEventos() {
  document.getElementById("buscador").addEventListener("input", function (evento) {
    busqueda = evento.target.value.toLowerCase().trim();
    mostrarProductos();
  });

  document.getElementById("orden").addEventListener("change", function (evento) {
    orden = evento.target.value;
    mostrarProductos();
  });

  document.getElementById("btnCesta").addEventListener("click", abrirCesta);
  document.getElementById("btnCerrarCesta").addEventListener("click", cerrarCesta);
  document.querySelector("#modalCesta .modal__overlay").addEventListener("click", cerrarCesta);
  document.getElementById("btnFinalizar").addEventListener("click", finalizarCompra);
}

iniciarEventos();
iniciar();
