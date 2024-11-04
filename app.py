from flask import Flask, render_template, session, send_file, request, jsonify
from flask_socketio import SocketIO
import redis
import uuid
import numpy as np
import parselmouth
from audio_analysis import analyze_audio
import io
from scipy.io import wavfile
from datetime import timedelta



redis_client = redis.StrictRedis(host='localhost', port=6379, db=0)
app = Flask(__name__)
app.secret_key = 'trabajo_de_grado_12601907' 
app.config.update(
    SESSION_COOKIE_SECURE=True,  # Cookies solo se envían por HTTPS
    SESSION_COOKIE_HTTPONLY=True,  # Cookies inaccesibles desde JavaScript
    SESSION_COOKIE_SAMESITE='Lax',  # Evitar envío en solicitudes cruzadas
)

socket_io = SocketIO(app)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/index.html')
def index2():
    return render_template('index.html')

@app.route('/real_time_analysis.html')
def real_timeAnalysis():
    return render_template('real_time_analysis.html')

@app.route('/wav_analysis.html')
def wav_Analysis():
    return render_template('wav_analysis.html')

@app.route('/manual.html')
def manual():
    return render_template('manual.html')

@app.route('/about.html')
def about():
    return render_template('about.html')


@app.route('/verificar_sesion', methods=['POST'])
def verificar_sesion():
    # Verifica si ya existe un user_id en la sesión
    if 'user_id' in session:
        return jsonify({"usuario_creado": True})
    else:
        return jsonify({"usuario_creado": False})

@app.route('/crear_sesion', methods=['POST'])
def crear_sesion():
    # Crea una sesión si no existe y el usuario acepta cookies
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        return jsonify({"mensaje": "Sesión creada"})
    else:
        return jsonify({"mensaje": "Sesión ya existe"})


@socket_io.on('disconnect')
def handle_disconnect():
    user_id = session.get('user_id')
    if user_id:
        key_audio_data = f'{user_id}_audio_data'
        key_data_queue = f'{user_id}_data_queue'
        key_sample_rate= f'{user_id}_sample_rate'
        key_audio_data_copy = f'{user_id}_audio_data_copy'
        key_sample_rate_copy= f'{user_id}_sample_rate_copy'

        if redis_client.exists(key_audio_data):
            redis_client.delete(key_audio_data)
            redis_client.delete(key_data_queue)
            redis_client.delete(key_sample_rate)
        elif redis_client.exists(key_audio_data_copy):
            redis_client.delete(key_audio_data_copy)
            redis_client.delete(key_sample_rate_copy)


@socket_io.on('start_recording')
def handle_start_recording():
    user_id = session.get('user_id')
    if not user_id:
        socket_io.emit('handle_complete', {'message': 'Clave procesada'})
        return
    key_audio_data = f'{user_id}_audio_data'
    key_data_queue = f'{user_id}_data_queue'
    key_sample_rate= f'{user_id}_sample_rate'
    key_audio_data_copy = f'{user_id}_audio_data_copy'
    key_sample_rate_copy= f'{user_id}_sample_rate_copy'
    if redis_client.exists(key_audio_data):
        redis_client.delete(key_audio_data)
        redis_client.delete(key_data_queue)
        redis_client.delete(key_sample_rate)
        redis_client.delete(key_audio_data_copy)
        redis_client.delete(key_sample_rate_copy)

    socket_io.emit('handle_complete', {'message': 'Clave procesada'})
   
@socket_io.on('set_sample_rate')
def handle_set_sample_rate(data):
    user_id = session.get('user_id')
    if not user_id:
        return  
    sample_rate = data.get('sample_rate')
    if sample_rate:
        redis_client.set(f'{user_id}_sample_rate', sample_rate)
        print(f"Frecuencia de muestreo {sample_rate} almacenada para el usuario {user_id}")

