import numpy as np
import plotly.graph_objs as go
from scipy.signal import savgol_filter
from parselmouth.praat import call
import io
import json
import simplejson as json



def draw_spectrogram_3d(times_specspectrogram, frecuency_specspectrogram, intensity_spectrogram):
    X, Y = np.meshgrid(times_specspectrogram, frecuency_specspectrogram)
    Z = intensity_spectrogram

    trace_spectrogram_3d = [{
        'z': Z.tolist(),
        'x': X.tolist(),
        'y': Y.tolist(),
        'type': 'surface',  
        'colorscale': 'Hot',
        'colorbar': {
            'title': "Intensidad [dB]",
            'thickness': 10,
            'titleside': 'right',
            'titlefont': {'size': 12},
            'tickmode': 'auto',
            'ticks': 'outside'
        },
        'hovertemplate': 'Tiempo: %{x: .2f} s<br>Frecuencia: %{y: .2f} Hz<br>Intensidad: %{z: .3f} dB<extra></extra>'

    }]

    layout_spectrogram_3d= {
    'title': "Espectrograma 3D",
    'scene': {
        'xaxis': {'title': "Tiempo [s]", 'range': [0, np.max(X)]},
        'yaxis': {'title': "Frecuencia [Hz]", 'zeroline': False, 'range': [0, 8000]},
        'zaxis': {'title': "Intensidad [dB]", 'range': [np.min(Z), np.max(Z)]},
        'camera': {'eye': {'x': 2, 'y': -2, 'z': 1}},
        'dragmode': False 
    },
    'font': {
            'family': 'Helvetica Neue', 
        },
        'hoverlabel': {
            'font': {
                'family': 'Helvetica Neue', 
                'size': 14 
             }
         },
    'hovermode': 'closest',
    'autosize': True,
    }

    return trace_spectrogram_3d, layout_spectrogram_3d
 
def draw_spectrogram(times_specspectrogram, frecuency_spectrogram, intensity_spectrogram, pitch_values, time_pitch, formants):
    X, Y = np.meshgrid(times_specspectrogram, frecuency_spectrogram)
    Z = intensity_spectrogram

    trace_spectrogram = [{
        'z': Z.tolist(),  
        'x': X[0].tolist(),  
        'y': Y[:, 0].tolist(),  
        'type': 'heatmap',
        'colorscale': 'Hot',
        'zmin': np.min(Z), 
        'zmax': np.max(Z), 
        'name': "Espectrograma",
        'colorbar': {
            'title': "Intensidad [dB]",
            'thickness': 10,  
            'titleside': 'right',  
            'titlefont': {'size': 12}, 
            'tickmode': 'auto',  
            'ticks': 'outside' 
        },
        'hovertemplate': 'Tiempo: %{x: .2f} s<br>Frecuencia: %{y: .2f} Hz<br>Intensidad: %{z: .3f} dB'
    }]

    spectrogram_data = {
        'times': times_specspectrogram.tolist(),
        'frequencies': frecuency_spectrogram.tolist(),
        'power_values': intensity_spectrogram.tolist()  # Matriz de potencias
    }
    

    trace_pitch = [{
        'x': time_pitch.tolist(),  
        'y': pitch_values.tolist(), 
        'mode': 'lines+markers',
        'marker': {'size': 3, 'color': 'cyan'},
        'line': {'color': 'cyan'},
        'name': "Frecuencia Fundamental",
        'showlegend': True,
        'hovertemplate': 'Tiempo: %{x: .2f} s<br>Frecuencia: %{y: .2f} Hz'

    }]
    
    traces = trace_spectrogram  + trace_pitch
    formants_values = []

   
    colors = ['olivedrab', 'dodgerblue', '#414040'] 
    for formant_number in range(1, 4): 
        formant_values = np.array([np.nan if np.isnan(p) else formants.get_value_at_time(formant_number, t)
                       for p, t in zip(pitch_values, time_pitch)])
        # formant_values = np.array([0 if  p==0 else formants.get_value_at_time(formant_number, t)
        #                 for p, t in zip(pitch_values, time_pitch)])
        trace_formant = [{
            'x': time_pitch.tolist(), 
            'y': formant_values.tolist(), 
            'mode': 'lines+markers',
            'marker': {'size': 2},
            'line': {'dash': 'dash', 'color': colors[formant_number - 1] },
            'name': f"Formante {formant_number}",
            'hovertemplate': 'Tiempo: %{x: .2f} s<br>Frecuencia: %{y: .2f} Hz'
        }]
        formants_values.append(formant_values)
        traces = traces + trace_formant

    layout = {
        'title': "Espectrograma",
        'xaxis': {'title': "Tiempo [s]"},
        'yaxis': {'title': "Frequencia [Hz]", 'range': [0, 8000]},
        'hovermode': 'closest',
        'legend': {
            'x': 0.5,
            'y': -0.3,
            'xanchor': 'center',
            'yanchor': 'top',
            'orientation': 'h',
            'font': {'size': 10}
        },
        'font': {
            'family': 'Helvetica Neue', 
        },
        'hoverlabel': {
            'font': {
                'family': 'Helvetica Neue', 
                'size': 14 
             }
         },
        'autosize': True,
        'dragmode': False 

    }

 
    return traces, layout, formants_values, spectrogram_data
 
