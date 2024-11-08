﻿# AudioLab

**Descripción**

AudioLab es una herramienta interactiva para el análisis de audio en tiempo real y archivos de audio .wav. Esta aplicación web permite visualizar y analizar características acústicas como el espectrograma, oscilograma, frecuencia fundamental, intensidad, y formantes. Existen dos versiones del proyecto:

    
    Incluye archivos de Python (con Flask, Flask-SocketIO y Redis) que permiten el análisis de audio en tiempo real y el procesamiento de archivos .wav. Esta versión requiere configuración de servidor y entornos adicionales para el procesamiento completo de audio.

**Estructura del Proyecto**

    static/: Contiene los archivos de la interfaz estática, incluyendo, CSS, y JavaScript.
    templates/: Archivos HTML para la interfaz de usuario de la versión completa.
    app.py: Archivo principal de Flask que inicializa el servidor, establece la conexión con Redis y gestiona las rutas para el análisis de audio.
    audio_analysis.py: Módulo de Python que realiza el análisis del audio (frecuencia, intensidad, formantes, espectrograma) usando Parselmouth y SciPy.
    README.md: Archivo de documentación del proyecto.
    requirements.txt: Lista de dependencias necesarias para ejecutar la versión completa del proyecto.

**Requisitos**

    Python 3.8 o superior
    Flask: Framework de servidor web.
    Flask-SocketIO: Para la comunicación en tiempo real entre cliente y servidor.
    Redis: Base de datos en memoria para almacenar temporalmente datos de la sesión de audio.
    Parselmouth y SciPy: Librerías de procesamiento de audio.
    Un navegador compatible con HTML, CSS y JavaScript.

**Uso**

   La aplicación permite capturar audio en tiempo real, analizar archivos .wav, y visualizar resultados en gráficas interactivas.

**Funcionalidades**

    Análisis de Audio en Tiempo Real: Captura audio del micrófono y visualiza el análisis en tiempo real.
    Análisis de Archivos .wav: Carga un archivo .wav y realiza análisis acústico.
    Visualización: Muestra gráficas de espectrograma, oscilograma, frecuencia fundamental, intensidad y formantes.

**Consideraciones de Seguridad**

    Este proyecto no almacena datos en una base de datos permanente. Toda la información de audio se maneja temporalmente en Redis y se elimina al cerrar la sesión. Además, no se requiere información personal del usuario.


**Dependencias**

    Este proyecto usa las siguientes librerías:
    
    - Plotly - Licensed under the MIT License.
      - Official Website: [Plotly](https://plotly.com/)
      - GitHub Repository: [Plotly on GitHub](https://github.com/plotly/plotly.py)
    
    - Flask -Licensed under the BSD-3-Clause License.
      - Official Website: [Flask](https://flask.palletsprojects.com/)
      - GitHub Repository: [Flask on GitHub](https://github.com/pallets/flask)
    
    - Parselmouth - Licensed under the GNU General Public License (GPL). 
      - GitHub Repository: [Parselmouth on GitHub](https://github.com/YannickJadoul/Parselmouth)

    - **Redis** - Licensed under the BSD 3-Clause License.
     - Official Website: [Redis](https://redis.io/)
     - GitHub Repository: [Redis on GitHub](https://github.com/redis/redis)
