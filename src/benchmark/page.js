import { db } from "../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { estimateSingle } from "./estimator.js";

const fieldLabels = {
    nome: "Nome",
    descricao: "Resumo",
    socket: "Socket",
    chipset: "Chipset",
    formato: "Formato",
    tipo_ram: "Tipo de RAM",
    slots_ram: "Slots de RAM",
    max_ram: "RAM Máxima",
    slots_m2: "Slots M.2",
    wifi: "Wi-Fi",
    pcie: "PCIe",
    rede: "Rede",
    vrm: "VRM",
    tdp: "TDP",
    potencia: "Potência",
    cores: "Núcleos",
    threads: "Threads",
    cache_l3: "Cache L3",
    boost: "Boost",
    arquitetura: "Arquitetura",
    video_integrado: "Vídeo Integrado",
    vram: "VRAM",
    memoria_video: "Memória de Vídeo",
    barramento: "Barramento",
    conector: "Conector",
    fonte_recomendada: "Fonte Recomendada",
    recursos: "Recursos",
    capacidade: "Capacidade",
    frequencia: "Frequência",
    latencia: "Latência",
    perfil: "Perfil",
    certificacao: "Certificação",
    modular: "Modularidade",
    pfc: "PFC",
    fan: "Ventoinha",
};

