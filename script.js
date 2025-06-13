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
            const modelUrl = '/models'; // Caminho para seus modelos locais
            await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
            await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
            // Se você quiser detecção de expressão facial (para bocejos mais avançados)
            // await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl);
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

// Criar lista de sonecas
const sleepList = document.createElement('ul');
sleepList.style = 'position:fixed;bottom:10px;right:10px;max-height:200px;overflow:auto;background:#fff;padding:10px;border:1px solid #ccc;border-radius:5px;font-family:sans-serif;font-size:14px;z-index:9999;';
document.body.appendChild(sleepList);

// Escuta evento de nova soneca
window.addEventListener('sleep-logged', e => {
    const { start, end } = e.detail;
    const li = document.createElement('li');
    li.textContent = `😴 Início: ${new Date(start).toLocaleTimeString()} → Fim: ${new Date(end).toLocaleTimeString()}`;
    sleepList.appendChild(li);
});