def draw_combined_pitch_intensity_contour(pitch_values, time_pitch, intensity):
 
    trace_pitch = [{
        'x': time_pitch.tolist(), 
        'y': pitch_values.tolist(),  
        'mode': 'lines+markers',
        'marker': {'size': 3, 'color': 'turquoise'},
        'line': {'color': 'turquoise'},
        'name': "Frecuencia Fundamental",
        'hovertemplate': 'Tiempo: %{x: .2f} s<br>Frecuencia: %{y: .2f} Hz'
    }]

    # Curva de intensidad (dB)
    trace_intensity = [{
        'x': intensity.xs().tolist(),  
        'y': intensity.values.T.flatten().tolist(),  
        'mode': 'lines',
        'line': {'color': 'purple'},
        'name': "Intesidad",
        'yaxis': "y2",
        'hovertemplate': 'Tiempo: %{x: .2f} s<br>Intensidad: %{y: .2f} dB'

    }]

    # Layout del gráfico con dos ejes y
    layout = {
        'title': "Frecuencia fundamental e Intensidad",
        'xaxis': {'title': "Tiempo [s]"},
        'yaxis': {'title': "Frecuencia [Hz]", 'range': [0, 1000]},
        'yaxis2': {'title': "Intesidad [dB]", 'overlaying': 'y', 'side': 'right', 'range': [0, 120]},
        'hovermode': 'closest',
        'legend': {'x': 0.5, 'y': -0.3, 'xanchor': 'center', 'yanchor': 'top', 'orientation': 'h', 'font': {'size': 10}},
        'font': {
            'family': 'Helvetica Neue', 
        },
        'hoverlabel': {
            'font': {
                'family': 'Helvetica Neue', 
                'size': 14 
             }
         },
        'autosize': True,
        'dragmode': False 

    }

    traces = trace_pitch + trace_intensity
 
    return traces, layout
 
def draw_power_spectrum(frequencies, intensity_spectrum):
   
    # Verificar que frequencies y power tengan la misma longitud
    # if len(frequencies) != len(power):
    #     min_length = min(len(frequencies), len(power))
    #     frequencies = frequencies[:min_length]
    #     power = power[:min_length]
   
    # valid_idx = np.isfinite(power)
    # frequencies = frequencies[valid_idx]
    # power = power[valid_idx]
 
    # intensity_spectrum = savgol_filter(intensity_spectrum, window_length=101, polyorder=2)
    trace_spectrum = [{
        'x': frequencies.tolist(),
        'y': intensity_spectrum.tolist(),
        'mode': 'lines',
        'line': {'color': 'blue', 'width': 3},
        'name': "Espectro",
        'hovertemplate': 'Frecuencia: %{x: .2f} Hz<br>Intensidad: %{y: .2f} dB'

    }]
 
    layout_spectrum = {
        'title': "Espectro de Potencia",
        'xaxis': {'title': "Frecuencia [Hz]", 'range': [0, 8000]},
        'yaxis': {'title': "Intesidad [dB]", 'range': [0, 120] },
        'hovermode': 'closest',
        'font': {
            'family': 'Helvetica Neue', 
        },
        'hoverlabel': {
            'font': {
                'family': 'Helvetica Neue', 
                'size': 14 
             }
         },
        'autosize': True,
        'dragmode': False 

    }

 
    return trace_spectrum, layout_spectrum
 
