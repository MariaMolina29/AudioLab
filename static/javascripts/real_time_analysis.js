let audio_context
let processor_node
let stream
let socket
let custom_locale = {
    dictionary: {
        'Zoom': 'Acercar',
        'Pan': 'Desplazar',
        'Autoscale': 'Restablecer',
        'Toggle Spike Lines': 'Guías de Eje',
        'Turntable rotation': 'Rotación',
        'Reset camera to last save': 'Restablecer cámara',
        'Download plot as a png': 'Descargar gráfico como PNG',
        'Produced with Plotly': 'Producido con Plotly'
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    let start_recording_button = document.getElementById('start_recording');
    let stop_recording_button = document.getElementById('stop_recording');
    let save_and_load_button = document.getElementById('save_and_load_button');
    let formats_checkbox = document.getElementById('formats_checkbox');

    Plotly.newPlot('oscilogram', [], { title: "Esperando Datos...", dragmode: false, font: {family: 'Helvetica Neue'}}, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtons: [['zoom2d', 'pan2d', 'autoScale2d', 'toImage', 'toggleSpikelines']], locale: 'custom', locales: { custom: custom_locale } });
    Plotly.newPlot('spectrogram', [], { title: "Esperando Datos...", dragmode: false, font: {family: 'Helvetica Neue'} }, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtons: [['zoom2d', 'pan2d', 'autoScale2d', 'toImage', 'toggleSpikelines']], locale: 'custom', locales: { custom: custom_locale } });
    Plotly.newPlot('intensity', [], { title: "Esperando Datos...", dragmode: false, font: {family: 'Helvetica Neue'} }, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtons: [['zoom2d', 'pan2d', 'autoScale2d', 'toImage', 'toggleSpikelines']], locale: 'custom', locales: { custom: custom_locale } });
    
    await confirm_cookies();
    socket = io();
    socket.on('connect', () => {
        console.log("Conectado al servidor Flask-SocketIO");
    });
    socket.on("disconnect", () => {
        console.log("Desconectado del servidor Flask-SocketIO");
    });
    document.getElementById('tutorial_real_time').addEventListener('click', () => tutorial_real_time(save_and_load_button))
    start_recording_button.addEventListener('click', () => start_recording(start_recording_button, stop_recording_button, save_and_load_button, formats_checkbox))
    stop_recording_button.addEventListener('click', () => stop_recording(start_recording_button, stop_recording_button, save_and_load_button, formats_checkbox))
    save_and_load_button.addEventListener('click', () => save_and_load())

    socket.on("plot_data_real_time", (plot_data) => { update_graphs(plot_data, formats_checkbox) });

});

async function start_recording(start_recording_button, stop_recording_button, save_and_load_button, formats_checkbox) {
    start_recording_button.disabled = true;
    stop_recording_button.disabled = true;
    save_and_load_button.style.display = 'none';
    try {
        // 1. Solicitar acceso al micrófono del usuario
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let response = await emit_message('start_recording');
        // 2. Crear el contexto de audio
        audio_context = new AudioContext({  sampleRate: 16000 });
        socket.emit('set_sample_rate', { sample_rate: audio_context.sampleRate });

        // 3. Cargar el Worklet (archivo `processor.js`) al contexto de audio
        await audio_context.audioWorklet.addModule("/static/javascripts/processor.js");
        sweet_toast("Grabación iniciada")
        // 4. Crear una fuente de audio a partir del micrófono
        let source = audio_context.createMediaStreamSource(stream);

        // 5. Crear un nodo del Worklet que utilice el procesador definido en `processor.js`
        let processor_node = new AudioWorkletNode(audio_context, "audio-processor");

        // 6. Conectar la fuente al nodo del procesador y luego al destino (altavoces)
        source.connect(processor_node);
        processor_node.connect(audio_context.destination);

        // 7. Enviar datos desde el procesador al servidor Flask-SocketIO
        let buffer = [];
        let total_samples = 0;
        let buffer_size = Math.floor(audio_context.sampleRate * 0.2)
        stop_recording_button.disabled = false;
        processor_node.port.onmessage = (event) => {
            let audio_data = event.data;
            let float_array = new Float32Array(audio_data);


            // Acumular los datos en el buffer temporal
            buffer.push(...float_array);
            // Verificar si el buffer ha alcanzado un tamaño específico antes de enviarlo
            if (buffer.length >= buffer_size) {
                // Enviar los datos de audio acumulados al servidor Flask-SocketIO
                socket.emit("audio_data", new Float32Array(buffer).buffer);
                total_samples += 1
                // Vaciar el buffer después de enviar los datos
                buffer = [];
            }
            if (total_samples == 150) {
                stop_recording(start_recording_button, stop_recording_button, save_and_load_button, formats_checkbox);  // Llamar a la función para detener la grabación
                sweet_alert("Límite de grabación alcanzado", "La grabación se ha detenido porque se alcanzó el límite de 30 segundos. Por favor, guarde y cargue los datos o inicie una nueva grabación.", "warning", "OK", undefined, true, false);

            }
        };
    } catch (err) {
        if (!stream) {
            sweet_alert("Permiso denegado", "El acceso al micrófono ha sido rechazado. Por favor, permita el uso del micrófono para grabar audio.", "error", "OK", undefined, true, false);
        }
        console.log("Error al acceder al micrófono:", err);
        start_recording_button.disabled = false;
    }
}

