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
        fontWeight: 'bold', // Adicionado para destacar
        borderRadius: '5px',
        zIndex: 9999,
        display: 'none'
    });
    document.body.appendChild(countdownEl);

    // --- MUDANÇA AQUI: Instancia DrowsinessDetector ---
    const drowsinessDetector = new DrowsinessDetector();
    // --- FIM DA MUDANÇA ---

async function loadModels() {
    try {
        const modelUrl = 'https://jsso0.github.io/face-detection-app/models/';
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://github.com/JSSO0/face-detection-app/blob/main/models/tiny_face_detector_model-weights_manifest.json');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://github.com/JSSO0/face-detection-app/blob/main/models/face_landmark_68_model-weights_manifest.json');
        // Se você quiser detecção de expressão facial (para bocejos mais avançados)
        // await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl + 'face_expression_model-weights_manifest.json');
        isModelLoaded = true;
        console.log('Modelos de detecção de sonolência carregados com sucesso de:', modelUrl);
    } catch (error) {
        console.error('Erro ao carregar modelos para detecção de sonolência:', error);
        alert('Não foi possível carregar os modelos. Verifique o console e o caminho dos modelos.');
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
                    // .withFaceExpressions(); // Adicione se estiver usando faceExpressionNet

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    faceapi.draw.drawDetections(canvas, resizedDetections);
                    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                    // faceapi.draw.drawFaceExpressions(canvas, resizedDetections); // Desenha expressões se usar o modelo

                    if (resizedDetections.length > 0) {
                        const face = resizedDetections[0];
                        // --- MUDANÇA AQUI: Chama o método update da nova classe ---
                        drowsinessDetector.update(face);

                        // --- MUDANÇA AQUI: Ajusta as referências para a nova classe ---
                        if (drowsinessDetector.eyesClosedStart && !drowsinessDetector.isAlarmOn) {
                            const timeLeft = Math.ceil((drowsinessDetector.eyeDuration - (Date.now() - drowsinessDetector.eyesClosedStart)) / 1000);
                            countdownEl.textContent = `Alarme em ${timeLeft}s (Olhos)`;
                            countdownEl.style.display = 'block';
                        } else {
                            countdownEl.style.display = 'none';
                        }
                        // --- FIM DA MUDANÇA ---

                    } else {
                        // --- MUDANÇA AQUI: Chama o método update da nova classe ---
                        drowsinessDetector.update(null);
                        // --- FIM DA MUDANÇA ---
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