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

document.addEventListener('DOMContentLoaded', () => {
    socket = io();
    socket.on('connect', () => {
        console.log("Conectado al servidor Flask-SocketIO");
    });
    socket.on("disconnect",  () =>{
        console.log("Desconectado del servidor Flask-SocketIO");
    });
    main()
});

function main() {
    Swal.fire({
        title: 'Subir y cargar archivo',
        html: `
            <div class="custom-content">
                <label for="upload_wav" class="custom-label">Seleccionar archivo .wav</label>
                <div class="custom-file-area" id="fileArea">
                    <input type="file" id="upload_wav" class="custom-file-input" accept=".wav">
                </div>
                <div class="container_buttons">  
                    <div class="back-section">
                        <a href="index.html" class="back_button_a_alert ">
                            <i class="fa-solid fa-arrow-left"></i> Regresar
                        </a>
                    </div>
                    <div>
                        <button id="load_wav" class="custom-button">Cargar<i class="fa-solid fa-chart-line"></i></button>
                    </div>
                </div>
                <div >
            </div>
            </div>
        `,
        showConfirmButton: false,  // Puedes ocultar el botón de confirmación para manejarlo manualmente
        allowOutsideClick: true,
        iconHtml: '<i class="fa-solid fa-upload fa-beat"></i>',  // Ícono de subida de archivo con rebote
        customClass: {
            icon: 'custom-icon'
        },
        footer: `
            <div >
                <button  id="tutorial_alert" class="custom-button tutorial">
                    Ayuda<i class="fa-solid fa-question-circle"></i> 
                </button>
            </div>
        `,
        didOpen: () => {
            document.getElementById('tutorial_alert').addEventListener('click', () => tutorial_alert())
            document.getElementById('tutorial_wav').addEventListener('click', () => tutorial_wav())
            document.getElementById('tutorial_wav').addEventListener('click', () => tutorial_wav())

            socket.emit('get_processed_audio');
            socket.on('loading', () => {
                sweet_alert("Datos guardados correctamente", `Los datos se han  subido correctamente. Espere para el procesamiento.`, "success", "", undefined, false, true, null);
            });

            let upload_wav = document.getElementById('upload_wav');
            let formats_checkbox = document.getElementById('formats_checkbox');
            let audio_player = document.getElementById('audio_player');
            let download_txt = document.getElementById('download_txt');
            let download_wav = document.getElementById('download_wav');


            Plotly.newPlot('spectrogram', [], { title: "Esperando Datos...", dragmode: false }, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtons: [['zoom2d', 'pan2d', 'autoScale2d', 'toImage', 'toggleSpikelines']], locale: 'custom', locales: { custom: custom_locale } });
            Plotly.newPlot('spectrum', [], { title: "Esperando Datos...", dragmode: false }, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtons: [['zoom2d', 'pan2d', 'autoScale2d', 'toImage', 'toggleSpikelines']], locale: 'custom', locales: { custom: custom_locale } });
            Plotly.newPlot('spectrogram_3d', [], { title: "Esperando Datos...", dragmode: false }, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtonsToRemove: ['pan3d', 'orbitRotation', 'resetCameraDefault3d', 'hoverClosest3d'], locale: 'custom', locales: { custom: custom_locale } });
            Plotly.newPlot('oscilogram', [], { title: "Esperando Datos...", dragmode: false }, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtons: [['zoom2d', 'pan2d', 'autoScale2d', 'toImage', 'toggleSpikelines']], locale: 'custom', locales: { custom: custom_locale } });
            Plotly.newPlot('intensity', [], { title: "Esperando Datos...", dragmode: false }, { responsive: true, displayModeBar: true, doubleClick: false, showTips: false, modeBarButtons: [['zoom2d', 'pan2d', 'autoScale2d', 'toImage', 'toggleSpikelines']], locale: 'custom', locales: { custom: custom_locale } });

            document.getElementById('load_wav').addEventListener('click', () => load_wav(upload_wav))
            upload_wav.addEventListener('change', () => change_upload(upload_wav))



            socket.on("plot_data_wav", (plot_data) => {
                let parsed_data = JSON.parse(plot_data);
                update_graphs(parsed_data, formats_checkbox)
                update_elements(parsed_data, upload_wav, audio_player, download_wav, download_txt, NaN)
                Swal.close();
                cursor(audio_player)
                syncLineOnClick(parsed_data.spectrogram_data)
                in_out_formants(formats_checkbox)
            });
            socket.on('plot_save_audio', (data) => {
                let parsed_data = JSON.parse(data.plot_data);
                update_graphs(parsed_data, formats_checkbox);
                update_elements(parsed_data, upload_wav, audio_player, download_wav, download_txt, data.audio)
                Swal.close();
                cursor(audio_player)
                syncLineOnClick(parsed_data.spectrogram_data)
                in_out_formants(formats_checkbox)
            });
        }
    });

}
function load_wav(upload_wav) {
    show_spinner()
    setTimeout(() => {
        if (upload_wav.files.length === 0) {
            sweet_alert("Archivo no subido", "Debe subir un archivo .wav antes de continuar.", "error", "OK", undefined, true, false, main);
            hide_spinner()
            return;  // Salir de la función si no hay archivo
        }
        // Obtener el archivo subido
        let file = upload_wav.files[0];
    
        // Verificar si el archivo es un archivo .wav 
        if (file.type !== "audio/wav") {
            sweet_alert("Formato incorrecto", "Por favor, seleccione un archivo .wav válido.", "error", "OK", undefined, true, false, main);
            hide_spinner()
            return;
        }
    
    
        // Leer el archivo como ArrayBuffer (lo más eficiente para enviar datos binarios)
        let reader = new FileReader();
        reader.onload = function (event) {
            let array_buffer = event.target.result;  // Obtener el contenido del archivo como ArrayBuffer
            let wavBlob = new Blob([array_buffer], { type: 'audio/wav' });
            let audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.decodeAudioData(array_buffer, function(buffer) {
                let duration = buffer.duration;
                console.log(duration)
                if (duration > 120) {
                    sweet_alert("Audio demasiado largo", `El archivo "${file.name}" supera los 2 minutos de duración. Por favor, suba un archivo más corto.`, "warning", "OK", undefined, true, false, main);
                } else {
                    // Enviar el archivo al servidor usando Socket.IO
                    socket.emit('process_wav', wavBlob);
                    sweet_alert("Archivo enviado", `El archivo "${file.name}" ha sido subido correctamente. Espere para el procesamiento.`, "success", "", undefined, false, true, null);
                }
            })
        };
    
        // Leer el archivo como ArrayBuffer
        reader.readAsArrayBuffer(file);
        hide_spinner()
    },100)   
}
function change_upload(upload_wav) {
    let fileArea = document.getElementById('fileArea');
    let fileName = upload_wav.files[0] ? upload_wav.files[0].name : 'Haz clic para seleccionar un archivo';

    fileArea.setAttribute('data-file-name', fileName);

    if (fileName !== 'Haz clic para seleccionar un archivo') {
        fileArea.classList.add('has-file');
    } else {
        fileArea.classList.remove('has-file');
    }
}
function update_graphs(parsed_data, formats_checkbox) {
    // Actualizar el oscilograma y la intensidad
    Plotly.react('spectrum', parsed_data.trace_spectrum, parsed_data.layout_spectrum);
    Plotly.react('spectrogram_3d', parsed_data.trace_spectrogram_3d, parsed_data.layout_spectrogram_3d);
    Plotly.react('oscilogram', parsed_data.trace_oscilogram, parsed_data.layout_oscilogram);
    Plotly.react('intensity', parsed_data.trace_intensity, parsed_data.layout_intensity);
    // Filtrar los formantes si el checkbox no está marcado
    if (!formats_checkbox.checked) {
        parsed_data.trace_spectrogram = parsed_data.trace_spectrogram.filter(trace => !trace.name.startsWith('Formante'));
    }
    // Actualizar el espectrograma
    Plotly.react('spectrogram', parsed_data.trace_spectrogram, parsed_data.layout_spectrogram)
}
function update_elements(parsed_data, upload_wav, audio_player, download_wav, download_txt, audio) {
    document.getElementById('download_pdf').addEventListener('click', function (event) {
        event.preventDefault();  // Evitar la recarga de la página
        show_spinner();
        setTimeout(async () => {
            try {
                let { jsPDF } = window.jspdf;
                let doc = new jsPDF('landscape');
                let plots = document.querySelectorAll('.js-plotly-plot');  // Todas las gráficas de Plotly en la página
    
                // Evitar el caso en el que no haya gráficas disponibles
                if (plots.length === 0) {
                    console.error("No se encontraron gráficas para exportar.");
                    return;
                }
    
                // Procesar cada gráfica de forma secuencial
                for (let i = 0; i < plots.length; i++) {
                    try {
                        // Usar Plotly.toImage para generar la imagen de la gráfica en alta calidad
                        let dataUrl = await Plotly.toImage(plots[i], {format: 'png',width: 1200,  height: 800,scale: 2});

                        // Añadir la imagen al PDF manteniendo la proporción
                        let pdfWidth = doc.internal.pageSize.getWidth() - 20;  // Un margen de 10px a la izquierda y derecha
                        let pdfHeight = (800 / 1200) * pdfWidth;  // Mantener la proporción original (4:3)
    
                        doc.addImage(dataUrl, 'PNG', 10, 10, pdfWidth, pdfHeight);  // Ajustar dimensiones al PDF
    
                        // Agregar una nueva página si no es la última gráfica
                        if (i < plots.length - 1) {
                            doc.addPage();
                        }
                    } catch (error) {
                        console.error(`Error al convertir la gráfica ${i + 1} en imagen:`, error);
                    }
                }
    
                // Guardar el PDF después de que todas las gráficas se procesen
                doc.save('figures.pdf');
            } catch (error) {
                console.error("Error general en la generación del PDF:", error);
            } finally {
                hide_spinner();  // Asegurar que el spinner se oculte al final
            }
        }, 100);  // Mantener un pequeño retraso para permitir que el spinner se muestre primero
    });
    



    let file = upload_wav.files[0];
    if (file) {
        // Crear un URL del archivo seleccionado
        let audio_URL = URL.createObjectURL(file);

        // Asignar el URL como la fuente del reproductor de audio
        audio_player.src = audio_URL;

        download_wav.href = audio_URL;
    } else {
        let audioBlob = new Blob([audio], { type: 'audio/wav' });
        let audio_URL = URL.createObjectURL(audioBlob);

        audio_player.src = audio_URL;

        download_wav.href = audio_URL;


    }
    let blob_text_plain = new Blob([parsed_data.text_content], { type: 'text/plain' });

    // Crear un objeto URL para el blob
    let text_url = URL.createObjectURL(blob_text_plain);

    // Actualizar el href del enlace de descarga
    download_txt.href = text_url;
}
function in_out_formants(formats_checkbox) {
    let spectrogram = document.getElementById('spectrogram');
    formats_checkbox.addEventListener('change', function (event) {
        show_spinner()
        setTimeout(() => {
            spectrogram.data.forEach((trace, index) => {
                if (trace.name && trace.name.includes('Formante')) {
                    Plotly.restyle(spectrogram, { visible: formats_checkbox.checked ? true : false }, [index]);
                }
            });
            hide_spinner()
        }, 100);
    })
}
function cursor(audio_player) {
    if (audio_player) {
        audio_player.addEventListener("timeupdate", function () {
            let current_time = audio_player.currentTime;
            // Selecciona las gráficas y actualiza la posición de la línea
            let figures2d = document.querySelectorAll(".cursor2d");
            figures2d.forEach((fig) => {
                if (fig) {
                    try {
                        Plotly.relayout(fig, { shapes: [{ type: "line", x0: current_time, x1: current_time, y0: 0, y1: 1, xref: "x", yref: "paper", line: { color: "red", width: 2, } }] });

                    } catch (err) {
                        console.error("Error updating plot:", err);
                    }
                } else {
                    console.error(
                        `Element with ID ${fig.id} is not initialized as a Plotly graph.`
                    );
                }
            });

        });
    }
}
function syncLineOnClick(spectrogram_data) {

    let figures2d = document.querySelectorAll(".cursor2d");
    let spectrumFigure = document.querySelector(".cursorEspectro");
    let spectrogram3DFigure = document.querySelector(".cursor3d")
    let oscilogramFigure = document.getElementById("oscilogram")
    let zoom_slider = document.getElementById("zoom_slider")
    let zoom_value = document.getElementById("zoom_value");


    addZoomWindow(oscilogramFigure, 0, 10, false);

    let clicked_time = 0

    zoom_slider.addEventListener("input", function () {
        zoom_value.textContent = `Valor: ${zoom_slider.value} ms`;
    });
    zoom_slider.addEventListener("change", function () {
        show_spinner()
        setTimeout(() => {
            if (oscilogramFigure) {
                let zoom_value = zoom_slider.value;
                addZoomWindow(oscilogramFigure, clicked_time, parseFloat(zoom_value), false);
            }
            hide_spinner()
        }, 100)

    });

    figures2d.forEach((fig) => {
        if (fig) {
            fig.on('plotly_click', function (data) {

                if (data.event && data.event.button === 0 || data.event && !data.event.button) {
                    if (data.points && data.points.length > 0) {

                        show_spinner()
                        setTimeout(() => {
                            clicked_time = data.points[0].x;

                            // Actualizar todas las gráficas con la nueva línea
                            figures2d.forEach((fig) => {
                                if (fig) {
                                    if (fig.id === 'oscilogram') {
                                        let zoom_value = zoom_slider.value
                                        let result = addZoomWindow(fig, clicked_time, parseFloat(zoom_value), true);
                                        result.layoutUpdate.shapes = [{ type: 'line', x0: clicked_time, x1: clicked_time, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'blue', width: 2, dash: 'dash' } }]
                                        Plotly.addTraces(fig, [result.rectTrace, result.zoomTrace]);
                                        Plotly.relayout(fig, result.layoutUpdate);
                                    }
                                    Plotly.relayout(fig, {
                                        shapes: [{ type: 'line', x0: clicked_time, x1: clicked_time, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'blue', width: 2, dash: 'dash' } }]
                                    });
                                }
                            });

                            // Actualizar la gráfica de espectro
                            if (spectrumFigure) {
                                updateSpectrumInTime(spectrumFigure, clicked_time, spectrogram_data);

                            }
                            // Actualizar el espectrograma 3D con un plano en el tiempo seleccionado
                            if (spectrogram3DFigure) {
                                // update3DSpectrogramWithPlane(spectrogram3DFigure, clicked_time);
                            }
                            hide_spinner()

                        }, 100)


                    }
                }
            });
        }
    });

}
function updateSpectrumInTime(spectrumFigure, clicked_time, spectrogram_data) {
    // Extrae los datos del espectrograma
    let times = spectrogram_data.times;
    let frequencies = spectrogram_data.frequencies;
    let powerValues = spectrogram_data.power_values;  // Matriz de potencias/intensidades

    // Encuentra el índice del tiempo más cercano al tiempo de clic
    let closestTimeIndex = 0;
    let minTimeDiff = Math.abs(times[0] - clicked_time);
    for (let i = 1; i < times.length; i++) {
        let timeDiff = Math.abs(times[i] - clicked_time);
        if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestTimeIndex = i;
        }
    }

    // Extraer la columna de potencias correspondiente al tiempo seleccionado
    let selectedPower = powerValues.map(row => row[closestTimeIndex]);

    // Verificar que el contenedor de Plotly está inicializado
    if (spectrumFigure) {
        // Actualizar la gráfica del espectro con los datos filtrados
        Plotly.restyle(spectrumFigure, {
            x: [frequencies],  // Todas las frecuencias
            y: [selectedPower]  // Potencias para el tiempo seleccionado
        });
    } else {
        console.error("Plotly container is not initialized or not found.");
    }
}
function update3DSpectrogramWithPlane(spectrogram3DFigure, clicked_time) {
    let maxFrequency = 8000;
    let minFrequency = 0;
    let minIntensity = -120;
    let maxIntensity = 0;

    // Obtener los datos originales del gráfico 3D (filtrando para no incluir planos antiguos)
    // const originalData = plotlyContainer.data.filter(trace => trace.name !== 'Selected Time Plane');

    let planeData = {
        type: 'surface',
        x: [[clicked_time, clicked_time], [clicked_time, clicked_time]],
        y: [[minFrequency, maxFrequency], [minFrequency, maxFrequency]],
        z: [[minIntensity, minIntensity], [maxIntensity, maxIntensity]],
        colorscale: [[0, 'blue'], [1, 'blue']],
        opacity: 0.3,
        showscale: false,
        name: 'Selected Time Plane'
    };

    let existingPlaneIndex = spectrogram3DFigure.data.findIndex(trace => trace.name === 'Selected Time Plane');

    if (existingPlaneIndex !== -1) {
        // Si ya existe, mover el plano existente
        Plotly.update(spectrogram3DFigure, {
            x: [[[clicked_time, clicked_time], [clicked_time, clicked_time]]],
            y: [[[minFrequency, maxFrequency], [minFrequency, maxFrequency]]],
            z: [[[minIntensity, minIntensity], [maxIntensity, maxIntensity]]]
        }, {}, [existingPlaneIndex]);
    } else {
        // Si no existe, agregar el plano nuevo
        Plotly.addTraces(spectrogram3DFigure, [planeData]);
    }

}
function addZoomWindow(oscilogramFigure, clicked_time, zoomWindowDuration, clicked) {

    zoomWindowDuration = zoomWindowDuration / 1000
    let zoomStart = clicked_time - zoomWindowDuration / 2
    let zoomEnd = clicked_time + zoomWindowDuration / 2


    // Obtener los datos actuales del gráfico
    let currentData = oscilogramFigure.data[0] // Asumiendo que es la primera traza del gráfico
    let xValues = currentData.x
    let yValues = currentData.y

    // Filtrar los datos para el zoom
    let zoomX = [];
    let zoomY = [];
    for (let i = 0; i < xValues.length; i++) {
        if (xValues[i] >= zoomStart && xValues[i] <= zoomEnd) {
            zoomX.push(xValues[i]);
            zoomY.push(yValues[i]);
        }
    }

    // Eliminar cualquier traza de zoom anterior (esto evitará la superposición)
    let zoomTraceIndex = oscilogramFigure.data.findIndex(trace => trace.name === "Oscilograma Ampliado");
    let rectTraceIndex = oscilogramFigure.data.findIndex(trace => trace.name === "Zoom Area Background");

    if (zoomTraceIndex !== -1) {
        Plotly.deleteTraces(oscilogramFigure, zoomTraceIndex);  // Eliminar la traza existente
    }

    if (rectTraceIndex !== -1) {
        Plotly.deleteTraces(oscilogramFigure, rectTraceIndex);  // Eliminar la traza existente
    }

    // Trazo del rectángulo como fondo
    let rectTrace = {
        x: [Math.min(...zoomX), Math.max(...zoomX), Math.max(...zoomX), Math.min(...zoomX), Math.min(...zoomX)],  // Definir las coordenadas X del rectángulo
        y: [Math.min(...zoomY), Math.min(...zoomY), Math.max(...zoomY), Math.max(...zoomY), Math.min(...zoomY)],  // Definir las coordenadas Y del rectángulo
        fill: 'toself',  // Llenar el área del rectángulo
        fillcolor: 'rgba(0, 0, 0, 0.3)',  // Color de fondo con transparencia
        line: {
            color: 'rgba(0, 0, 0, 0.8)',  // Color del borde del rectángulo
            width: 1  // Grosor del borde
        },
        name: "Zoom Area Background",  // Nombre de la traza
        xaxis: 'x2',  // Usar el segundo eje X
        yaxis: 'y2',  // Usar el segundo eje Y
        mode: 'lines',  // Modo de líneas para los bordes del rectángulo
        showlegend: false,
        hoverinfo: 'skip'
    };


    // Crear un gráfico superpuesto en la esquina superior derecha
    let zoomTrace = {
        x: zoomX,
        y: zoomY,
        mode: 'lines',
        line: { color: 'red' },
        name: "Oscilograma Ampliado",  // Nombre para identificar la traza de zoom
        xaxis: 'x2',  // Usar un segundo eje x
        yaxis: 'y2',  // Usar un segundo eje y
        hovertemplate: 'Tiempo: %{x: .3f} s<br>Amplitud: %{y: .3f}'

    };

    let layoutUpdate = {
        xaxis2: {
            domain: [0.75, 1],  // Ajusta la posición en la esquina superior derecha
            anchor: 'y2',
            side: 'top',
            showgrid: true,
            zeroline: false,
            gridcolor: 'rgba(211, 211, 211, 0.7)',  // Cuadrícula negra
            tickvals: [Math.min(...zoomX), Math.max(...zoomX)],  // Mostrar solo el primer y el último valor del zoom
            ticktext: [Math.min(...zoomX).toFixed(3), Math.max(...zoomX).toFixed(3)],  // Etiquetas correspondientes a los valores
            tickangle: 0,
            tickfont: {
                size: 10,  // Tamaño de la fuente para las etiquetas de los valores del eje X
                color: 'black',  // Color de la fuente para las etiquetas de los valores del eje X (opcional)
            },
            title: {
                text: 'Tiempo [s]',  // Texto del título del eje X
                font: {
                    size: 10,  // Tamaño de la fuente para el título (ajústalo según lo necesario)
                },
                standoff: 0  // Reducir la distancia del título con respecto a los valores del eje
            }

        },
        yaxis2: {
            domain: [0.75, 1],
            anchor: 'x2',
            side: 'right',
            showgrid: true,
            zeroline: true,
            gridcolor: 'rgba(211, 211, 211, 0.7)',  // Cuadrícula negra
            zerolinecolor: 'rgba(211, 211, 211, 0.7)',
            tickvals: [Math.min(...zoomY), 0, Math.max(...zoomY)],  // Mostrar solo el primer y el último valor del zoom
            ticktext: [Math.min(...zoomY).toFixed(3), 0, Math.max(...zoomY).toFixed(3)],  // Etiquetas correspondientes a los valores
            tickangle: 0,
            tickfont: {
                size: 10,  // Tamaño de la fuente para las etiquetas de los valores del eje X
                color: 'black',  // Color de la fuente para las etiquetas de los valores del eje X (opcional)
            },
            title: {
                text: 'Amplitud',  // Texto del título del eje Y
                font: {
                    size: 10,  // Tamaño de la fuente para el título
                },
                standoff: 0
            }

        },
        // margin: {
        //     l: 50,
        //     r: 50,
        //     t: 50,  // Reducir el margen superior para acercar el título al eje X
        //     b: 50,
        // }
    }

    // Agregar el nuevo zoom al gráfico
    if (clicked) {
        return { rectTrace, zoomTrace, layoutUpdate }
    } else {
        Plotly.addTraces(oscilogramFigure, [rectTrace, zoomTrace]);
        Plotly.relayout(oscilogramFigure, layoutUpdate);
    }
}
function sweet_alert(title, text, icon, confirmButtonText, timer, showConfirmButton, loading, callback) {
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

    Swal.fire(options).then((result) => {
        if (result.isConfirmed && callback) {
            callback();  // Ejecuta el callback si se confirma y si el callback fue proporcionado
        }
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

    const driverObj = driver({
        showProgress: true,
        animate: true, // Animaciones para el tour
        opacity: 0.6,  // Opacidad de fondo
        allowClose: true, // Permitir cerrar la guía
        doneBtnText: 'Finalizar', // Texto para el botón de finalización
        closeBtnText: 'Cerrar', // Texto para el botón de cierre
        nextBtnText: 'Siguiente', // Texto para el botón de siguiente
        prevBtnText: 'Anterior', // Texto para el botón de anterior
        steps: steps
    });
    // Iniciar el tour
    driverObj.drive();
}
function tutorial_alert() {
    let steps = [
        { element: '#upload_wav', popover: { title: 'Subir Archivo', description: 'Haga clic aquí para seleccionar un archivo .wav para subir.', side: 'left', align: 'center' } },
        { element: '#load_wav', popover: { title: 'Guardar y Cargar', description: 'Haga clic aquí para guardar y cargar el archivo seleccionado.', side: 'bottom', align: 'center' } },
        { element: '.back_button_a_alert', popover: { title: 'Regresar', description: 'Haga clic aquí para volver a la página inicial sin guardar cambios.', side: 'bottom', align: 'center' } }
    ]
    start_tour(steps)
}

function tutorial_wav() {
    let steps = [
        
        { element: '#audio_player', popover: { title: 'Reproducir Audio', description: 'Haga clic aquí para reproducir el archivo de audio cargado.', side: 'bottom', align: 'center' } },
        { element: '#download_txt', popover: { title: 'Descargar Texto', description: 'Haga clic aquí para descargar el contenido en formato de texto.', side: 'bottom', align: 'center' } },
        { element: '#download_wav', popover: { title: 'Descargar WAV', description: 'Haga clic aquí para descargar el archivo de audio en formato .wav.', side: 'bottom', align: 'center' } },
        { element: '#download_pdf', popover: { title: 'Descargar PDF', description: 'Haga clic aquí para descargar las gráficas en formato PDF.', side: 'bottom', align: 'center' } },
        { element: '#formats_checkbox', popover: { title: 'Mostrar Formantes', description: 'Seleccione esta opción para mostrar los formantes en la gráfica.', side: 'bottom', align: 'center' } },
        { element: '.modebar-group', popover: { title: 'Controles de Gráfica', description: 'Utilice estos controles para ajustar la visualización de la gráfica. \nPara conocer más de las funcionalidades, consulte el Manual', side: 'left', align: 'center' } },
        { element: '.slider-container', popover: { title: 'Ajustar Zoom', description: 'Utilice la barra de escala para ajustar el nivel de zoom en la gráfica.', side: 'bottom', align: 'center' } },
        { element: '.back_button_a', popover: { title: 'Regresar', description: 'Haga clic aquípara volver a la página inicial sin guardar cambios.', side: 'bottom', align: 'center' } },
        { element: '#manual', popover: { title: 'Manual de Usuario', description: 'Para más información, consulte el Manual de Usuario', side: 'top', align: 'center' } },

    ];
    start_tour(steps)
}