def draw_waveform(time, amplitude):

    #  Datos del oscilograma
    trace_oscilogram = [{
        'x': time.tolist(),  
        'y': amplitude.tolist(),  
        'mode': 'lines',
        'line': {'color': 'black'},
        'name': 'Oscilograma',
        'hovertemplate': 'Tiempo: %{x: .2f} s<br>Amplitud: %{y: .2f}'
    }]

    layout_oscilogram = {
        'title': "Oscilograma",
        'xaxis': {'title': "Tiempo [s]"},
        'yaxis': {'title': "Amplitud",  'range': [-1, 1]},
        'hovermode': 'closest',
        'legend': {'x': 0.5, 'y': -0.3, 'xanchor': 'center', 'yanchor': 'top', 'orientation': 'h'
        },
        'font': {
            'family': 'Helvetica Neue', 
        },
        'hoverlabel': {
            'font': {
                'family': 'Helvetica Neue', 
                'size': 14 
             }
         },
        # 'margin': {'l': 50, 'r': 50, 't': 50, 'b': 50},
        'autosize': True,
        'dragmode': False 

    }
 
    return trace_oscilogram, layout_oscilogram
 
def generate_text_file(time_pitch, pitch_values, intensity, formants_values, spectrogram_data):
    """
    Genera un archivo de texto con los datos de pitch, intensidad y formantes,
    alineandos en tiempo.
    """
    output = io.StringIO()
    output.write("{:<10}/\t{:<15}\t/\t{:<15}\t/\t{:<15}\t/\t{:<15}\t/\t{:<15}\n".format(
        "Tiempo [s]", "Frecuencia [Hz]", "Intesidad [dB]", "Formante 1 [Hz]", "Formante 2 [Hz]", "Formante 3 [Hz]"))

     # Los tiempos del análisis de pitch
    pitch_frequencies = pitch_values
    
    # Extraer los tiempos e intensidades
    times_intensity = intensity.xs()
    intensity_values = intensity.values.T.flatten()

    # Interpolar la intensidad para que coincida con los tiempos de pitch
    intensity_interpolated = np.interp(time_pitch, times_intensity, intensity_values)

    # Crear listas para los formantes
    formant1 = formants_values[0]
    formant2 =formants_values [1]
    formant3 = formants_values[2]


    # Asegurarnos de que todos los datos tengan el mismo tamaño

    min_length = min(len(time_pitch), len(pitch_frequencies), len(intensity_interpolated), len(formant1), len(formant2), len(formant3))

    # Escribir los datos alineados al archivo
    for i in range(min_length):
        output.write("{:<10.4f}/\t{:<15.2f}\t/\t{:<15.2f}\t/\t{:<15.2f}\t/\t{:<15.2f}\t/\t{:<15.2f}\n".format(
            time_pitch[i], pitch_frequencies[i], intensity_interpolated[i], 
            formant1[i], formant2[i], formant3[i]))


    text_content = output.getvalue()
    output.close()
   
    return text_content
    #  Crear el buffer de StringIO para escribir los datos en memoria
    # output = io.StringIO()

    # # Escribir el encabezado
    # output.write("{:<10}/\t{:<15}\t/\t{:<15}\n".format(
    #     "Time [s]","Frequency [Hz]", "Power [dB]"))
    
    # times = spectrogram_data['times']
    # frequencies = spectrogram_data['frequencies']
    # power_values = spectrogram_data['power_values']  # Matriz Z

    # # Iterar sobre los tiempos y frecuencias para escribir los valores en el buffer
    # for i, time in enumerate(times):
    #     for j, freq in enumerate(frequencies):
    #         # Escribir tiempo, frecuencia y potencia correspondientes en el buffer
    #         output.write("{:<10.4f}/\t{:<15.2f}\t/\t{:<15.2f}\n".format(
    #             time, freq, power_values[j][i]))

    # # Obtener el contenido de texto del StringIO
    # text_content = output.getvalue()

    # # Cerrar el buffer
    # output.close()

    # # Devolver el contenido de texto para guardarlo o manipularlo
    # return text_content


