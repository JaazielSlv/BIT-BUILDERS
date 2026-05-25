import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { estimateSingle } from "./benchmark/estimator.js";

// Normalização de nomes para corresponder ao padrão usado pelo injetor
const toImageFile = (nome) =>
    nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

// Definição das coleções que você criou no Firebase
const collections = ["processadores", "placamae", "gpu", "ram", "fonte"];
const dadosMemoria = {}; // Guardará os componentes para fácil acesso

// Função para buscar dados do Firebase
async function loadComponents() {
    for (const col of collections) {
        const selectEl = document.getElementById(col);
        const querySnapshot = await getDocs(collection(db, col));

        // Limpar select
        selectEl.innerHTML = `<option value="">Selecione uma opção...</option>`;
        
        dadosMemoria[col] = {}; // Inicializa grupo

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            dadosMemoria[col][doc.id] = data; // Armazena na memória local

            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = data.nome;
            selectEl.appendChild(option);
        });

        // Adiciona evento de mudança para atualizar a imagem e salvar sessão
        selectEl.addEventListener("change", (e) => {
            sessionStorage.setItem(`escolha_${col}`, e.target.value);
            updateImage(col, e.target.value);
        });

        // Restaura escolha salva (se houver) ao carregar a página
        const savedChoice = sessionStorage.getItem(`escolha_${col}`);
        if (savedChoice && dadosMemoria[col][savedChoice]) {
            selectEl.value = savedChoice;
            updateImage(col, savedChoice);
        }
    }
}

// Atualizar imagem baseada na seleção
window.updateImage = function(tipo, docId) {
    const imgEl = document.getElementById(`${tipo}-img`);
    const linkEl = document.getElementById(`${tipo}-link`);

    if (docId && dadosMemoria[tipo][docId]) {
        const produto = dadosMemoria[tipo][docId];
        
        // Atualiza a imagem
        const fallback = `./img/${toImageFile(produto.nome)}.png`;
        imgEl.src = (produto.imagemUrl && produto.imagemUrl.trim()) ? produto.imagemUrl : fallback;
        imgEl.style.display = "block";
        imgEl.style.cursor = "pointer";
        imgEl.title = "Abrir ficha técnica";

        // Prepara página de detalhes dinâmicos na mesma aba
        linkEl.href = `ficha_tecnica.html?tipo=${tipo}&id=${docId}`;
        linkEl.style.display = "block";
        imgEl.onclick = () => window.location.href = linkEl.href;
    } else {
        imgEl.style.display = "none";
        linkEl.style.display = "none";
        imgEl.onclick = null;
        imgEl.title = "";
    }
};

