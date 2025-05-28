// eye-monitor.js

class EyeMonitor {
    constructor({ threshold = 0.29, duration = 1000, alarmUrl = null } = {}) { // <-- Ajuste o threshold aqui
        this.threshold = threshold; // Vamos tentar 0.27 como um bom ponto de partida
        this.duration = duration;
        this.alarmUrl = alarmUrl || 'https://soundbible.com/grab.php?id=2197&type=mp3';

        this.eyesClosedStart = null;
        this.isAlarmOn = false;

        this.alarmAudio = null;
        this.alertBox = null;
        this.instantFeedbackBox = null;
        this._setupUI();
    }

    _setupUI() {
        this.alertBox = document.createElement('div');
        this.alertBox.textContent = '⚠️ OLHOS FECHADOS! ALARME DISPARADO!'; // Mensagem ajustada
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
 // --- NOVO ELEMENTO PARA FEEDBACK INSTANTÂNEO ---
        this.instantFeedbackBox = document.createElement('div');
        this.instantFeedbackBox.textContent = '👁️ OLHOS FECHADOS 👁️';
        Object.assign(this.instantFeedbackBox.style, {
            display: 'none', // Começa escondido
            position: 'fixed',
            top: '100px', // Posição abaixo do alerta de alarme
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFEB3B', // Amarelo para indicar alerta, não alarme
            color: '#333',
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '8px',
            zIndex: 9998, // Z-index menor que o do alarme
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        });
        document.body.appendChild(this.instantFeedbackBox);
        // --- FIM DO NOVO ELEMENTO ---
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

    const left = detection.landmarks.getLeftEye();
    const right = detection.landmarks.getRightEye();
    const ear = (this._ear(left) + this._ear(right)) / 2;

    console.log(`EAR: ${ear.toFixed(3)}`); // ← Mostra o valor ao vivo
        // --- Lógica para o feedback instantâneo ---
        const instantThreshold = 0.299; // Limiar para o feedback instantâneo
        if (ear < instantThreshold) {
            this.instantFeedbackBox.style.display = 'block';
        } else {
            this.instantFeedbackBox.style.display = 'none';
        }
        // --- Fim da lógica para o feedback instantâneo ---

    if (ear < this.threshold) {
        if (!this.eyesClosedStart) this.eyesClosedStart = Date.now();
        const elapsed = Date.now() - this.eyesClosedStart;
        if (elapsed >= this.duration && !this.isAlarmOn) {
            this._triggerAlarm();
        }
    } else {
        this._reset();
    }
}


    _ear(eye) {
        const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        const v1 = dist(eye[1], eye[5]);
        const v2 = dist(eye[2], eye[4]);
        const h = dist(eye[0], eye[3]);
        return (v1 + v2) / (2.0 * h);
    }

    _triggerAlarm() {
        this.isAlarmOn = true;
        this.alertBox.style.display = 'block';
        this.alarmAudio.play().catch(err => console.warn('Som bloqueado:', err));
    }

    _reset() {
        this.eyesClosedStart = null;
        if (this.isAlarmOn) {
            this.isAlarmOn = false;
            this.alertBox.style.display = 'none';
            this.alarmAudio.pause();
            this.alarmAudio.currentTime = 0;
        }
        this.instantFeedbackBox.style.display = 'none';
    }
}

window.EyeMonitor = EyeMonitor;