def analyze_audio(snd, live):

    # Generar el oscilograma con Plotly
    time = snd.xs()
    amplitude = snd.values.flatten()
    trace_oscilogram, layout_oscilogram = draw_waveform(time, amplitude)

    # with open('oscilogram_male.txt', 'w') as archivo:
    #     archivo.write("{:<10}/\t{:<15}\n".format("Time [s]", "Amplitud"))
    
    # # Escribir los valores de tiempo y amplitud
    #     for t, a in zip(time, amplitude):
    #         archivo.write("{:<10}/\t{:<15}\n".format(t,a))

    # Análisis de Pitch (frecuencia fundamental)
    pitch = snd.to_pitch()
    pitch_values = pitch.selected_array['frequency']
    pitch_values[pitch_values == 0] = np.nan 
    time_pitch = pitch.xs() # Reemplazar partes no sonoras con NaN

    # Análisis de Formantes usando LPC (método Burg)
    formants = snd.to_formant_burg()

    # Generar el espectrograma 
    spectrogram = snd.to_spectrogram(window_length=0.1, maximum_frequency=8000)
    times_specspectrogram = spectrogram.xs()
    frecuency_specspectrogram = spectrogram.ys()
    psd = spectrogram.values
    p_ref = 2e-5
    psd[psd == 0] = np.nan 
    intensity_spectrogram = 10 * np.log10(psd/(p_ref**2))



    # Generar el espectrograma 2D con Plotly
    trace_spectrogram, layout_spectrogram, formants_values, spectrogram_data  = draw_spectrogram(times_specspectrogram, frecuency_specspectrogram, intensity_spectrogram, pitch_values, time_pitch, formants)

    # Análisis de Intensidad
    intensity = snd.to_intensity()

    # Generar la gráfica combinada de pitch e intensidad
    trace_intensity, layout_intensity = draw_combined_pitch_intensity_contour(pitch_values, time_pitch, intensity)


    if not live:
        mean_pitch = call(pitch, "Get mean", 0, 0, "Hertz")
 
        # Generar el espectrograma 3D con Plotly
        trace_spectrogram_3d, layout_spectrogram_3d = draw_spectrogram_3d(times_specspectrogram, frecuency_specspectrogram, intensity_spectrogram)
 
        # Generar el espectro de potencia con Plotly
        spectrum = snd.to_spectrum()
        frequencies = spectrum.xs()
        duration = snd.get_total_duration()
        p_ref = 2e-5
        real_part = abs(spectrum.values[0, :])   # Parte real
        imaginary_part = abs(spectrum.values[1, :])   # Parte imaginaria
        magnitude = np.sqrt(real_part**2 + imaginary_part**2)
        psd = (2* (magnitude**2)) / duration
        psd[psd == 0] = np.nan 
        intensity_spectrum = 10 * np.log10(psd/(p_ref**2))
        trace_spectrum, layout_spectrum = draw_power_spectrum(frequencies, intensity_spectrum)
     

        # Generar el archivo de texto con los datos
        text_content = generate_text_file(time_pitch, pitch_values, intensity, formants_values, spectrogram_data)
        data_to_send = json.dumps({
            'trace_oscilogram': trace_oscilogram,
            'layout_oscilogram': layout_oscilogram,
            'trace_spectrogram': trace_spectrogram,
            'layout_spectrogram': layout_spectrogram,
            'trace_intensity': trace_intensity,
            'layout_intensity': layout_intensity,
            'trace_spectrogram_3d': trace_spectrogram_3d,
            'layout_spectrogram_3d': layout_spectrogram_3d,
            'trace_spectrum': trace_spectrum,
            'layout_spectrum': layout_spectrum, 
            'text_content': text_content,
            'spectrogram_data': spectrogram_data
        }, ignore_nan=True)
        # data_to_send_git =({
        #     'trace_oscilogram': trace_oscilogram,
        #     'layout_oscilogram': layout_oscilogram,
        #     'trace_spectrogram': trace_spectrogram,
        #     'layout_spectrogram': layout_spectrogram,
        #     'trace_intensity': trace_intensity,
        #     'layout_intensity': layout_intensity,
        #     'trace_spectrogram_3d': trace_spectrogram_3d,
        #     'layout_spectrogram_3d': layout_spectrogram_3d,
        #     'trace_spectrum': trace_spectrum,
        #     'layout_spectrum': layout_spectrum,
        # })
        # with open('data.json', 'w') as json_file:
        #     json.dump(data_to_send_git,json_file)

        return data_to_send
    else:
        data_to_send = json.dumps({
            'trace_oscilogram': trace_oscilogram,
            'layout_oscilogram': layout_oscilogram,
            'trace_spectrogram': trace_spectrogram,
            'layout_spectrogram': layout_spectrogram,
            'trace_intensity': trace_intensity,
            'layout_intensity': layout_intensity
        }, ignore_nan=True)
        return data_to_send