// Verificar compatibilidade
document.getElementById("btn-check").addEventListener("click", () => {
    const cyberDisplay = document.getElementById("cyber-display");
    const resultTitle = document.getElementById("result-title");
    const resEl = document.getElementById("compatibility-result");
    
    const loadAnim = document.getElementById("loading-anim");
    const sucAnim = document.getElementById("success-anim");
    const failAnim = document.getElementById("failure-anim");

    const p = document.getElementById("processadores").value;
    const m = document.getElementById("placamae").value;
    const g = document.getElementById("gpu").value;
    const r = document.getElementById("ram").value;
    const f = document.getElementById("fonte").value;

    resEl.style.display = "none";
    sucAnim.style.display = "none";
    failAnim.style.display = "none";
    cyberDisplay.style.display = "none";
    resultTitle.style.display = "none";

    if (!p || !m || !g || !r || !f) {
        showToast("Por favor, selecione todas as 5 peças para testar (inclusive a fonte)!", "error");
        return;
    }

    resultTitle.style.display = "block";
    cyberDisplay.style.display = "flex";
    loadAnim.style.display = "flex";

    // Simulação do tempo de processamento de checagem retro
    setTimeout(() => {
        loadAnim.style.display = "none";
        resEl.style.display = "block";

        // Obtendo os objetos com os dados do banco de dados na memória
        const procData = dadosMemoria["processadores"][p];
        const placaData = dadosMemoria["placamae"][m];
        const ramData = dadosMemoria["ram"][r];
        const gpuData = dadosMemoria["gpu"][g];
        const fonteData = dadosMemoria["fonte"][f];

        let erros = [];

        // Verifica compatibilidade de Socket (Processador x Placa-Mãe)
        if (procData.socket && placaData.socket) {
            if (procData.socket !== placaData.socket) {
                erros.push(`[SOCKET] Incompatível: Processador tem socket ${procData.socket}, mas a Placa-mãe suporta ${placaData.socket}.`);
            }
        }

        // Verifica compatibilidade de RAM (Memória x Placa-Mãe)
        if (ramData.tipo_ram && placaData.tipo_ram) {
            if (ramData.tipo_ram !== placaData.tipo_ram) {
                erros.push(`[RAM] Incompatível: A memória é ${ramData.tipo_ram}, mas a Placa-mãe suporta apenas ${placaData.tipo_ram}.`);
            }
        }

        // Verifica compatibilidade Pelo Consumo (TDP) vs Fonte
        const consumoProc = Number(procData.tdp) || 0;
        const consumoPlaca = Number(placaData.tdp) || 40; // margem se n tiver
        const consumoRam = Number(ramData.tdp) || 10;
        const consumoGpu = Number(gpuData.tdp) || 0;
        
        const consumoTotal = consumoProc + consumoPlaca + consumoRam + consumoGpu + 50; // +50W de margem pra fans e discos
        const potenciaFonte = Number(fonteData.potencia) || 0;

        if (consumoTotal > potenciaFonte) {
            erros.push(`[ENERGIA] Risco de Desligamento: O PC consome até ${consumoTotal}W, mas a Fonte entrega apenas ${potenciaFonte}W.`);
        }

        // Exibe o resultado baseado nos erros
        if (erros.length === 0) {
            const estimatedFps = estimateSingle({
                gpu: gpuData.nome,
                cpu: procData.nome,
                ram: ramData.nome,
                res: "1080",
                game: "cyberpunk",
                board: placaData.nome,
            });

            const benchmarkUrl = new URL("benchmark.html", window.location.href);
            benchmarkUrl.searchParams.set("game", "cyberpunk");
            benchmarkUrl.searchParams.set("res", "1080");
            benchmarkUrl.searchParams.set("build", btoa(unescape(encodeURIComponent(JSON.stringify({
                processador: procData,
                placaMae: placaData,
                gpu: gpuData,
                ram: ramData,
                fonte: fonteData,
                estimatedFps,
                game: "cyberpunk",
                res: "1080",
            })))));

            window.location.href = benchmarkUrl.toString();

            resEl.style.color = "#00f0ff";
            resEl.innerHTML = `COMPATIBILIDADE VERIFICADA!<br>Consumo Máx. Estimado: ${consumoTotal}W / Fonte: ${potenciaFonte}W<br>FPS ESTIMADO (1080p): ${estimatedFps} FPS<br>SISTEMA PRONTO PARA BOOT.`;
            resEl.style.borderColor = "#00f0ff";
            sucAnim.style.display = "flex";
            cyberDisplay.style.borderColor = "#00f0ff";
            cyberDisplay.style.boxShadow = "0 0 20px rgba(0, 240, 255, 0.4)";
        } else {
            resEl.style.color = "#ff0055";
            resEl.innerHTML = "FALHA CRÍTICA!<br>" + erros.join("<br>");
            resEl.style.borderColor = "#ff0055";
            failAnim.style.display = "flex";
            cyberDisplay.style.borderColor = "#ff0055";
            cyberDisplay.style.boxShadow = "0 0 20px rgba(255, 0, 85, 0.4)";
        }

    }, 2500); // 2.5s for cool animation effect
});

// Inicialização
window.addEventListener("DOMContentLoaded", loadComponents);
// Função de Toast Estilizado
function showToast(message, type = 'info') {
    let container = document.getElementById('cyber-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'cyber-toast-container';
        container.className = 'cyber-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `cyber-toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Animate out
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
