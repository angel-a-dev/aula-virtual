/* ARCHIVO: js/curso.js */

document.addEventListener('DOMContentLoaded', () => {
    protegerRuta();
    const usuario = obtenerUsuarioActivo();
    if(!usuario) return;

    // Header y Usuario
    document.getElementById('header-user-name').textContent = usuario.nombre;
    document.getElementById('header-user-role').textContent = usuario.rol;
    if (usuario.foto) document.getElementById('header-user-avatar').src = usuario.foto;

    const urlParams = new URLSearchParams(window.location.search);
    const cursoId = urlParams.get('id');
    const cursos = obtenerDatos('cursos') || [];
    const cursoActual = cursos.find(c => c.id === cursoId);
    const contenedor = document.getElementById('curso-info-container');

    if (!cursoActual) {
        contenedor.innerHTML = `<h2 style="color: var(--rojo-error);">Error: El curso no existe.</h2>`;
        return;
    }

    // 1. Inyectamos las Pestañas (AHORA INCLUYE CUESTIONARIOS)
    contenedor.innerHTML = `
        <div class="curso-banner">
            <h1>${cursoActual.nombre}</h1>
            <p>Código: ${cursoActual.codigo} | Horario: ${cursoActual.horario}</p>
        </div>
        <div class="curso-tabs">
            <button class="tab-btn active" id="btn-tab-inicio">Inicio</button>
            <button class="tab-btn" id="btn-tab-materiales">Materiales</button>
            <button class="tab-btn" id="btn-tab-tareas">Tareas</button>
            <button class="tab-btn" id="btn-tab-cuestionarios">Cuestionarios</button>
            <button class="tab-btn" id="btn-tab-participantes">Participantes</button>
        </div>
        <div id="tab-content" style="background-color: var(--blanco); padding: 20px; border-radius: var(--borde-radio); box-shadow: var(--sombra-card);"></div>
    `;

    const tabContent = document.getElementById('tab-content');

    function actualizarPestañaActiva(botonActivo) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        botonActivo.classList.add('active');
    }

    // --- VISTAS BÁSICAS ---
    function renderizarInicio() { tabContent.innerHTML = `<h3>Novedades</h3><p>Anuncios del curso aquí.</p>`; }
    function renderizarMateriales() { tabContent.innerHTML = `<h3>Materiales</h3><p>Archivos de clase aquí.</p>`; }
    function renderizarParticipantes() { tabContent.innerHTML = `<h3>Participantes</h3><p>Lista de alumnos aquí.</p>`; }

    // --- VISTA TAREAS (La que hicimos en el Módulo 6) ---
    function renderizarTareas() {
        const tareasDB = obtenerDatos('tareas') || [];
        const tareasCurso = tareasDB.filter(t => t.cursoId === cursoActual.id);
        let htmlTareas = '';

        if(tareasCurso.length === 0) {
            htmlTareas = '<p style="color: var(--gris-texto);">No hay tareas asignadas aún.</p>';
        } else {
            tareasCurso.forEach(tarea => {
                let estadoEntrega = ''; let botonAccion = '';
                if (usuario.rol === 'alumno') {
                    const miEntrega = tarea.entregas.find(e => e.alumnoId === usuario.id);
                    if (miEntrega) {
                        estadoEntrega = `<span class="badge" style="background-color: var(--verde-exito); color: white;">Entregado</span>`;
                        botonAccion = `<button class="btn-primary" disabled style="background-color: var(--gris-borde); color: var(--gris-texto);">Enviado</button>`;
                    } else {
                        estadoEntrega = `<span class="badge" style="background-color: var(--rojo-error); color: white;">Pendiente</span>`;
                        botonAccion = `<button class="btn-primary" onclick="abrirModalEntrega('${tarea.id}')">Entregar Trabajo</button>`;
                    }
                } else {
                    estadoEntrega = `<span style="font-size: 13px; font-weight: bold; color: var(--azul-claro);">Han entregado: ${tarea.entregas.length}</span>`;
                    botonAccion = `<button class="btn-primary" onclick="alert('Próximamente calificar')">Ver Entregas</button>`;
                }

                htmlTareas += `
                    <div style="border: 1px solid var(--gris-borde); padding: 20px; border-radius: var(--borde-radio); margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div><h4 style="color: var(--azul-oscuro); font-size: 18px; margin-bottom: 5px;">${tarea.titulo}</h4></div>
                            ${estadoEntrega}
                        </div>
                        <div style="text-align: right;">${botonAccion}</div>
                    </div>
                `;
            });
        }
        tabContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: var(--azul-oscuro);">Evaluaciones Escritas</h3>
                ${usuario.rol === 'profesor' ? `<button class="btn-primary" onclick="abrirModalTarea()">+ Nueva Tarea</button>` : ''}
            </div>
            ${htmlTareas}
        `;
    }

    // --- NUEVA VISTA: CUESTIONARIOS ---
    function renderizarCuestionarios() {
        const cuestDB = obtenerDatos('cuestionarios') || [];
        const cuestCurso = cuestDB.filter(c => c.cursoId === cursoActual.id);
        let htmlCuest = '';

        if(cuestCurso.length === 0) {
            htmlCuest = '<p style="color: var(--gris-texto);">No hay exámenes programados.</p>';
        } else {
            cuestCurso.forEach(cuest => {
                let estadoExamen = ''; let botonAccion = '';

                if (usuario.rol === 'alumno') {
                    // Verificamos si el alumno ya dio el examen
                    const miResolucion = cuest.resoluciones.find(r => r.alumnoId === usuario.id);
                    if (miResolucion) {
                        // Si ya lo dio, mostramos su nota
                        const colorNota = miResolucion.nota >= 11 ? 'var(--verde-exito)' : 'var(--rojo-error)';
                        estadoExamen = `<span style="font-size: 16px; font-weight: bold; color: ${colorNota};">Nota: ${miResolucion.nota} / 20</span>`;
                        botonAccion = `<button class="btn-primary" disabled style="background-color: var(--gris-borde); color: var(--gris-texto);">Examen Finalizado</button>`;
                    } else {
                        estadoExamen = `<span class="badge" style="background-color: var(--rojo-error); color: white;">Pendiente</span>`;
                        // Pasamos todos los datos del examen a la función para armar el modal
                        botonAccion = `<button class="btn-primary" onclick="abrirModalResolver('${cuest.id}', '${cuest.titulo}', '${cuest.pregunta}', '${cuest.optA}', '${cuest.optB}', '${cuest.correcta}')">Rendir Examen</button>`;
                    }
                } else if (usuario.rol === 'profesor') {
                    estadoExamen = `<span style="font-size: 13px; font-weight: bold; color: var(--azul-claro);">Han resuelto: ${cuest.resoluciones.length} alumnos</span>`;
                    botonAccion = `<button class="btn-primary" onclick="alert('Próximamente: Ver Notas')">Ver Resultados</button>`;
                }

                htmlCuest += `
                    <div style="border: 1px solid var(--gris-borde); padding: 20px; border-radius: var(--borde-radio); margin-bottom: 15px; background-color: #f8fafc;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4 style="color: var(--azul-oscuro); font-size: 18px; margin-bottom: 5px;">📝 ${cuest.titulo}</h4>
                                <p style="font-size: 12px; color: var(--gris-texto);">Examen de Opción Múltiple</p>
                            </div>
                            <div style="text-align: right; display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
                                ${estadoExamen}
                                ${botonAccion}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        tabContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: var(--azul-oscuro);">Exámenes Rápidos</h3>
                ${usuario.rol === 'profesor' ? `<button class="btn-primary" onclick="abrirModalCuestionario()">+ Crear Examen</button>` : ''}
            </div>
            ${htmlCuest}
        `;
    }

    // 2. Eventos de las Pestañas
    document.getElementById('btn-tab-inicio').addEventListener('click', function() { actualizarPestañaActiva(this); renderizarInicio(); });
    document.getElementById('btn-tab-materiales').addEventListener('click', function() { actualizarPestañaActiva(this); renderizarMateriales(); });
    document.getElementById('btn-tab-tareas').addEventListener('click', function() { actualizarPestañaActiva(this); renderizarTareas(); });
    document.getElementById('btn-tab-cuestionarios').addEventListener('click', function() { actualizarPestañaActiva(this); renderizarCuestionarios(); });
    document.getElementById('btn-tab-participantes').addEventListener('click', function() { actualizarPestañaActiva(this); renderizarParticipantes(); });

    renderizarInicio();

    // ==========================================
    // LÓGICA: GUARDAR NUEVO CUESTIONARIO (Profesor)
    // ==========================================
    const formNuevoCuestionario = document.getElementById('formNuevoCuestionario');
    if(formNuevoCuestionario) {
        formNuevoCuestionario.addEventListener('submit', (e) => {
            e.preventDefault();
            const cuestDB = obtenerDatos('cuestionarios') || [];
            
            cuestDB.push({
                id: generarID('EXM'),
                cursoId: cursoActual.id,
                titulo: document.getElementById('cuestTitulo').value,
                pregunta: document.getElementById('cuestPregunta').value,
                optA: document.getElementById('cuestOptA').value,
                optB: document.getElementById('cuestOptB').value,
                correcta: document.getElementById('cuestRespuesta').value, // "A" o "B"
                resoluciones: [] // Quienes lo han resuelto
            });

            guardarDatos('cuestionarios', cuestDB);
            cerrarModalCuestionario();
            renderizarCuestionarios();
        });
    }

    // ==========================================
    // LÓGICA: CALIFICAR CUESTIONARIO (Alumno)
    // ==========================================
    const formResolverCuestionario = document.getElementById('formResolverCuestionario');
    if(formResolverCuestionario) {
        formResolverCuestionario.addEventListener('submit', (e) => {
            e.preventDefault();
            const examenId = document.getElementById('resolverCuestId').value;
            const respuestaCorrecta = document.getElementById('resolverRespuestaCorrecta').value;
            
            // Obtenemos qué opción seleccionó el alumno en los Radio Buttons
            const opcionSeleccionada = document.querySelector('input[name="opcionRespuesta"]:checked').value;

            // Motor de calificación: Si acertó, 20. Si falló, 0.
            const notaFinal = (opcionSeleccionada === respuestaCorrecta) ? 20 : 0;

            const cuestDB = obtenerDatos('cuestionarios') || [];
            const indexExamen = cuestDB.findIndex(c => c.id === examenId);

            if(indexExamen !== -1) {
                cuestDB[indexExamen].resoluciones.push({
                    alumnoId: usuario.id,
                    respuestaMarcada: opcionSeleccionada,
                    nota: notaFinal,
                    fecha: new Date().toLocaleDateString()
                });
                
                guardarDatos('cuestionarios', cuestDB);
                cerrarModalResolver();
                
                // Le avisamos al alumno su nota al instante
                alert(`Examen enviado. Tu calificación es: ${notaFinal}/20`);
                renderizarCuestionarios(); // Actualiza la pestaña para mostrar la nota
            }
        });
    }

    // Lógicas previas de Tareas (se mantienen para que todo siga funcionando)
    const formNuevaTarea = document.getElementById('formNuevaTarea');
    if(formNuevaTarea) {
        formNuevaTarea.addEventListener('submit', (e) => {
            e.preventDefault();
            const tareasDB = obtenerDatos('tareas') || [];
            tareasDB.push({ id: generarID('TAR'), cursoId: cursoActual.id, titulo: document.getElementById('tareaTitulo').value, descripcion: document.getElementById('tareaDesc').value, fechaLimite: document.getElementById('tareaFecha').value, entregas: [] });
            guardarDatos('tareas', tareasDB);
            cerrarModalTarea(); renderizarTareas(); 
        });
    }
    const formEntregarTarea = document.getElementById('formEntregarTarea');
    if(formEntregarTarea) {
        formEntregarTarea.addEventListener('submit', (e) => {
            e.preventDefault();
            const tareaId = document.getElementById('entregaTareaId').value;
            const archivoInput = document.getElementById('entregaArchivo').files[0]; 
            if(!archivoInput) return;
            const tareasDB = obtenerDatos('tareas') || [];
            const index = tareasDB.findIndex(t => t.id === tareaId);
            if(index !== -1) {
                tareasDB[index].entregas.push({ alumnoId: usuario.id, archivo: archivoInput.name, fechaEntrega: new Date().toLocaleDateString(), nota: null });
                guardarDatos('tareas', tareasDB); cerrarModalEntrega(); renderizarTareas(); 
            }
        });
    }
});

// --- FUNCIONES GLOBALES DE MODALES ---
function abrirModalTarea() { document.getElementById('modalNuevaTarea').style.display = 'flex'; }
function cerrarModalTarea() { document.getElementById('modalNuevaTarea').style.display = 'none'; document.getElementById('formNuevaTarea').reset(); }
function abrirModalEntrega(tareaId) { document.getElementById('entregaTareaId').value = tareaId; document.getElementById('modalEntregarTarea').style.display = 'flex'; }
function cerrarModalEntrega() { document.getElementById('modalEntregarTarea').style.display = 'none'; document.getElementById('formEntregarTarea').reset(); }

function abrirModalCuestionario() { document.getElementById('modalNuevoCuestionario').style.display = 'flex'; }
function cerrarModalCuestionario() { document.getElementById('modalNuevoCuestionario').style.display = 'none'; document.getElementById('formNuevoCuestionario').reset(); }

// Esta función prepara el examen con los datos específicos de la pregunta a la que se le dio clic
function abrirModalResolver(id, titulo, pregunta, optA, optB, correcta) {
    document.getElementById('resolverCuestId').value = id;
    document.getElementById('resolverRespuestaCorrecta').value = correcta;
    document.getElementById('resolverTitulo').textContent = titulo;
    document.getElementById('resolverPregunta').textContent = pregunta;
    document.getElementById('labelOptA').textContent = optA;
    document.getElementById('labelOptB').textContent = optB;
    
    document.getElementById('modalResolverCuestionario').style.display = 'flex';
}
function cerrarModalResolver() { 
    document.getElementById('modalResolverCuestionario').style.display = 'none'; 
    document.getElementById('formResolverCuestionario').reset(); 
}
/* --- Al final de js/curso.js --- */

function abrirModalTarea() { 
    const modal = document.getElementById('modalNuevaTarea');
    if(modal) {
        modal.style.display = 'flex'; 
    } else {
        console.error("El modal 'modalNuevaTarea' no existe en el HTML.");
    }
}

function cerrarModalTarea() { 
    const modal = document.getElementById('modalNuevaTarea');
    if(modal) {
        modal.style.display = 'none'; 
        document.getElementById('formNuevaTarea').reset(); 
    }
}

// Asegúrate de que el botón de publicar tenga el listener
document.getElementById('formNuevaTarea')?.addEventListener('submit', function(e) {
    e.preventDefault();
    // Aquí iría tu lógica para guardar la tarea en localStorage
    console.log("Tarea guardada...");
    cerrarModalTarea();
});