function stop_recording(start_recording_button, stop_recording_button, save_and_load_button, formats_checkbox) {
    start_recording_button.disabled = true;
    stop_recording_button.disabled = true;
    let graphDiv = document.getElementById('spectrogram');

    formats_checkbox.addEventListener('change', function (event) {
        show_spinner()
        setTimeout(() => {
            graphDiv.data.forEach((trace, index) => {
                if (trace.name && trace.name.includes('Formante')) {
                    Plotly.restyle(graphDiv, { visible: formats_checkbox.checked ? true : false }, [index]);
                }
            });
            hide_spinner()
        }, 100)

    })

    if (processor_node) {
        // Desconectar el procesador de audio
        processor_node.onaudioprocess = null;
        processor_node.disconnect();
        processor_node = null
    }
    if (audio_context) {
        // Cerrar el contexto de audio
        audio_context.close();
        audio_context = null
    }
    if (stream) {
        // Detener todos los tracks del flujo de audio
        stream.getTracks().forEach((track) => track.stop());
        stream = null
        sweet_toast("Grabación detenida")

    }
    start_recording_button.disabled = false; // Habilitar botón de iniciar
    save_and_load_button.style.display = 'inline-block';
}

function update_graphs(plot_data, formats_checkbox) {
    let parsed_data = JSON.parse(plot_data);
    // Actualizar el oscilograma y la intensidad
    Plotly.react('oscilogram', parsed_data.trace_oscilogram, parsed_data.layout_oscilogram);
    Plotly.react('intensity', parsed_data.trace_intensity, parsed_data.layout_intensity);

    // Filtrar los formantes si el checkbox no está marcado
    if (!formats_checkbox.checked) {
        parsed_data.trace_spectrogram = parsed_data.trace_spectrogram.filter(trace => !trace.name.startsWith('Formante'));
    }
    // Actualizar el espectrograma
    Plotly.react('spectrogram', parsed_data.trace_spectrogram, parsed_data.layout_spectrogram);
}
async function save_and_load() {
    sweet_alert("Cargando...", `Los datos se están cargando, por favor espere.`, "warning", "", undefined, false, true);
    try {
        let response = await emit_message("save_data");
        await wait(3000);
        Swal.close();
        window.location.href = 'wav_analysis.html';
        // Aquí puedes hacer lo que quieras con la respuesta
    } catch (error) {
        sweet_alert("Grabación vacia", "Por favor, realice una grabación", "error", "OK", undefined, true, false)
    }

}
function emit_message(message) {
    return new Promise((resolve, reject) => {
        socket.emit(message)
        socket.on('handle_complete', (response) => {
            console.log('yaaa')
            if (response) {
                resolve(response);
            } else {
                reject("Error al iniciar la grabación");
            }
        });
    });
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function sweet_alert(title, text, icon, confirmButtonText, timer, showConfirmButton, loading) {
    let options = {
        title,
        text,
        icon,
        confirmButtonText,
        timer,
        showConfirmButton,
        allowOutsideClick: false,
    };

    if (loading) {
        options.didOpen = () => {
            Swal.showLoading();
        };
    }
    Swal.fire(options);
}
function sweet_toast(title){
    let Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: false,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        }
      });
      Toast.fire({
        icon: "success",
        title
    });
}
function show_spinner() {
    document.getElementById('spinner_container').classList.add('visible');  // Mostrar el spinner con opacidad
    document.getElementById('spinner').classList.add('spin_active');  // Iniciar la animación del spinner
    document.getElementById('main_content').classList.add('blur');  // Aplicar desenfoque con transición
}
function hide_spinner() {
    document.getElementById('spinner_container').classList.remove('visible');  // Ocultar el spinner
    document.getElementById('spinner').classList.remove('spin_active');  // Detener la animación del spinner
    document.getElementById('main_content').classList.remove('blur');  // Remover el desenfoque
}
function start_tour(steps) {
    // Crear una instancia de Driver
    let driver = window.driver.js.driver;

    let driverObj = driver({
        showProgress: true,
        animate: true, // Animaciones para el tour
        opacity: 0.6,  // Opacidad de fondo
        allowClose: true, // Permitir cerrar la guía
        doneBtnText: 'Finalizar', // Texto para el botón de finalización
        closeBtnText: 'Cerrar', // Texto para el botón de cierre
        nextBtnText: 'Siguiente', // Texto para el botón de siguiente
        prevBtnText: 'Anterior', // Texto para el botón de anterior
        steps: steps,
        onDestroyed: (element, step, options) => {
            document.getElementById('save_and_load_button').style.display = 'none';
        }
    });
    // Iniciar el tour
    driverObj.drive();


}
function tutorial_real_time(save_and_load_button) {
    save_and_load_button.style.display = 'inline-block';
    let steps = [
        { element: '#start_recording', popover: { title: 'Iniciar Grabación', description: 'Haga clic aquí para comenzar la grabación de audio.', side: 'bottom', align: 'center' } },
        { element: '#stop_recording', popover: { title: 'Detener y Guardar', description: 'Presione este botón para detener la grabación del audio.', side: 'bottom', align: 'center' } },
        { element: '#save_and_load_button', popover: { title: 'Guardar y Cargar', description: 'Haga clic en este botón para guardar el audio grabado y cargarlo en la aplicación.', side: 'bottom', align: 'center' } },
        { element: '.modebar-group', popover: { title: 'Controles de Gráfica', description: 'Utiliza estos controles para ajustar la visualización de la gráfica. \nPara conocer más de las funcionalidades, consulte el Manual', side: 'left', align: 'center' } },
        { element: '#formats_checkbox', popover: { title: 'Mostrar Formantes', description: 'Seleccione esta opción para mostrar los formantes en la gráfica.', side: 'right', align: 'start' } },
        { element: '.back_button_a', popover: { title: 'Regresar', description: 'Haga clic para volver a la página inicial sin guardar cambios.', side: 'bottom', align: 'center' } },
        { element: '#manual', popover: { title: 'Manual de Usuario', description: 'Para más información, consulte el Manual de Usuario', side: 'top', align: 'center' } },


    ]
    start_tour(steps)

}
async function confirm_cookies() {
    try {
        // Verificar si hay una sesión existente
        let response = await fetch('/verificar_sesion', { method: 'POST' });
        let data = await response.json();

        // Si ya hay una sesión creada, no se necesita más acción
        if (data.usuario_creado) {
            return;
        }

        // Mostrar la alerta de consentimiento de cookies si no hay sesión
        let result = await Swal.fire({
            title: "¿Desea permitir cookies?",
            text: "Esto permitirá guardar los datos de la sesión temporalmente.",
            showDenyButton: true,
            showConfirmButton: true,
            confirmButtonText: "Permitir",
            denyButtonText: "Rechazar",
            icon: "question",
            allowOutsideClick: false,

        });

        // Si el usuario acepta, crea la sesión
        if (result.isConfirmed) {
            let crearSesion = await fetch('/crear_sesion', { method: 'POST' });
            let sesionData = await crearSesion.json();
            if (sesionData.mensaje) {
                return;
            }
        } else if (result.isDenied) {
            // Si el usuario rechaza, redirige a la página de inicio
            await Swal.fire({
                title: "Permiso rechazado",
                text: "Será redirigido a la página de inicio.",
                icon: "error",
                allowOutsideClick: false
            });
            
            window.location.href = "/index.html";
        }
    } catch (error) {
        console.error("Error al verificar o crear la sesión:", error);
    }
}
