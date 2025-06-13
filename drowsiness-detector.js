// drowsiness-detector.js + API sleep log integration

class DrowsinessDetector {
    constructor({
        eyeClosedThreshold = 0.299,
        eyeInstantThreshold = 0.299,
        mouthOpenThreshold = 0.6,
        eyeDuration = 3000,
        yawnDuration = 2000,
        alarmUrl = null
    } = {}) {
        this.eyeClosedThreshold = eyeClosedThreshold;
        this.eyeInstantThreshold = eyeInstantThreshold;
        this.mouthOpenThreshold = mouthOpenThreshold;
        this.eyeDuration = eyeDuration;
        this.yawnDuration = yawnDuration;
        this.alarmUrl = alarmUrl || 'https://soundbible.com/grab.php?id=2197&type=mp3';

        this.eyesClosedStart = null;
        this.yawnStart = null;
        this.isAlarmOn = false;
        this.isYawning = false;
        this.sleepStart = null;
        this.token = null;

        this.alarmAudio = null;
        this.alertBox = null;
        this.instantEyeFeedbackBox = null;
        this.yawnFeedbackBox = null;
        this._setupUI();
    }

    async _login() {
        if (this.token) return;
        try {
            const res = await fetch('https://dont-sleepy-back.fly.dev/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'sjoely131@gmail.com',
                    password: 'suasenha123'
                })
            });
            const data = await res.json();
            this.token = data.token;
        } catch (err) {
            console.error('Login failed:', err);
        }
    }

    async _sendSleepData(start, end) {
        if (!this.token || !start || !end) return;
        try {
            await fetch('https://dont-sleepy-back.fly.dev/sleep', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ start, end })
            });
        } catch (err) {
            console.error('Failed to send sleep data:', err);
        }
    }

    async _triggerAlarm() {
        this.isAlarmOn = true;
        this.sleepStart = new Date().toISOString();
        this.alertBox.style.display = 'block';
        this.alarmAudio.play().catch(err => console.warn('Som bloqueado:', err));
        await this._login();
    }

async _resetAlarm() {
    this.isAlarmOn = false;
    this.alertBox.style.display = 'none';
    this.alarmAudio.pause();
    this.alarmAudio.currentTime = 0;

    const end = new Date().toISOString();
    const start = this.sleepStart;
    this.sleepStart = null;

    await this._sendSleepData(start, end);

    // ✅ Dispara evento personalizado
    window.dispatchEvent(new CustomEvent('sleep-logged', {
        detail: { start, end }
    }));
}

    _setupUI() {
        this.alertBox = document.createElement('div');
        this.alertBox.textContent = '⚠️ ALERTA DE SONOLÊNCIA! ACORDE!';
        Object.assign(this.alertBox.style, {
            display: 'none', position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#e53935', color: 'white', padding: '15px 30px', fontSize: '20px', fontWeight: 'bold',
            borderRadius: '10px', zIndex: 9999, boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(this.alertBox);

        this.instantEyeFeedbackBox = document.createElement('div');
        this.instantEyeFeedbackBox.textContent = '👁️ OLHOS FECHADOS! 😴';
        Object.assign(this.instantEyeFeedbackBox.style, {
            display: 'none', position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#FFEB3B', color: '#333', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold',
            borderRadius: '8px', zIndex: 9998, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        });
        document.body.appendChild(this.instantEyeFeedbackBox);

        this.yawnFeedbackBox = document.createElement('div');
        this.yawnFeedbackBox.textContent = '😮 BOCEJO DETECTADO!';
        Object.assign(this.yawnFeedbackBox.style, {
            display: 'none', position: 'fixed', top: '170px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#66BB6A', color: 'white', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold',
            borderRadius: '8px', zIndex: 9997, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
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
        const mouth = detection.landmarks.getMouth();

        const ear = (this._ear(leftEye) + this._ear(rightEye)) / 2;
        const mar = this._mar(mouth);

        if (ear < this.eyeInstantThreshold) {
            this.instantEyeFeedbackBox.style.display = 'block';
        } else {
            this.instantEyeFeedbackBox.style.display = 'none';
        }

        if (mar > this.mouthOpenThreshold) {
            if (!this.yawnStart) this.yawnStart = Date.now();
            const elapsedYawn = Date.now() - this.yawnStart;
            if (elapsedYawn >= this.yawnDuration && !this.isYawning) {
                this.isYawning = true;
                this.yawnFeedbackBox.style.display = 'block';
            }
        } else {
            this.yawnStart = null;
            if (this.isYawning) {
                this.isYawning = false;
                this.yawnFeedbackBox.style.display = 'none';
            }
        }

        if (ear < this.eyeClosedThreshold) {
            if (!this.eyesClosedStart) this.eyesClosedStart = Date.now();
            const elapsedEye = Date.now() - this.eyesClosedStart;
            if (elapsedEye >= this.eyeDuration && !this.isAlarmOn) {
                this._triggerAlarm();
            }
        } else {
            this.eyesClosedStart = null;
            if (this.isAlarmOn) {
                this._resetAlarm();
            }
        }
    }

    _ear(eye) {
        const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        const v1 = dist(eye[1], eye[5]);
        const v2 = dist(eye[2], eye[4]);
        const h = dist(eye[0], eye[3]);
        return (v1 + v2) / (2.0 * h);
    }

    _mar(mouth) {
        const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        const v1 = dist(mouth[2], mouth[10]);
        const v2 = dist(mouth[3], mouth[9]);
        const v3 = dist(mouth[4], mouth[8]);
        const h = dist(mouth[0], mouth[6]);
        return (v1 + v2 + v3) / (3.0 * h);
    }

    _reset() {
        this.eyesClosedStart = null;
        this.yawnStart = null;
        this.isYawning = false;
        this._resetAlarm();
        this.instantEyeFeedbackBox.style.display = 'none';
        this.yawnFeedbackBox.style.display = 'none';
    }
}

window.DrowsinessDetector = DrowsinessDetector;
