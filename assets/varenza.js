/* =========================================================================
   Varenza — JavaScript
   Deliberadamente mínimo. Las transiciones entre páginas van con la View
   Transitions API (CSS) y los revelados por scroll con animation-timeline
   (CSS). Aquí solo queda lo que el navegador no resuelve solo.
   Nada de lo que hay aquí es necesario para leer la web: si el JS no
   carga, el contenido se ve y el formulario envía igual.
   ========================================================================= */
(() => {
  'use strict';

  // Marca de que el JS vive. El CSS la usa para decidir si el menú móvil
  // puede ser un panel plegable o tiene que quedarse como fila abierta, y
  // para no mostrar el velo de entrada si nadie va a poder retirarlo.
  document.documentElement.classList.remove('no-js');

  /* --- Velo de entrada ------------------------------------------------
     Solo en la primera entrada de la sesión. Las transiciones entre páginas
     son de documento completo: sin este freno, el velo saldría en cada clic.

     Se retira cuando la web está lista de verdad —tipografías e imagen de
     portada—, no con un temporizador inventado. Pero con un tope: si algo
     tarda o falla, el velo se va igual. Nadie debe quedarse mirando una
     cortina porque una imagen no cargue.                                */
  const velo = document.getElementById('velo');
  if (velo) {
    const YA_VISTO = 'varenza:velo';
    let visto = false;
    try { visto = sessionStorage.getItem(YA_VISTO) === '1'; } catch (e) { /* modo privado */ }

    if (visto) {
      velo.remove();
    } else {
      try { sessionStorage.setItem(YA_VISTO, '1'); } catch (e) { /* da igual */ }

      // El trazo del isotipo dura 1,5s y el rótulo entra a los 0,7s. Con menos
      // de 1,5s el velo se retiraba a media animación y no se llegaba a ver.
      // Es tiempo que se le añade a la primera visita, a cambio de la entrada.
      // Para acortarla o quitarla, este número es el único sitio que tocar.
      const MINIMO = 1500;
      const TOPE   = 3500;   // pase lo que pase, a los 3,5s se va
      const inicio = performance.now();
      let retirado = false;

      const retirar = () => {
        if (retirado) return;
        retirado = true;
        const espera = Math.max(0, MINIMO - (performance.now() - inicio));
        setTimeout(() => {
          velo.classList.add('fuera');
          // Fuera del DOM al acabar la transición: no debe interceptar clics
          // ni quedarse en el árbol de accesibilidad.
          velo.addEventListener('transitionend', () => velo.remove(), { once: true });
          setTimeout(() => velo.remove(), 1200);   // por si no llega el evento
        }, espera);
      };

      const portada = document.querySelector('.portada .fondo img');
      const listo = [
        document.fonts ? document.fonts.ready : Promise.resolve(),
        portada && !portada.complete
          ? new Promise(r => { portada.addEventListener('load', r, { once: true });
                               portada.addEventListener('error', r, { once: true }); })
          : Promise.resolve()
      ];
      Promise.all(listo).then(retirar);
      setTimeout(retirar, TOPE);
      addEventListener('pageshow', e => { if (e.persisted) velo.remove(); });
    }
  }

  /* --- Barra: sólida al dejar atrás la portada -------------------------
     Las páginas sin portada a pantalla completa se marcan con
     data-solida="always" y nacen sólidas.                              */
  const barra = document.querySelector('.topbar');
  if (barra) {
    if (barra.dataset.solida === 'always') {
      barra.classList.add('solida');
    } else {
      const alScroll = () => barra.classList.toggle('solida', scrollY > innerHeight * 0.62);
      addEventListener('scroll', alScroll, { passive: true });
      alScroll();
    }
  }

  /* --- Menú móvil -----------------------------------------------------
     Por debajo de 1000px la navegación se pliega tras un botón. Antes se
     ocultaba sin más y el único enlace visible era el CTA de la cabecera;
     al retirar ese botón habría quedado un móvil sin forma de navegar. */
  const btnMenu = document.querySelector('.menu-btn');
  if (btnMenu && barra) {
    const abrir = (si) => {
      barra.classList.toggle('abierta', si);
      btnMenu.setAttribute('aria-expanded', si ? 'true' : 'false');
    };
    btnMenu.addEventListener('click', () => abrir(!barra.classList.contains('abierta')));
    // Escape cierra; el foco vuelve al botón para no perderlo dentro del panel.
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && barra.classList.contains('abierta')) { abrir(false); btnMenu.focus(); }
    });
    // Un clic fuera cierra. Navegar a otra página ya recarga la barra.
    document.addEventListener('click', e => {
      if (barra.classList.contains('abierta') && !barra.contains(e.target)) abrir(false);
    });
    // Si se pasa a escritorio con el panel abierto, la clase sobra.
    matchMedia('(min-width:1001px)').addEventListener('change', e => { if (e.matches) abrir(false); });
  }

  /* --- Revelado por scroll: respaldo para Safari ----------------------
     El revelado principal es CSS puro (animation-timeline: view()), pero
     Safari no lo soporta: allí la web no animaba NADA al hacer scroll.
     Este respaldo replica el mismo gesto (fundido + subida, con cascada
     por columnas en las rejillas) con IntersectionObserver. Solo se
     enciende donde falta el soporte nativo y nunca con movimiento
     reducido. Si este JS no corre, el contenido se ve: el estado oculto
     lo activa la clase .rv-js que pone este mismo código. */
  if (!(window.CSS && CSS.supports('animation-timeline: view()'))
      && !matchMedia('(prefers-reduced-motion: reduce)').matches
      && 'IntersectionObserver' in window) {
    const objetivos = [];
    document.querySelectorAll('.rv').forEach(el => {
      const cols = el.classList.contains('areas-flip') ? 3
                 : el.classList.contains('areas') ? 4
                 : el.classList.contains('galeria-caso') ? 3
                 : (el.classList.contains('faq') || el.classList.contains('proceso')) ? 1
                 : 0;
      if (cols) {
        [...el.children].forEach((li, i) => {
          li.classList.add('rv-obs');
          li.style.setProperty('--rvi', i % cols);
          objetivos.push(li);
        });
      } else {
        el.classList.add('rv-obs');
        objetivos.push(el);
      }
    });
    document.documentElement.classList.add('rv-js');
    const io = new IntersectionObserver(entradas => entradas.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    objetivos.forEach(el => io.observe(el));
  }

  /* --- Las imágenes perezosas entran con fundido ----------------------
     Sin esto, una imagen lazy aparece de golpe al llegar a ella y se
     percibe como lentitud. Con el fundido, la carga se lee como una
     decisión y no como un retraso. Solo se marca la imagen que aún no
     está cargada: la que viene de caché no parpadea. */
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (img.complete) return;
    img.classList.add('img-espera');
    const lista = () => img.classList.add('img-lista');
    img.addEventListener('load', lista, { once: true });
    img.addEventListener('error', lista, { once: true });
  });

  /* --- Carrusel de celebraciones reales -------------------------------
     Cada diapositiva es una boda entera. Las flechas pasan de una a otra,
     la cuenta se actualiza sola y en los extremos se deshabilitan: nada de
     dar vueltas sin avisar. El desplazamiento lo hace el navegador
     (scroll-snap); si este JS no corre, se sigue pudiendo pasar con el
     dedo o con la rueda. */
  document.querySelectorAll('.caso-diapo').forEach(caso => {
    const tira = caso.querySelector('.galeria-caso');
    const nav = caso.querySelector('.casos-nav');
    if (!tira || !nav) return;
    const laminas = [...tira.querySelectorAll('.lamina-caso')];
    const prev = nav.querySelector('.c-prev');
    const next = nav.querySelector('.c-next');
    const cuenta = nav.querySelector('.casos-cuenta b');
    const dos = n => String(n).padStart(2, '0');

    // Índice objetivo PROPIO. No se lee de la posición del scroll: por eso
    // varios clics rápidos y seguidos avanzan de uno en uno, sin atascarse ni
    // saltar de golpe. El navegador reorienta la animación suave a cada clic.
    let pos = 0;
    const orig = () => laminas[0] ? laminas[0].offsetLeft : 0;
    // Último índice al que se puede llegar de verdad (cuando varias láminas
    // caben a la vez, el scroll topa antes de la última).
    const maxPos = () => {
      const ms = tira.scrollWidth - tira.clientWidth;
      let m = 0;
      laminas.forEach((l, i) => { if (l.offsetLeft - orig() <= ms + 2) m = i; });
      return m;
    };
    // Lámina más cercana al borde de la tira (para el dedo y la rueda).
    const cercano = () => {
      const x = tira.getBoundingClientRect().left;
      let mejor = 0, min = Infinity;
      laminas.forEach((l, i) => {
        const d = Math.abs(l.getBoundingClientRect().left - x);
        if (d < min) { min = d; mejor = i; }
      });
      return mejor;
    };
    const marca = () => {
      pos = Math.max(0, Math.min(maxPos(), pos));
      if (cuenta) cuenta.textContent = dos(pos + 1);
      prev.disabled = pos <= 0;
      next.disabled = pos >= maxPos();
    };
    const ir = i => {
      pos = Math.max(0, Math.min(maxPos(), i));
      const l = laminas[pos];
      if (l) tira.scrollTo({ left: l.offsetLeft - orig(), behavior: 'smooth' });
      marca();
    };
    prev.addEventListener('click', () => ir(pos - 1));
    next.addEventListener('click', () => ir(pos + 1));
    tira.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(pos - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(pos + 1); }
    });
    // Al pasar con el dedo o la rueda, el objetivo se pone al día con lo que
    // se ve, sin pelearse con una animación de clic en curso.
    let t;
    tira.addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => { pos = cercano(); marca(); }, 110);
    }, { passive: true });
    addEventListener('resize', marca);
    // Las fotos son perezosas: al arrancar, la tira aún no mide lo que medirá.
    // Se recalcula el estado cuando cada imagen llega y cuando cambia de tamaño.
    tira.querySelectorAll('img').forEach(img => {
      if (!img.complete) img.addEventListener('load', marca, { once: true });
    });
    if (window.ResizeObserver) new ResizeObserver(marca).observe(tira);
    marca();
  });

  /* --- Galería de celebraciones reales -------------------------------
     La tira se mueve con las flechas (además de rueda y dedo), y cada
     lámina abre un visor <dialog> nativo: Escape cierra solo, el aspa y
     el fondo también, y las flechas del teclado pasan de lámina.
     Sin JS, la tira sigue siendo desplazable y las fotos se ven igual:
     solo se pierde la ampliación. */
  const galerias = [...document.querySelectorAll('.galeria-caso')];
  if (galerias.length && window.HTMLDialogElement) {
    const visor = document.createElement('dialog');
    visor.className = 'visor';
    const FL = '<svg class="fl" viewBox="0 0 34 13" fill="none" aria-hidden="true">' +
      '<path d="M1 6.5h31.5M26.5 1l6 5.5-6 5.5" stroke="currentColor" stroke-width="1.4" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    visor.innerHTML =
      '<div class="caja-visor"><img alt=""></div>' +
      '<button class="v-cerrar" type="button" aria-label="Cerrar">&#10005;</button>' +
      '<button class="v-prev" type="button" aria-label="Anterior">' + FL + '</button>' +
      '<button class="v-next" type="button" aria-label="Siguiente">' + FL + '</button>';
    document.body.appendChild(visor);
    const grande = visor.querySelector('img');
    // El visor se ciñe a la boda desde la que se abre: las flechas recorren
    // SOLO las láminas de esa celebración, no las de todas las bodas.
    let grupo = [], actual = 0;

    // Precarga en segundo plano: al pulsar la flecha, la vecina ya está en
    // caché y el cambio es instantáneo. Un objeto Image por URL basta.
    const cache = new Map();
    const precarga = url => {
      if (!url || cache.has(url)) return;
      const im = new Image(); im.src = url; cache.set(url, im);
    };

    const muestra = i => {
      actual = (i + grupo.length) % grupo.length;
      const b = grupo[actual];
      const url = b.dataset.full;
      grande.alt = b.querySelector('img') ? b.querySelector('img').alt : '';
      precarga(url);
      const im = cache.get(url);
      // No se enseña la foto anterior mientras carga la nueva: el src cambia
      // SOLO cuando la imagen está lista (si ya está en caché, al vuelo). El
      // guard evita que una carga tardía pise a una flecha más reciente.
      const poner = () => { if (grupo[actual] === b) { grande.src = url; grande.style.opacity = ''; } };
      if (im.complete) { poner(); }
      else {
        grande.style.opacity = '0';
        im.addEventListener('load', poner, { once: true });
        im.addEventListener('error', poner, { once: true });
      }
      // Deja listas las dos vecinas de la MISMA boda.
      precarga(grupo[(actual - 1 + grupo.length) % grupo.length].dataset.full);
      precarga(grupo[(actual + 1) % grupo.length].dataset.full);
    };
    galerias.forEach(g => {
      const botones = [...g.querySelectorAll('.ampliar')];
      botones.forEach((b, i) => {
        // Al acercar el cursor, se va cargando la versión grande: abrir es al vuelo.
        b.addEventListener('pointerenter', () => precarga(b.dataset.full), { once: true });
        b.addEventListener('click', () => { grupo = botones; muestra(i); visor.showModal(); });
      });
    });
    visor.querySelector('.v-cerrar').addEventListener('click', () => visor.close());
    visor.querySelector('.v-prev').addEventListener('click', () => muestra(actual - 1));
    visor.querySelector('.v-next').addEventListener('click', () => muestra(actual + 1));
    // Clic en el fondo (el propio dialog, no sus hijos) cierra.
    visor.addEventListener('click', e => { if (e.target === visor) visor.close(); });
    visor.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') muestra(actual - 1);
      if (e.key === 'ArrowRight') muestra(actual + 1);
    });
  }

  /* --- Año del pie ---------------------------------------------------- */
  const anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  /* --- Tarjetas que giran --------------------------------------------
     En escritorio el giro va con :hover y con teclado con :focus-within,
     los dos en CSS. En un móvil no hay ninguno de los dos: un toque alterna
     la clase. Solo se engancha en punteros sin hover para no dejar tarjetas
     volteadas al hacer clic con el ratón, que ya reacciona al pasar por encima. */
  if (matchMedia('(hover: none)').matches) {
    document.querySelectorAll('.areas-flip .carta').forEach(carta => {
      carta.addEventListener('click', () => carta.classList.toggle('volteada'));
    });
  }

  /* --- Analítica ------------------------------------------------------
     No se instala ninguna plataforma. Se emite un CustomEvent y, si en el
     futuro existe dataLayer o gtag, se reenvía. Sin dependencias.      */
  const medir = (nombre, extra = {}) => {
    dispatchEvent(new CustomEvent('varenza:evento', { detail: { nombre, ...extra } }));
    if (window.dataLayer) window.dataLayer.push({ event: nombre, ...extra });
    else if (typeof window.gtag === 'function') window.gtag('event', nombre, extra);
  };
  document.querySelectorAll('[data-ev]').forEach(el => {
    el.addEventListener('click', () => medir(el.dataset.ev), { passive: true });
  });

  /* --- Formulario -----------------------------------------------------
     Validación en el cliente sobre la nativa: mensajes en castellano,
     foco en el primer campo con error y estado de envío visible.
     El atributo novalidate desactiva los globos del navegador; la
     validación real la sigue haciendo el servidor.                     */
  const form = document.getElementById('f-consulta');
  if (!form) return;

  /* --- Preselección por URL (?tipo=...) -------------------------------
     Los CTA de las páginas de servicio llegan con ?tipo= (p. ej.
     contacto.html?tipo=deportivo). Solo se aceptan los valores de esta
     lista, el valor se asigna por la API del select —nunca se inserta
     como HTML— y un valor desconocido se ignora sin romper nada. La
     opción puede cambiarse a mano después: esto solo fija el inicial. */
  const selTipo = form.querySelector('#c-tipo');
  if (selTipo) {
    const TIPOS = { boda: 'Boda', privado: 'Evento privado', deportivo: 'Evento deportivo', otro: 'Otro' };
    let pedido = null;
    try { pedido = new URLSearchParams(location.search).get('tipo'); } catch (e) { /* sin soporte, sin preselección */ }
    const valor = pedido && TIPOS[pedido.trim().toLowerCase()];
    if (valor && [...selTipo.options].some(o => o.value === valor)) selTipo.value = valor;

    /* En un evento deportivo se habla de participantes, no de invitados,
       y la ayuda del mensaje orienta hacia la actividad y la entidad.
       Al volver a otro tipo, todo recupera su texto de siempre. */
    const etiquetaInv = form.querySelector('label[for="c-invitados"]');
    const ayudaMsg = document.getElementById('a-msg');
    const ajustarDeportivo = () => {
      const dep = selTipo.value === 'Evento deportivo';
      if (etiquetaInv) etiquetaInv.textContent = dep ? 'Número aproximado de participantes' : 'Número aproximado de invitados';
      if (ayudaMsg) ayudaMsg.hidden = !dep;
    };
    selTipo.addEventListener('change', ajustarDeportivo);
    ajustarDeportivo();
  }

  const estado = document.getElementById('f-estado');
  const boton = form.querySelector('button[type="submit"]');
  let iniciado = false;

  const errorDe = campo => {
    const id = campo.getAttribute('aria-describedby');
    if (!id) return null;
    return id.split(' ').map(x => document.getElementById(x))
             .find(el => el && el.classList.contains('error')) || null;
  };

  const marcar = (campo, malo) => {
    const err = errorDe(campo);
    campo.setAttribute('aria-invalid', malo ? 'true' : 'false');
    if (err) err.hidden = !malo;
  };

  const valido = campo => {
    if (campo.type === 'checkbox') return campo.checked;
    if (!campo.value.trim()) return !campo.required;
    if (campo.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(campo.value.trim());
    if (campo.type === 'number') {
      const n = Number(campo.value);
      return Number.isFinite(n) && n >= 1 && n <= 2000;
    }
    return true;
  };

  const campos = [...form.querySelectorAll('[required]')];

  // Revalidar al salir del campo, no mientras se escribe: corregir a
  // alguien en mitad de una palabra es hostil.
  campos.forEach(c => {
    c.addEventListener('blur', () => { if (c.value || c.type === 'checkbox') marcar(c, !valido(c)); });
    c.addEventListener('input', () => { if (c.getAttribute('aria-invalid') === 'true') marcar(c, !valido(c)); });
    c.addEventListener('focus', () => {
      if (!iniciado) { iniciado = true; medir('form-start'); }
    }, { once: true });
  });

  form.addEventListener('submit', async e => {
    const malos = campos.filter(c => !valido(c));
    malos.forEach(c => marcar(c, true));
    campos.filter(c => valido(c)).forEach(c => marcar(c, false));

    if (malos.length) {
      e.preventDefault();
      estado.hidden = false;
      estado.dataset.tipo = 'error';
      estado.textContent = malos.length === 1
        ? 'Falta un dato por revisar.'
        : `Faltan ${malos.length} datos por revisar.`;
      malos[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      malos[0].focus({ preventScroll: true });
      return;
    }

    // Sin fetch o sin endpoint AJAX declarado, se deja seguir el envío
    // nativo: FormSubmit redirige a _next y la web funciona igual.
    const ajax = form.dataset.ajax;
    if (!ajax || typeof fetch !== 'function') {
      boton.setAttribute('aria-busy', 'true');
      boton.querySelector('.txt').textContent = 'Enviando…';
      estado.hidden = false;
      estado.dataset.tipo = 'ok';
      estado.textContent = 'Enviando tu consulta…';
      medir('form-submit');
      return;
    }

    // Con fetch, el envío se hace aquí para que un fallo del servidor no
    // se lleve a la persona a una página de error con el formulario ya
    // perdido: si algo va mal, se queda donde está y puede reintentar.
    e.preventDefault();
    boton.setAttribute('aria-busy', 'true');
    boton.disabled = true;
    const txt = boton.querySelector('.txt');
    const textoOriginal = txt.textContent;
    txt.textContent = 'Enviando…';
    estado.hidden = false;
    estado.dataset.tipo = 'ok';
    estado.textContent = 'Enviando tu consulta…';
    medir('form-submit');

    try {
      const r = await fetch(ajax, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const datos = await r.json().catch(() => ({}));
      if (datos.success === 'false' || datos.success === false) throw new Error(datos.message || 'rechazado');
      location.href = 'gracias.html';
    } catch (err) {
      // Un fallo de red o una petición cortada por el navegador o un bloqueador
      // lanza TypeError. En ese caso se reintenta con el envío NATIVO del
      // formulario (una navegación normal, que casi ningún filtro bloquea): así
      // entrega aunque en ese móvil el fetch en segundo plano no funcione, y
      // FormSubmit redirige luego a gracias.html.
      if (err instanceof TypeError) { form.submit(); return; }
      boton.removeAttribute('aria-busy');
      boton.disabled = false;
      txt.textContent = textoOriginal;
      estado.dataset.tipo = 'error';
      estado.textContent = 'No hemos podido enviar la consulta. Inténtalo otra vez en un momento o escríbenos directamente por correo.';
      estado.focus?.();
    }
  });
})();