@socket_io.on('audio_data')
def handle_audio_data(data):
    user_id = session.get('user_id')
    if not user_id:
        return
    redis_client.rpush(f'{user_id}_audio_data', data)
    redis_client.rpush(f'{user_id}_data_queue', data)
    # Limitar el tamaño de la cola (buffersize)
    buffer_size = 5
    data_queue_length = redis_client.llen(f'{user_id}_data_queue')
    if data_queue_length > buffer_size:
        redis_client.ltrim(f'{user_id}_data_queue', data_queue_length - buffer_size, -1)

    key_data_queue = f'{user_id}_data_queue'
    key_sample_rate= f'{user_id}_sample_rate'
    audio_data_queue = redis_client.lrange(key_data_queue, 0, -1)  # Obtener todos los elementos de `data_queue`
    sample_rate = int(redis_client.get(key_sample_rate))

    if len(audio_data_queue) > 0 and sample_rate:
        # Convertir los datos de audio en un array de numpy
        combined_audio_queue = np.concatenate([(np.frombuffer(chunk, dtype=np.float32)) for chunk in audio_data_queue])
        combined_audio_queue = (combined_audio_queue * 32767).astype(np.int16)  
        max_value_queque = np.iinfo(combined_audio_queue.dtype).max
        combined_audio_queue = combined_audio_queue / max_value_queque
        sound_real_time = parselmouth.Sound(combined_audio_queue, sampling_frequency=sample_rate)
        data_to_send_real_time= analyze_audio(sound_real_time, True, max_value_queque)
        socket_io.emit('plot_data_real_time', data_to_send_real_time)

@socket_io.on('process_wav')
def handle_process_wav(data):
    audio_file = io.BytesIO(data)
    sample_rate, audio_data_wav = wavfile.read(audio_file)
    # Asegurarse de que los datos sean unidimensionales 
    if len(audio_data_wav.shape) > 1:
        audio_data_wav = audio_data_wav.mean(axis=1)  # Convertir a mono si es estéreo
    max_value_wav = np.iinfo(audio_data_wav.dtype).max
    audio_data_wav = audio_data_wav / max_value_wav
    sound_wav = parselmouth.Sound(values=audio_data_wav, sampling_frequency=sample_rate)
    data_to_send_wav  = analyze_audio(sound_wav, False, max_value_wav)
    socket_io.emit('plot_data_wav', data_to_send_wav)

@socket_io.on('save_data')
def handle_process_real_time():
    user_id = session.get('user_id')
    key_audio_data = f'{user_id}_audio_data'
    key_sample_rate= f'{user_id}_sample_rate'
    key_audio_data_copy = f'{user_id}_audio_data_copy'
    key_sample_rate_copy= f'{user_id}_sample_rate_copy'

    if redis_client.exists(key_audio_data):
        try :
            audio_data = redis_client.lrange(key_audio_data, 0, -1)
            sample_rate = redis_client.get(key_sample_rate)

            for chunk in audio_data:
                redis_client.rpush(key_audio_data_copy, chunk)

            redis_client.set(key_sample_rate_copy, sample_rate)

            socket_io.emit('handle_complete', {'message': 'Audio procesado'})
        except:
            redis_client.delete(key_audio_data_copy)
            redis_client.delete(key_sample_rate_copy)
            socket_io.emit('handle_complete')
    else:
        socket_io.emit('handle_complete')

@socket_io.on('get_processed_audio')
def handle_get_processed_audio():
    user_id = session.get('user_id')
    key_audio_data_copy = f'{user_id}_audio_data_copy'
    key_sample_rate_copy= f'{user_id}_sample_rate_copy'


    if redis_client.exists(key_audio_data_copy):
        socket_io.emit('loading')
        audio_data = redis_client.lrange(key_audio_data_copy, 0, -1) 
        sample_rate = int(redis_client.get(key_sample_rate_copy))

        combined_audio = np.concatenate([(np.frombuffer(chunk, dtype=np.float32)) for chunk in audio_data])
        combined_audio = (combined_audio * 32767).astype(np.int16)  
        audio_file = io.BytesIO()
        wavfile.write(audio_file, sample_rate, combined_audio)
        audio_file.seek(0)
        max_value_combined = np.iinfo(combined_audio.dtype).max
        combined_audio = combined_audio / max_value_combined
        sound_save_audio = parselmouth.Sound(combined_audio, sampling_frequency=sample_rate)
        data_to_send_save_audio= analyze_audio(sound_save_audio, False, max_value_combined)

        data_to_send_auido_data = {
            'plot_data': data_to_send_save_audio,  
            'audio': audio_file.read()  
        }
        redis_client.delete(key_audio_data_copy)
        redis_client.delete(key_sample_rate_copy)
        socket_io.emit('plot_save_audio', data_to_send_auido_data)


if __name__ == '__main__':
    socket_io.run(app, debug=True)
