// const AudioWorkletProcessor = globalThis.AudioWorkletProcessor || class {};
// const registerProcessor = globalThis.registerProcessor || function () {};

class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        // Tomar el primer canal del primer buffer de entrada
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            
            // Enviar los datos de audio al hilo principal para su posterior envío al servidor
            this.port.postMessage(channelData);
        }

        // Mantener el procesador activo
        return true;
    }
}

// Registrar el procesador para que el `AudioWorkletNode` pueda encontrarlo
registerProcessor('audio-processor', AudioProcessor);
