// drowsiness-detector.js

class DrowsinessDetector {
    constructor({
        eyeClosedThreshold = 0.299, // Limiar EAR para olhos fechados (para alarme principal)
        eyeInstantThreshold = 0.299, // Limiar EAR para feedback imediato "olhos fechados"
        mouthOpenThreshold = 0.6, // Limiar MAR para boca aberta (bocejo)
        eyeDuration = 3000,      // Duração (ms) para alarme de olhos fechados
        yawnDuration = 2000,     // Duração (ms) para confirmar um bocejo contínuo
        alarmUrl = null
    } = {}) {
        this.eyeClosedThreshold = eyeClosedThreshold;
        this.eyeInstantThreshold = eyeInstantThreshold;
        this.mouthOpenThreshold = mouthOpenThreshold;
        this.eyeDuration = eyeDuration;
        this.yawnDuration = yawnDuration;
        this.alarmUrl = alarmUrl || 'https://soundbible.com/grab.php?id=2197&type=mp3';

        this.eyesClosedStart = null;
        this.yawnStart = null; // Tempo de início do bocejo
        this.isAlarmOn = false;
        this.isYawning = false; // Flag para indicar se a pessoa está bocejando

        this.alarmAudio = null;
        this.alertBox = null;
        this.instantEyeFeedbackBox = null;
        this.yawnFeedbackBox = null; // Novo elemento para feedback de bocejo
        this._setupUI();
    }

    _setupUI() {
        // Alerta de Alarme Principal (para olhos fechados prolongados)
        this.alertBox = document.createElement('div');
        this.alertBox.textContent = '⚠️ ALERTA DE SONOLÊNCIA! ACORDE!';
        Object.assign(this.alertBox.style, {
            display: 'none',
            position: 'fixed',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#e53935',
            color: 'white',
            padding: '15px 30px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '10px',
            zIndex: 9999,
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(this.alertBox);

        // Feedback Instantâneo para Olhos Fechados
        this.instantEyeFeedbackBox = document.createElement('div');
        this.instantEyeFeedbackBox.textContent = '👁️ OLHOS FECHADOS! 😴';
        Object.assign(this.instantEyeFeedbackBox.style, {
            display: 'none',
            position: 'fixed',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFEB3B', // Amarelo
            color: '#333',
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '8px',
            zIndex: 9998,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        });
        document.body.appendChild(this.instantEyeFeedbackBox);

        // Feedback para Bocejos
        this.yawnFeedbackBox = document.createElement('div');
        this.yawnFeedbackBox.textContent = '😮 BOCCEJO DETECTADO!';
        Object.assign(this.yawnFeedbackBox.style, {
            display: 'none',
            position: 'fixed',
            top: '170px', // Posição abaixo dos outros alertas
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#66BB6A', // Verde suave
            color: 'white',
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '8px',
            zIndex: 9997,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        });
        document.body.appendChild(this.yawnFeedbackBox);


        this.alarmAudio = document.createElement('audio');
        this.alarmAudio.src = this.alarmUrl;
        this.alarmAudio.loop = true;
        document.body.appendChild(this.alarmAudio);
    }

    update(detection) {
        if (!detection?.landmarks) {
            this._reset();
            return;
        }

        const leftEye = detection.landmarks.getLeftEye();
        const rightEye = detection.landmarks.getRightEye();
        const mouth = detection.landmarks.getMouth(); // Obter marcos da boca

        const ear = (this._ear(leftEye) + this._ear(rightEye)) / 2;
        const mar = this._mar(mouth); // Calcular Mouth Aspect Ratio

        console.log(`EAR: ${ear.toFixed(3)} | MAR: ${mar.toFixed(3)}`);

        // Lógica de Feedback Instantâneo para Olhos Fechados
        if (ear < this.eyeInstantThreshold) {
            this.instantEyeFeedbackBox.style.display = 'block';
        } else {
            this.instantEyeFeedbackBox.style.display = 'none';
        }

        // Lógica para detecção de Bocejo (MAR)
        if (mar > this.mouthOpenThreshold) {
            if (!this.yawnStart) {
                this.yawnStart = Date.now();
            }
            const elapsedYawn = Date.now() - this.yawnStart;
            if (elapsedYawn >= this.yawnDuration && !this.isYawning) {
                this.isYawning = true;
                this.yawnFeedbackBox.style.display = 'block';
                // Opcional: Acionar um som diferente ou um alarme mais suave para bocejo
            }
        } else {
            this.yawnStart = null;
            if (this.isYawning) {
                this.isYawning = false;
                this.yawnFeedbackBox.style.display = 'none';
            }
        }

        // Lógica Principal de Alarme (Olhos Fechados Prolongados)
        if (ear < this.eyeClosedThreshold) {
            if (!this.eyesClosedStart) this.eyesClosedStart = Date.now();
            const elapsedEye = Date.now() - this.eyesClosedStart;
            if (elapsedEye >= this.eyeDuration && !this.isAlarmOn) {
                this._triggerAlarm();
            }
        } else {
            // Se os olhos abrirem, resetar o contador de olhos fechados
            this.eyesClosedStart = null;
            if (this.isAlarmOn) { // Se o alarme estiver ligado, desliga
                this._resetAlarm();
            }
        }
    }

    // Calcula o Eye Aspect Ratio (EAR)
    _ear(eye) {
        const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        // Pontos verticais: 1 e 5, 2 e 4
        const v1 = dist(eye[1], eye[5]);
        const v2 = dist(eye[2], eye[4]);
        // Pontos horizontais: 0 e 3
        const h = dist(eye[0], eye[3]);
        return (v1 + v2) / (2.0 * h);
    }

    // Calcula o Mouth Aspect Ratio (MAR) para detecção de bocejo
    _mar(mouth) {
        const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        // Pontos verticais da boca: 2 e 10, 3 e 9, 4 e 8
        const v1 = dist(mouth[2], mouth[10]);
        const v2 = dist(mouth[3], mouth[9]);
        const v3 = dist(mouth[4], mouth[8]);
        // Pontos horizontais da boca: 0 e 6
        const h = dist(mouth[0], mouth[6]);
        return (v1 + v2 + v3) / (3.0 * h); // Média das distâncias verticais
    }

    _triggerAlarm() {
        this.isAlarmOn = true;
        this.alertBox.style.display = 'block';
        this.alarmAudio.play().catch(err => console.warn('Som bloqueado:', err));
    }

    _resetAlarm() {
        this.isAlarmOn = false;
        this.alertBox.style.display = 'none';
        this.alarmAudio.pause();
        this.alarmAudio.currentTime = 0;
    }

    // Método de reset geral para quando nenhum rosto é detectado ou quando tudo volta ao normal
    _reset() {
        this.eyesClosedStart = null;
        this.yawnStart = null;
        this.isYawning = false;
        this._resetAlarm(); // Garante que o alarme esteja desligado
        this.instantEyeFeedbackBox.style.display = 'none';
        this.yawnFeedbackBox.style.display = 'none';
    }
}

window.DrowsinessDetector = DrowsinessDetector;