function formatValue(value) {
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function renderDetail(label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "detail-item";

    const labelEl = document.createElement("div");
    labelEl.className = "detail-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("div");
    valueEl.className = "detail-value";
    valueEl.textContent = formatValue(value);

    wrapper.append(labelEl, valueEl);
    return wrapper;
}

function toRamGb(value) {
    const text = String(value || "");
    const match = text.match(/(\d{1,3})\s*GB/i) || text.match(/\b(\d{1,3})\b/);
    return match ? Number(match[1]) : 16;
}

function setSelectValue(select, desiredValue) {
    if (!select || !desiredValue) return;
    const hasValue = Array.from(select.options).some((option) => option.value === desiredValue);
    if (hasValue) select.value = desiredValue;
}

function decodeBuildPayload() {
    const payload = new URLSearchParams(window.location.search).get("build");
    if (!payload) return null;
    try {
        return JSON.parse(decodeURIComponent(escape(atob(payload))));
    } catch {
        return null;
    }
}

async function fetchDocData(collectionName, docId) {
    if (!collectionName || !docId) return null;
    const snapshot = await getDoc(doc(db, collectionName, docId));
    if (!snapshot.exists()) return null;
    return snapshot.data();
}

function getStoredBuild() {
    const params = new URLSearchParams(window.location.search);
    return {
        pcol: params.get("pcol"),
        pid: params.get("pid"),
        mcol: params.get("mcol"),
        mid: params.get("mid"),
        gcol: params.get("gcol"),
        gid: params.get("gid"),
        rcol: params.get("rcol"),
        rid: params.get("rid"),
        fcol: params.get("fcol"),
        fid: params.get("fid"),
        game: params.get("game") || "cyberpunk",
        res: params.get("res") || "1080",
    };
}

async function hydrateBuild() {
    const summaryEl = document.getElementById("benchmark-summary-list");
    const subtitleEl = document.getElementById("benchmark-subtitle");
    const statusEl = document.getElementById("benchmark-status");
    const outputEl = document.getElementById("output");
    const payloadBuild = decodeBuildPayload();
    if (payloadBuild?.processador && payloadBuild?.placaMae && payloadBuild?.gpu && payloadBuild?.ram && payloadBuild?.fonte) {
        if (subtitleEl) {
            subtitleEl.textContent = "A estimação de FPS abaixo foi gerada com base em calculos Tecnicos dos componentes.";
        }

        if (statusEl) {
            statusEl.textContent = "validado";
        }

        if (summaryEl) {
            summaryEl.innerHTML = "";
            const parts = [
                ["Processador", payloadBuild.processador],
                ["Placa-Mãe", payloadBuild.placaMae],
                ["Placa de Vídeo", payloadBuild.gpu],
                ["Memória RAM", payloadBuild.ram],
                ["Fonte", payloadBuild.fonte],
            ];
            parts.forEach(([label, item]) => {
                if (!item) return;
                summaryEl.append(renderDetail(label, item.nome || item.descricao || item));
                Object.entries(item)
                    .filter(([key, value]) => !["nome", "imagemUrl", "descricao", "data_criacao", "createdAt", "dataCriacao"].includes(key))
                    .filter(([, value]) => value !== undefined && value !== null && value !== "")
                    .slice(0, 6)
                    .forEach(([key, value]) => {
                        summaryEl.append(renderDetail(fieldLabels[key] || key, value));
                    });
            });
        }

        if (outputEl && payloadBuild.estimatedFps) {
            outputEl.hidden = false;
            outputEl.innerHTML = `<strong>Estimativa inicial:</strong> ~${payloadBuild.estimatedFps} FPS<br><div class="muted">Carregada automaticamente da montagem validada.</div>`;
        }

        return {
            processador: payloadBuild.processador,
            placaMae: payloadBuild.placaMae,
            gpu: payloadBuild.gpu,
            ram: payloadBuild.ram,
            fonte: payloadBuild.fonte,
            game: payloadBuild.game || "cyberpunk",
            res: payloadBuild.res || "1080",
        };
    }

    const params = getStoredBuild();
    const hasParams = params.pcol && params.pid && params.mcol && params.mid && params.gcol && params.gid && params.rcol && params.rid && params.fcol && params.fid;

    if (!hasParams) {
        if (subtitleEl) subtitleEl.textContent = "Nenhuma montagem validada foi recebida ainda. Você ainda pode testar manualmente o estimador.";
        if (statusEl) statusEl.textContent = "manual";
        return { params };
    }

    const [processador, placaMae, gpu, ram, fonte] = await Promise.all([
        fetchDocData(params.pcol, params.pid),
        fetchDocData(params.mcol, params.mid),
        fetchDocData(params.gcol, params.gid),
        fetchDocData(params.rcol, params.rid),
        fetchDocData(params.fcol, params.fid),
    ]);

    const data = { processador, placaMae, gpu, ram, fonte, game: params.game, res: params.res };

    if (subtitleEl) {
        subtitleEl.textContent = "A montagem foi validada na página inicial e os detalhes abaixo foram carregados automaticamente.";
    }

    if (statusEl) {
        statusEl.textContent = "validado";
    }

    if (summaryEl) {
        summaryEl.innerHTML = "";
        const parts = [
            ["Processador", processador],
            ["Placa-Mãe", placaMae],
            ["Placa de Vídeo", gpu],
            ["Memória RAM", ram],
            ["Fonte", fonte],
        ];
        parts.forEach(([label, item]) => {
            if (!item) return;
            summaryEl.append(renderDetail(label, item.nome || item.descricao || item));
            Object.entries(item)
                .filter(([key, value]) => !["nome", "imagemUrl", "descricao", "data_criacao", "createdAt", "dataCriacao"].includes(key))
                .filter(([, value]) => value !== undefined && value !== null && value !== "")
                .slice(0, 6)
                .forEach(([key, value]) => {
                    summaryEl.append(renderDetail(fieldLabels[key] || key, value));
                });
        });
    }

    const fps = estimateSingle({
        gpu: gpu?.nome,
        cpu: processador?.nome,
        ram: ram?.nome,
        res: params.res,
        game: params.game,
        board: placaMae?.nome,
    });

    if (outputEl && fps) {
        outputEl.hidden = false;
        outputEl.innerHTML = `<strong>Estimativa inicial:</strong> ~${fps} FPS<br><div class="muted">Carregada automaticamente da montagem validada.</div>`;
    }

    return { ...data, estimatedFps: fps };
}

function initEstimator(build) {
    const resSelect = document.getElementById("resSelect");
    const gameSelect = document.getElementById("gameSelect");
    const calcBtn = document.getElementById("calcBtn");
    const output = document.getElementById("output");

    if (!build?.gpu || !build?.processador || !build?.ram || !build?.placaMae) {
        if (output) {
            output.hidden = false;
            output.innerHTML = "<strong>Montagem indisponível.</strong> Abra essa página a partir da validação na home para ver os detalhes e o FPS.";
        }
        return;
    }

    if (resSelect) resSelect.value = new URLSearchParams(window.location.search).get("res") || (build?.resolution || "1080");
    if (gameSelect) gameSelect.value = new URLSearchParams(window.location.search).get("game") || (build?.game || "cyberpunk");

    const recalc = () => {
        const fps = estimateSingle({
            gpu: build.gpu.nome,
            cpu: build.processador.nome,
            ram: build.ram.nome,
            res: resSelect?.value,
            game: gameSelect?.value,
            board: build.placaMae.nome,
        });
        if (output) {
            output.hidden = false;
            output.innerHTML = `
                <strong>Estimativa:</strong> ~${fps} FPS<br/>
                <div class="muted">Resultado calculado com base na montagem travada da home, variando apenas jogo e resolução.</div>
            `;
        }
    };

    calcBtn?.addEventListener("click", recalc);
    resSelect?.addEventListener("change", recalc);
    gameSelect?.addEventListener("change", recalc);
    recalc();
}

document.addEventListener("DOMContentLoaded", async () => {
    const build = await hydrateBuild();
    initEstimator(build);
});
