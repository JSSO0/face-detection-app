// main.js

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const startButton = document.getElementById('start-camera');
    const ctx = canvas.getContext('2d');
    let isModelLoaded = false;

    const countdownEl = document.createElement('div');
    Object.assign(countdownEl.style, {
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#333',
        color: 'white',
        padding: '10px 20px',
        fontSize: '18px',
        borderRadius: '5px',
        zIndex: 9999,
        display: 'none'
    });
    document.body.appendChild(countdownEl);

    const eyeMonitor = new EyeMonitor();
    let countdownInterval = null;

    async function loadModels() {
        try {
            const modelUrl = 'https://justadudewhohacks.github.io/face-api.js/models';
            await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
            await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
            isModelLoaded = true;
            console.log('Modelos carregados com sucesso!');
        } catch (error) {
            console.error('Erro ao carregar modelos:', error);
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = stream;

            video.addEventListener('play', () => {
                const displaySize = { width: video.width, height: video.height };
                faceapi.matchDimensions(canvas, displaySize);

                setInterval(async () => {
                    if (!isModelLoaded) return;

                    const detections = await faceapi.detectAllFaces(
                        video,
                        new faceapi.TinyFaceDetectorOptions()
                    ).withFaceLandmarks();

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    faceapi.draw.drawDetections(canvas, resizedDetections);
                    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

                    if (resizedDetections.length > 0) {
                        const face = resizedDetections[0];
                        eyeMonitor.update(face);

                        if (eyeMonitor.eyesClosedStart && !eyeMonitor.isAlarmOn) {
                            const timeLeft = Math.ceil((eyeMonitor.duration - (Date.now() - eyeMonitor.eyesClosedStart)) / 1000);
                            countdownEl.textContent = `Alarme em ${timeLeft}s`;
                            countdownEl.style.display = 'block';
                        } else {
                            countdownEl.style.display = 'none';
                        }

                        console.log('Rosto detectado!');
                    } else {
                        eyeMonitor.update(null);
                        countdownEl.style.display = 'none';
                    }

                }, 100);
            });

        } catch (error) {
            console.error('Erro ao acessar a câmera:', error);
            alert('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
        }
    }

    startButton.addEventListener('click', async () => {
        startButton.textContent = 'Carregando...';
        startButton.disabled = true;

        await loadModels();
        startCamera();

        startButton.textContent = 'Câmera Ativada';
    });
});