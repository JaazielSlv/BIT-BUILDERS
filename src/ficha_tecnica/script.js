import { db } from "../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const typeLabels = {
    processadores: "Processador",
    placamae: "Placa-mãe",
    gpu: "Placa de vídeo",
    ram: "Memória RAM",
    fonte: "Fonte de alimentação"
};

const fieldLabels = {
    socket: "Socket",
    tipo_ram: "Tipo de RAM",
    tdp: "Consumo / TDP",
    potencia: "Potência",
    cores: "Núcleos",
    threads: "Threads",
    cache_l3: "Cache L3",
    boost: "Boost",
    arquitetura: "Arquitetura",
    video_integrado: "Vídeo integrado",
    chipset: "Chipset",
    formato: "Formato",
    slots_ram: "Slots de memória",
    max_ram: "Memória máxima",
    slots_m2: "Slots M.2",
    wifi: "Wi-Fi",
    pcie: "PCIe",
    rede: "Rede",
    vrm: "VRM",
    vram: "VRAM",
    memoria_video: "Memória de vídeo",
    barramento: "Barramento",
    conector: "Conector",
    fonte_recomendada: "Fonte recomendada",
    recursos: "Recursos",
    capacidade: "Capacidade",
    frequencia: "Frequência",
    latencia: "Latência",
    perfil: "Perfil",
    certificacao: "Certificação",
    modular: "Modularidade",
    pfc: "PFC",
    fan: "Ventoinha"
};

const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const imageEl = document.getElementById("component-image");
const placeholderEl = document.getElementById("image-placeholder");
const categoryChipEl = document.getElementById("category-chip");
const statusBadgeEl = document.getElementById("status-badge");
const detailsListEl = document.getElementById("details-list");

function getPrettyValue(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }
    if (typeof value === "number") {
        return `${value}`;
    }
    return String(value);
}

function renderField(label, value) {
    const item = document.createElement("div");
    item.className = "detail-item";

    const labelEl = document.createElement("span");
    labelEl.className = "detail-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "detail-value";
    valueEl.textContent = value;

    item.append(labelEl, valueEl);
    return item;
}

function setImage(imageUrl, name) {
    const toImageFile = (nome) =>
        nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();

    const trySrc = (srcs) => {
        if (!srcs || srcs.length === 0) {
            imageEl.removeAttribute("src");
            imageEl.style.display = "none";
            placeholderEl.style.display = "grid";
            return;
        }
        const s = srcs.shift();
        imageEl.src = s;
        imageEl.alt = name;
        imageEl.style.display = "block";
        placeholderEl.style.display = "none";
        imageEl.onerror = () => trySrc(srcs);
    };

    if (imageUrl && String(imageUrl).trim()) {
        trySrc([imageUrl]);
        return;
    }

    // fallback: tentar png, jpg, webp baseado no nome normalizado
    const base = toImageFile(name || "component");
    const candidates = [`./img/${base}.png`, `./img/${base}.jpg`, `./img/${base}.webp`];
    trySrc(candidates);
}

function setLoadingState(message) {
    titleEl.textContent = message;
    subtitleEl.textContent = "Aguarde enquanto buscamos as informações na base.";
    statusBadgeEl.textContent = "carregando";
    detailsListEl.innerHTML = "";
}

async function loadFichaTecnica() {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo");
    const id = params.get("id");

    if (!tipo || !id) {
        titleEl.textContent = "Ficha técnica indisponível";
        subtitleEl.textContent = "Nenhum componente foi informado na URL.";
        statusBadgeEl.textContent = "erro";
        categoryChipEl.textContent = "categoria";
        detailsListEl.append(renderField("Erro", "Informe tipo e id na URL."));
        return;
    }

    const categoria = typeLabels[tipo] || tipo;
    categoryChipEl.textContent = categoria;

    setLoadingState("Buscando componente...");

    try {
        const snap = await getDoc(doc(db, tipo, id));

        if (!snap.exists()) {
            titleEl.textContent = "Componente não encontrado";
            subtitleEl.textContent = "O documento solicitado não existe na coleção informada.";
            statusBadgeEl.textContent = "não encontrado";
            detailsListEl.append(renderField("Coleção", tipo), renderField("Documento", id));
            return;
        }

        const data = snap.data();
        const nome = data.nome || "Componente sem nome";

        titleEl.textContent = nome;
        subtitleEl.textContent = data.descricao || `Ficha técnica de ${categoria.toLowerCase()}.`;
        statusBadgeEl.textContent = "online";

        setImage(data.imagemUrl, nome);

        const orderedFields = [
            "socket","chipset","formato","tipo_ram","slots_ram","max_ram","slots_m2","wifi","pcie","rede","vrm",
            "tdp","potencia","cores","threads","cache_l3","boost","arquitetura","video_integrado",
            "vram","memoria_video","barramento","conector","fonte_recomendada","recursos",
            "capacidade","frequencia","latencia","perfil",
            "certificacao","modular","pfc","fan"
        ];
        orderedFields.forEach((field) => {
            if (field in data) {
                const label = fieldLabels[field] || field;
                let value = getPrettyValue(data[field]);
                if (field === "tdp" || field === "potencia") {
                    value = `${value}W`;
                }
                detailsListEl.append(renderField(label, value));
            }
        });

        const extraFields = Object.entries(data)
            .filter(([field]) => !orderedFields.includes(field))
            .filter(([field]) => field !== "nome" && field !== "imagemUrl" && field !== "descricao")
            .filter(([field]) => field !== "data_criacao" && field !== "createdAt" && field !== "dataCriacao")
            .filter(([, value]) => value !== undefined && value !== null && value !== "");

        extraFields.forEach(([field, value]) => {
            const label = fieldLabels[field] || field;
            detailsListEl.append(renderField(label, getPrettyValue(value)));
        });
    } catch (error) {
        titleEl.textContent = "Falha ao carregar ficha";
        subtitleEl.textContent = "Não foi possível buscar o componente agora.";
        statusBadgeEl.textContent = "erro";
        detailsListEl.append(renderField("Detalhe", error?.message || "Erro desconhecido"));
    }
}

loadFichaTecnica();