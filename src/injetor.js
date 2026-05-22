import { db } from "./firebase-config.js?v=20260526";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// BATCH de itens baseados nos arquivos da pasta IMG
const popularBanco = async (options = {}) => {
    const { forceReset = false, showAlerts = true } = options;
    const seedVersion = "20260526-full-reseed-images";
    const seedKey = "bitbuilders-injector-seed-version";

    const toImageFile = (nome) =>
        nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();

    const imageExtensions = ["png", "jpg", "jpeg", "webp", "svg", "gif"];
    const imageStopWords = new Set([
        "pesquisa", "google", "kabum", "brasil", "br",
        "placa", "placas", "video", "mae", "series", "kit",
        "memory", "memoria", "fonte", "alimentacao", "gamer",
        "gaming", "desktop", "processor", "processador", "cpu",
        "graphics", "card", "premium", "black", "white", "red", "blue",
        "pc", "produto", "products", "overview"
    ]);

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();
    }

    function expandToken(token) {
        const variants = [token];
        if (/\d+[a-z]+$/i.test(token)) {
            variants.push(token.replace(/[a-z]+$/i, ""));
        }
        return variants;
    }

    function tokenize(value) {
        const result = [];
        for (const token of normalizeText(value).split("-").filter(Boolean)) {
            if (imageStopWords.has(token)) continue;
            for (const variant of expandToken(token)) {
                if (variant && !imageStopWords.has(variant) && !result.includes(variant)) {
                    result.push(variant);
                }
            }
        }
        return result;
    }

    async function imageExists(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = encodeURI(url);
        });
    }

    function scoreImageMatch(componentName, sourceName, mappedName) {
        const componentTokens = new Set(tokenize(componentName));
        const sourceTokens = tokenize(sourceName);
        const mappedTokens = tokenize(mappedName);
        const componentBase = normalizeText(componentName);
        const sourceBase = normalizeText(sourceName);
        const mappedBase = normalizeText(mappedName);

        let score = 0;
        for (const token of sourceTokens) {
            if (componentTokens.has(token)) score += 2;
        }
        for (const token of mappedTokens) {
            if (componentTokens.has(token)) score += 1;
        }

        if (
            mappedBase.startsWith(componentBase) ||
            componentBase.startsWith(mappedBase) ||
            sourceBase.startsWith(componentBase) ||
            componentBase.startsWith(sourceBase)
        ) {
            score += 2;
        }

        return score;
    }

    async function resolveImageUrl(nome, map = {}) {
        const exactName = String(nome || "").trim();
        const normalizedName = normalizeText(exactName);
        const candidates = [];

        const pushCandidates = (baseName) => {
            if (!baseName) return;
            for (const ext of imageExtensions) {
                candidates.push(`./img/${baseName}.${ext}`);
            }
        };

        pushCandidates(exactName);
        pushCandidates(normalizedName);

        for (const [sourceName, mappedName] of Object.entries(map)) {
            const score = scoreImageMatch(exactName, sourceName, mappedName);
            if (score >= 4) {
                pushCandidates(mappedName);
            }
        }

        for (const candidate of [...new Set(candidates.filter(Boolean))]) {
            // eslint-disable-next-line no-await-in-loop
            if (await imageExists(candidate)) {
                return candidate;
            }
        }

        return `./img/${normalizedName}.png`;
    }

    let imageMap = {};
    try {
        const response = await fetch("./img/image-map.json");
        if (response.ok) {
            imageMap = await response.json();
        }
    } catch (error) {
        console.warn("Não foi possível carregar img/image-map.json", error);
    }

    const cpuProfiles = {
        "Intel Core i3-10105F": { cores: 4, threads: 8, cache_l3: "6 MB", boost: "4.40 GHz", arquitetura: "Comet Lake", video_integrado: "Não" },
        "Intel Core i5-10400F": { cores: 6, threads: 12, cache_l3: "12 MB", boost: "4.30 GHz", arquitetura: "Comet Lake", video_integrado: "Não" },
        "Intel Core i5-11400F": { cores: 6, threads: 12, cache_l3: "12 MB", boost: "4.40 GHz", arquitetura: "Rocket Lake", video_integrado: "Não" },
        "Intel Core i5-12400F": { cores: 6, threads: 12, cache_l3: "18 MB", boost: "4.40 GHz", arquitetura: "Alder Lake", video_integrado: "Não" },
        "Intel Core i5-13400F": { cores: 10, threads: 16, cache_l3: "20 MB", boost: "4.60 GHz", arquitetura: "Raptor Lake", video_integrado: "Não" },
        "Intel Core i5-14600K": { cores: 14, threads: 20, cache_l3: "24 MB", boost: "5.30 GHz", arquitetura: "Raptor Lake Refresh", video_integrado: "Sim" },
        "Intel Core i7-10700K": { cores: 8, threads: 16, cache_l3: "16 MB", boost: "5.10 GHz", arquitetura: "Comet Lake", video_integrado: "Sim" },
        "Intel Core i7-11700K": { cores: 8, threads: 16, cache_l3: "16 MB", boost: "5.00 GHz", arquitetura: "Rocket Lake", video_integrado: "Sim" },
        "Intel Core i7-12700K": { cores: 12, threads: 20, cache_l3: "25 MB", boost: "5.00 GHz", arquitetura: "Alder Lake", video_integrado: "Sim" },
        "Intel Core i7-13700K": { cores: 16, threads: 24, cache_l3: "30 MB", boost: "5.40 GHz", arquitetura: "Raptor Lake", video_integrado: "Sim" },
        "Intel Core i9-10900K": { cores: 10, threads: 20, cache_l3: "20 MB", boost: "5.30 GHz", arquitetura: "Comet Lake", video_integrado: "Sim" },
        "Intel Core i9-11900K": { cores: 8, threads: 16, cache_l3: "16 MB", boost: "5.30 GHz", arquitetura: "Rocket Lake", video_integrado: "Sim" },
        "Intel Core i9-12900K": { cores: 16, threads: 24, cache_l3: "30 MB", boost: "5.20 GHz", arquitetura: "Alder Lake", video_integrado: "Sim" },
        "Intel Core i9-13900K": { cores: 24, threads: 32, cache_l3: "36 MB", boost: "5.80 GHz", arquitetura: "Raptor Lake", video_integrado: "Sim" },
        "Intel Core i9-14900K": { cores: 24, threads: 32, cache_l3: "36 MB", boost: "6.00 GHz", arquitetura: "Raptor Lake Refresh", video_integrado: "Sim" },
        "AMD Ryzen 5 3600": { cores: 6, threads: 12, cache_l3: "32 MB", boost: "4.20 GHz", arquitetura: "Zen 2", video_integrado: "Não" },
        "AMD Ryzen 5 5600": { cores: 6, threads: 12, cache_l3: "32 MB", boost: "4.40 GHz", arquitetura: "Zen 3", video_integrado: "Não" },
        "AMD Ryzen 5 5600X": { cores: 6, threads: 12, cache_l3: "32 MB", boost: "4.60 GHz", arquitetura: "Zen 3", video_integrado: "Não" },
        "AMD Ryzen 5 7600": { cores: 6, threads: 12, cache_l3: "32 MB", boost: "5.10 GHz", arquitetura: "Zen 4", video_integrado: "Sim" },
        "AMD Ryzen 5 7600X": { cores: 6, threads: 12, cache_l3: "32 MB", boost: "5.30 GHz", arquitetura: "Zen 4", video_integrado: "Sim" },
        "AMD Ryzen 7 5700X": { cores: 8, threads: 16, cache_l3: "32 MB", boost: "4.60 GHz", arquitetura: "Zen 3", video_integrado: "Não" },
        "AMD Ryzen 7 5800X": { cores: 8, threads: 16, cache_l3: "32 MB", boost: "4.70 GHz", arquitetura: "Zen 3", video_integrado: "Não" },
        "AMD Ryzen 7 7700X": { cores: 8, threads: 16, cache_l3: "32 MB", boost: "5.40 GHz", arquitetura: "Zen 4", video_integrado: "Sim" },
        "AMD Ryzen 7 7800X3D": { cores: 8, threads: 16, cache_l3: "96 MB", boost: "5.00 GHz", arquitetura: "Zen 4 3D V-Cache", video_integrado: "Sim" },
        "AMD Ryzen 9 5900X": { cores: 12, threads: 24, cache_l3: "64 MB", boost: "4.80 GHz", arquitetura: "Zen 3", video_integrado: "Não" },
        "AMD Ryzen 9 5950X": { cores: 16, threads: 32, cache_l3: "64 MB", boost: "4.90 GHz", arquitetura: "Zen 3", video_integrado: "Não" },
        "AMD Ryzen 9 7900X": { cores: 12, threads: 24, cache_l3: "64 MB", boost: "5.60 GHz", arquitetura: "Zen 4", video_integrado: "Sim" },
        "AMD Ryzen 9 7950X": { cores: 16, threads: 32, cache_l3: "64 MB", boost: "5.70 GHz", arquitetura: "Zen 4", video_integrado: "Sim" }
    };

    const getCpuProfile = (nome) => cpuProfiles[nome] || {
        cores: "N/D",
        threads: "N/D",
        cache_l3: "N/D",
        boost: "N/D",
        arquitetura: "N/D",
        video_integrado: "N/D"
    };

    const buildCpuDoc = async (item) => {
        const profile = getCpuProfile(item.nome);
        const imagemUrl = await resolveImageUrl(item.nome, imageMap);
        return {
            ...item,
            ...profile,
            imagemUrl,
            descricao: `${item.nome} com ${profile.cores} núcleos e ${profile.threads} threads, cache L3 de ${profile.cache_l3}, boost até ${profile.boost} e arquitetura ${profile.arquitetura}.`
        };
    };

    const buildMotherboardDoc = async (item) => {
        const nome = item.nome;
        const chipsetMatch = nome.match(/(B450|B550|X570|B460|B560|Z590|B650E|B650|X670E|X670|Z690|B760)/i);
        const chipset = chipsetMatch ? chipsetMatch[1].toUpperCase() : "N/D";
        const formato = /(B450M|B550M|B460M|B560M|B760M|B550M-A|B450M-PLUS II)/i.test(nome) ? "mATX" : "ATX";
        const wifi = /(WiFi|AC|AX)/i.test(nome) ? "Sim" : "Não";
        const maxRam = item.tipo_ram === "DDR5" ? "192 GB" : "128 GB";
        const slotsRam = 4;
        const slotsM2 = /(X670E|B650E|Z690-E|X570|MPG X670E Carbon)/i.test(nome) ? 3 : 2;
        const pcie = /B450/i.test(chipset) ? "PCIe 3.0" : /B550|X570|B560|Z590/i.test(chipset) ? "PCIe 4.0" : "PCIe 5.0";
        const rede = wifi === "Sim" ? "2.5 GbE + Wi-Fi" : "1 GbE";
        const vrm = /X670E|B650E|Z690-E|X570|Z590-A PRO|B760 Tomahawk|ROG Strix/i.test(nome) ? "VRM reforçado" : "VRM equilibrado";
        const imagemUrl = await resolveImageUrl(item.nome, imageMap);

        return {
            ...item,
            chipset,
            formato,
            slots_ram: slotsRam,
            max_ram: maxRam,
            slots_m2: slotsM2,
            wifi,
            pcie,
            rede,
            vrm,
            imagemUrl,
            descricao: `${chipset} ${formato} para ${item.socket}, com ${slotsRam} slots de memória, ${slotsM2} slot(s) M.2 e suporte até ${maxRam}.`
        };
    };

    const buildGpuDoc = async (item) => {
        const nome = item.nome;
        let vram = "N/D";
        let memoria = "GDDR6";
        let barramento = "N/D";
        let conector = "N/D";
        let fonte_recomendada = "N/D";
        let recursos = "Ray Tracing";

        if (/GTX 1650/i.test(nome)) { vram = "4 GB"; memoria = "GDDR5/GDDR6"; barramento = "128-bit"; conector = "1x 6 pinos"; fonte_recomendada = "300W"; recursos = "entrada para eSports"; }
        else if (/GTX 1660/i.test(nome)) { vram = "6 GB"; memoria = /Super/i.test(nome) ? "GDDR6" : "GDDR5"; barramento = "192-bit"; conector = "1x 8 pinos"; fonte_recomendada = "450W"; recursos = "jogos competitivos e Full HD"; }
        else if (/RTX 2060/i.test(nome)) { vram = /Super/i.test(nome) ? "8 GB" : "6 GB"; memoria = "GDDR6"; barramento = "192-bit"; conector = "1x 8 pinos"; fonte_recomendada = "500W"; recursos = "DLSS e Ray Tracing de entrada"; }
        else if (/RTX 2070 Super/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "1x 8 pinos"; fonte_recomendada = "550W"; recursos = "1440p com DLSS"; }
        else if (/RTX 3060 Ti/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "1x 8 pinos"; fonte_recomendada = "650W"; recursos = "equilíbrio entre 1440p e preço"; }
        else if (/RTX 3060/i.test(nome)) { vram = "12 GB"; memoria = "GDDR6"; barramento = "192-bit"; conector = "1x 8 pinos"; fonte_recomendada = "550W"; recursos = "bom fôlego para texturas e criação"; }
        else if (/RTX 3070 Ti/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6X"; barramento = "256-bit"; conector = "2x 8 pinos"; fonte_recomendada = "750W"; recursos = "1440p forte"; }
        else if (/RTX 3070/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "1x 8 pinos"; fonte_recomendada = "650W"; recursos = "1440p com alto FPS"; }
        else if (/RTX 3080 Ti/i.test(nome)) { vram = "12 GB"; memoria = "GDDR6X"; barramento = "384-bit"; conector = "2x 8 pinos"; fonte_recomendada = "850W"; recursos = "4K com alto desempenho"; }
        else if (/RTX 3080/i.test(nome)) { vram = "10 GB"; memoria = "GDDR6X"; barramento = "320-bit"; conector = "2x 8 pinos"; fonte_recomendada = "750W"; recursos = "4K e produtividade pesada"; }
        else if (/RTX 3090/i.test(nome)) { vram = "24 GB"; memoria = "GDDR6X"; barramento = "384-bit"; conector = "2x 8 pinos"; fonte_recomendada = "850W"; recursos = "trabalho profissional e 4K"; }
        else if (/RTX 4060 Ti/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "128-bit"; conector = "1x 8 pinos"; fonte_recomendada = "550W"; recursos = "eficiência em 1080p/1440p"; }
        else if (/RTX 4060/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "128-bit"; conector = "1x 8 pinos"; fonte_recomendada = "550W"; recursos = "consumo baixo e DLSS 3"; }
        else if (/RTX 4070 Ti/i.test(nome)) { vram = "12 GB"; memoria = "GDDR6X"; barramento = "192-bit"; conector = "1x 16 pinos"; fonte_recomendada = "700W"; recursos = "1440p premium"; }
        else if (/RTX 4070/i.test(nome)) { vram = "12 GB"; memoria = "GDDR6X"; barramento = "192-bit"; conector = "1x 8 pinos"; fonte_recomendada = "650W"; recursos = "1440p eficiente"; }
        else if (/RTX 4080/i.test(nome)) { vram = "16 GB"; memoria = "GDDR6X"; barramento = "256-bit"; conector = "1x 16 pinos"; fonte_recomendada = "750W"; recursos = "4K com Ray Tracing"; }
        else if (/RTX 4090/i.test(nome)) { vram = "24 GB"; memoria = "GDDR6X"; barramento = "384-bit"; conector = "1x 16 pinos"; fonte_recomendada = "850W"; recursos = "topo de linha para 4K/8K"; }
        else if (/RX 6600 XT/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "128-bit"; conector = "1x 8 pinos"; fonte_recomendada = "500W"; recursos = "Full HD competitivo"; }
        else if (/RX 6650 XT/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "128-bit"; conector = "1x 8 pinos"; fonte_recomendada = "500W"; recursos = "Full HD com folga"; }
        else if (/RX 6600/i.test(nome)) { vram = "8 GB"; memoria = "GDDR6"; barramento = "128-bit"; conector = "1x 8 pinos"; fonte_recomendada = "500W"; recursos = "custo-benefício para Full HD"; }
        else if (/RX 6700 XT/i.test(nome)) { vram = "12 GB"; memoria = "GDDR6"; barramento = "192-bit"; conector = "1x 8 pinos"; fonte_recomendada = "650W"; recursos = "1440p equilibrado"; }
        else if (/RX 6750 XT/i.test(nome)) { vram = "12 GB"; memoria = "GDDR6"; barramento = "192-bit"; conector = "1x 8 pinos"; fonte_recomendada = "650W"; recursos = "versão turbinada para 1440p"; }
        else if (/RX 6800 XT/i.test(nome)) { vram = "16 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "2x 8 pinos"; fonte_recomendada = "750W"; recursos = "alto desempenho em 1440p e 4K"; }
        else if (/RX 6800/i.test(nome)) { vram = "16 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "2x 8 pinos"; fonte_recomendada = "750W"; recursos = "muito VRAM para criação"; }
        else if (/RX 6900 XT/i.test(nome)) { vram = "16 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "2x 8 pinos"; fonte_recomendada = "850W"; recursos = "flagship da geração RX 6000"; }
        else if (/RX 6950 XT/i.test(nome)) { vram = "16 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "2x 8 pinos"; fonte_recomendada = "850W"; recursos = "versão mais forte da linha RX 6000"; }
        else if (/RX 7700 XT/i.test(nome)) { vram = "12 GB"; memoria = "GDDR6"; barramento = "192-bit"; conector = "2x 8 pinos"; fonte_recomendada = "700W"; recursos = "1440p moderno"; }
        else if (/RX 7800 XT/i.test(nome)) { vram = "16 GB"; memoria = "GDDR6"; barramento = "256-bit"; conector = "2x 8 pinos"; fonte_recomendada = "750W"; recursos = "1440p forte e 4K leve"; }
        else if (/RX 7900 XT/i.test(nome)) { vram = "20 GB"; memoria = "GDDR6"; barramento = "320-bit"; conector = "2x 8 pinos"; fonte_recomendada = "750W"; recursos = "4K e alta largura de banda"; }
        else if (/RX 7900 XTX/i.test(nome)) { vram = "24 GB"; memoria = "GDDR6"; barramento = "384-bit"; conector = "2x 8 pinos"; fonte_recomendada = "850W"; recursos = "topo de linha AMD"; }
        const imagemUrl = await resolveImageUrl(item.nome, imageMap);

        return {
            ...item,
            vram,
            memoria_video: memoria,
            barramento,
            conector,
            fonte_recomendada,
            recursos,
            imagemUrl,
            descricao: `${item.nome} com ${vram} de VRAM ${memoria}, barramento ${barramento} e fonte recomendada de ${fonte_recomendada}.`
        };
    };

    const buildRamDoc = async (item) => {
        const capacidade = (item.nome.match(/(\d+)GB/i) || [])[1] || "N/D";
        const frequencia = (item.nome.match(/(\d{4})MHz/i) || [])[1] || "N/D";
        const latencia = item.tipo_ram === "DDR5" ? "CL30-40" : item.tipo_ram === "DDR4" ? "CL16-18" : "CL9-11";
        const perfil = item.tipo_ram === "DDR5" ? "XMP 3.0 / EXPO" : item.tipo_ram === "DDR4" ? "XMP 2.0" : "JEDEC";
        const imagemUrl = await resolveImageUrl(item.nome, imageMap);

        return {
            ...item,
            capacidade: `${capacidade} GB`,
            frequencia: `${frequencia} MHz`,
            latencia,
            perfil,
            imagemUrl,
            descricao: `Módulo ${item.tipo_ram} de ${capacidade} GB a ${frequencia} MHz, com perfil ${perfil} e latência ${latencia}.`
        };
    };

    const buildFonteDoc = async (item) => {
        const nome = item.nome;
        let certificacao = /Bronze/i.test(nome) ? "80 Plus Bronze" : /Gold/i.test(nome) ? "80 Plus Gold" : /Platinum/i.test(nome) ? "80 Plus Platinum" : /Titanium/i.test(nome) ? "80 Plus Titanium" : "80 Plus Bronze";
        let modular = "Não modular";

        if (/HX1000i/i.test(nome)) {
            certificacao = "80 Plus Platinum";
            modular = "Full modular";
        } else if (/RM\d+x/i.test(nome) || /Core Reactor/i.test(nome) || /Focus GX/i.test(nome) || /SuperNOVA/i.test(nome) || /Toughpower GF1/i.test(nome) || /MPG A\d+G/i.test(nome) || /UD\d+GM/i.test(nome) || /DA850 Gold/i.test(nome)) {
            certificacao = /Gold/i.test(nome) || /DA850 Gold/i.test(nome) ? "80 Plus Gold" : certificacao;
            modular = "Full modular";
        } else if (/MWE 750 Gold/i.test(nome)) {
            certificacao = "80 Plus Gold";
            modular = "Semi modular";
        } else if (/CV|CX650|Pylon/i.test(nome) || /MWE 650 Bronze/i.test(nome)) {
            certificacao = "80 Plus Bronze";
            modular = "Não modular";
        }
        const imagemUrl = await resolveImageUrl(item.nome, imageMap);

        return {
            ...item,
            certificacao,
            modular,
            pfc: "Ativo",
            fan: "120 mm",
            imagemUrl,
            descricao: `Fonte ${item.potencia}W ${certificacao} ${modular}. Ideal para quem busca estabilidade e margem de segurança na montagem.`
        };
    };

    const processadores = [
        { nome: "Intel Core i3-10105F", socket: "LGA1200", tdp: 65 },
        { nome: "Intel Core i5-10400F", socket: "LGA1200", tdp: 65 },
        { nome: "Intel Core i5-11400F", socket: "LGA1200", tdp: 65 },
        { nome: "Intel Core i5-12400F", socket: "LGA1700", tdp: 65 },
        { nome: "Intel Core i5-13400F", socket: "LGA1700", tdp: 65 },
        { nome: "Intel Core i5-14600K", socket: "LGA1700", tdp: 125 },
        { nome: "Intel Core i7-10700K", socket: "LGA1200", tdp: 125 },
        { nome: "Intel Core i7-11700K", socket: "LGA1200", tdp: 125 },
        { nome: "Intel Core i7-12700K", socket: "LGA1700", tdp: 125 },
        { nome: "Intel Core i7-13700K", socket: "LGA1700", tdp: 125 },
        { nome: "Intel Core i9-10900K", socket: "LGA1200", tdp: 125 },
        { nome: "Intel Core i9-11900K", socket: "LGA1200", tdp: 125 },
        { nome: "Intel Core i9-12900K", socket: "LGA1700", tdp: 125 },
        { nome: "Intel Core i9-13900K", socket: "LGA1700", tdp: 125 },
        { nome: "Intel Core i9-14900K", socket: "LGA1700", tdp: 125 },
        { nome: "AMD Ryzen 5 3600", socket: "AM4", tdp: 65 },
        { nome: "AMD Ryzen 5 5600", socket: "AM4", tdp: 65 },
        { nome: "AMD Ryzen 5 5600X", socket: "AM4", tdp: 65 },
        { nome: "AMD Ryzen 5 7600", socket: "AM5", tdp: 65 },
        { nome: "AMD Ryzen 5 7600X", socket: "AM5", tdp: 105 },
        { nome: "AMD Ryzen 7 5700X", socket: "AM4", tdp: 65 },
        { nome: "AMD Ryzen 7 5800X", socket: "AM4", tdp: 105 },
        { nome: "AMD Ryzen 7 7700X", socket: "AM5", tdp: 105 },
        { nome: "AMD Ryzen 7 7800X3D", socket: "AM5", tdp: 120 },
        { nome: "AMD Ryzen 9 5900X", socket: "AM4", tdp: 105 },
        { nome: "AMD Ryzen 9 5950X", socket: "AM4", tdp: 105 },
        { nome: "AMD Ryzen 9 7900X", socket: "AM5", tdp: 170 },
        { nome: "AMD Ryzen 9 7950X", socket: "AM5", tdp: 170 }
    ];

    const placasMae = [
        { nome: "ASUS TUF Gaming B450M-PLUS II", socket: "AM4", tipo_ram: "DDR4", tdp: 40 },
        { nome: "Gigabyte B550 AORUS PRO AC", socket: "AM4", tipo_ram: "DDR4", tdp: 45 },
        { nome: "MSI MPG X570 Gaming Plus", socket: "AM4", tipo_ram: "DDR4", tdp: 50 },
        { nome: "ASRock B550 Steel Legend", socket: "AM4", tipo_ram: "DDR4", tdp: 42 },
        { nome: "ASUS PRIME B550M-A", socket: "AM4", tipo_ram: "DDR4", tdp: 38 },
        { nome: "MSI B550 Tomahawk", socket: "AM4", tipo_ram: "DDR4", tdp: 45 },
        { nome: "ASUS ROG Strix B650E-F", socket: "AM5", tipo_ram: "DDR5", tdp: 52 },
        { nome: "Gigabyte B650 AORUS Elite AX", socket: "AM5", tipo_ram: "DDR5", tdp: 50 },
        { nome: "MSI MAG B650 Tomahawk", socket: "AM5", tipo_ram: "DDR5", tdp: 48 },
        { nome: "ASRock B650E PG Riptide", socket: "AM5", tipo_ram: "DDR5", tdp: 50 },
        { nome: "ASUS PRIME X670-P", socket: "AM5", tipo_ram: "DDR5", tdp: 58 },
        { nome: "MSI MPG X670E Carbon WiFi", socket: "AM5", tipo_ram: "DDR5", tdp: 60 },
        { nome: "MSI MAG B460M Mortar", socket: "LGA1200", tipo_ram: "DDR4", tdp: 40 },
        { nome: "Gigabyte B560M DS3H", socket: "LGA1200", tipo_ram: "DDR4", tdp: 40 },
        { nome: "ASUS PRIME Z590-P", socket: "LGA1200", tipo_ram: "DDR4", tdp: 48 },
        { nome: "MSI Z590-A PRO", socket: "LGA1200", tipo_ram: "DDR4", tdp: 48 },
        { nome: "ASUS ROG Strix Z690-E", socket: "LGA1700", tipo_ram: "DDR5", tdp: 50 },
        { nome: "Gigabyte Z690 UD AX", socket: "LGA1700", tipo_ram: "DDR5", tdp: 50 },
        { nome: "MSI PRO Z690-A WiFi", socket: "LGA1700", tipo_ram: "DDR5", tdp: 52 },
        { nome: "ASRock Z690 Extreme", socket: "LGA1700", tipo_ram: "DDR4", tdp: 50 },
        { nome: "ASUS TUF Gaming B760-PLUS", socket: "LGA1700", tipo_ram: "DDR5", tdp: 48 },
        { nome: "Gigabyte B760M Gaming X", socket: "LGA1700", tipo_ram: "DDR5", tdp: 46 },
        { nome: "MSI MAG B760 Tomahawk", socket: "LGA1700", tipo_ram: "DDR5", tdp: 48 },
        { nome: "ASRock B760 Pro RS", socket: "LGA1700", tipo_ram: "DDR5", tdp: 44 }
    ];

    const gpus = [
        { nome: "NVIDIA GeForce GTX 1650", tdp: 75 },
        { nome: "NVIDIA GeForce GTX 1660", tdp: 120 },
        { nome: "NVIDIA GeForce GTX 1660 Super", tdp: 125 },
        { nome: "NVIDIA GeForce RTX 2060", tdp: 160 },
        { nome: "NVIDIA GeForce RTX 2060 Super", tdp: 175 },
        { nome: "NVIDIA GeForce RTX 2070 Super", tdp: 215 },
        { nome: "NVIDIA GeForce RTX 3060", tdp: 170 },
        { nome: "NVIDIA GeForce RTX 3060 Ti", tdp: 200 },
        { nome: "NVIDIA GeForce RTX 3070", tdp: 220 },
        { nome: "NVIDIA GeForce RTX 3070 Ti", tdp: 290 },
        { nome: "NVIDIA GeForce RTX 3080", tdp: 320 },
        { nome: "NVIDIA GeForce RTX 3080 Ti", tdp: 350 },
        { nome: "NVIDIA GeForce RTX 3090", tdp: 350 },
        { nome: "NVIDIA GeForce RTX 4060", tdp: 115 },
        { nome: "NVIDIA GeForce RTX 4060 Ti", tdp: 160 },
        { nome: "NVIDIA GeForce RTX 4070", tdp: 200 },
        { nome: "NVIDIA GeForce RTX 4070 Ti", tdp: 285 },
        { nome: "NVIDIA GeForce RTX 4080", tdp: 320 },
        { nome: "NVIDIA GeForce RTX 4090", tdp: 450 },
        { nome: "AMD Radeon RX 6600", tdp: 132 },
        { nome: "AMD Radeon RX 6600 XT", tdp: 160 },
        { nome: "AMD Radeon RX 6650 XT", tdp: 176 },
        { nome: "AMD Radeon RX 6700 XT", tdp: 230 },
        { nome: "AMD Radeon RX 6750 XT", tdp: 250 },
        { nome: "AMD Radeon RX 6800", tdp: 250 },
        { nome: "AMD Radeon RX 6800 XT", tdp: 300 },
        { nome: "AMD Radeon RX 6900 XT", tdp: 300 },
        { nome: "AMD Radeon RX 6950 XT", tdp: 335 },
        { nome: "AMD Radeon RX 7700 XT", tdp: 245 },
        { nome: "AMD Radeon RX 7800 XT", tdp: 263 },
        { nome: "AMD Radeon RX 7900 XT", tdp: 300 },
        { nome: "AMD Radeon RX 7900 XTX", tdp: 355 }
    ];

    const rams = [
        { nome: "Corsair Vengeance 8GB DDR3 1600MHz", tipo_ram: "DDR3", tdp: 5 },
        { nome: "Kingston HyperX Fury 8GB DDR3 1866MHz", tipo_ram: "DDR3", tdp: 5 },
        { nome: "Crucial Ballistix 16GB DDR4 2666MHz", tipo_ram: "DDR4", tdp: 8 },
        { nome: "Corsair Vengeance LPX 16GB DDR4 3000MHz", tipo_ram: "DDR4", tdp: 10 },
        { nome: "G.Skill Ripjaws V 16GB DDR4 3200MHz", tipo_ram: "DDR4", tdp: 10 },
        { nome: "Kingston Fury Beast 16GB DDR4 3200MHz", tipo_ram: "DDR4", tdp: 10 },
        { nome: "Corsair Vengeance LPX 32GB DDR4 3200MHz", tipo_ram: "DDR4", tdp: 12 },
        { nome: "Corsair Vengeance LPX 32GB DDR4 3600MHz", tipo_ram: "DDR4", tdp: 15 },
        { nome: "G.Skill Trident Z Neo 32GB DDR4 3600MHz", tipo_ram: "DDR4", tdp: 15 },
        { nome: "TeamGroup T-Force Delta 16GB DDR4 3600MHz", tipo_ram: "DDR4", tdp: 10 },
        { nome: "Kingston Fury Renegade 32GB DDR4 4000MHz", tipo_ram: "DDR4", tdp: 16 },
        { nome: "Patriot Viper Steel 16GB DDR4 4400MHz", tipo_ram: "DDR4", tdp: 12 },
        { nome: "Corsair Dominator Platinum 32GB DDR5 5200MHz", tipo_ram: "DDR5", tdp: 14 },
        { nome: "Kingston Fury Beast 32GB DDR5 5200MHz", tipo_ram: "DDR5", tdp: 15 },
        { nome: "G.Skill Trident Z5 32GB DDR5 5600MHz", tipo_ram: "DDR5", tdp: 15 },
        { nome: "Corsair Vengeance 32GB DDR5 5600MHz", tipo_ram: "DDR5", tdp: 15 },
        { nome: "TeamGroup T-Force Vulcan 32GB DDR5 6000MHz", tipo_ram: "DDR5", tdp: 16 },
        { nome: "G.Skill Flare X5 32GB DDR5 6000MHz", tipo_ram: "DDR5", tdp: 16 },
        { nome: "Kingston Fury Renegade 32GB DDR5 6400MHz", tipo_ram: "DDR5", tdp: 18 },
        { nome: "Corsair Dominator Titanium 48GB DDR5 6600MHz", tipo_ram: "DDR5", tdp: 20 },
        { nome: "ADATA XPG Lancer 32GB DDR5 6000MHz", tipo_ram: "DDR5", tdp: 16 },
        { nome: "Crucial Pro 32GB DDR5 5600MHz", tipo_ram: "DDR5", tdp: 15 },
        { nome: "Patriot Viper Venom 32GB DDR5 6200MHz", tipo_ram: "DDR5", tdp: 17 },
        { nome: "Kingston Fury Beast 64GB DDR5 6000MHz", tipo_ram: "DDR5", tdp: 22 }
    ];

    const fontes = [
        { nome: "Corsair CV450 450W", potencia: 450 },
        { nome: "Corsair CV550 550W", potencia: 550 },
        { nome: "Corsair CX650 650W", potencia: 650 },
        { nome: "Corsair RM650x 650W", potencia: 650 },
        { nome: "Corsair RM750x 750W", potencia: 750 },
        { nome: "Corsair RM850x 850W", potencia: 850 },
        { nome: "Corsair HX1000i 1000W", potencia: 1000 },
        { nome: "XPG Pylon 550W", potencia: 550 },
        { nome: "XPG Core Reactor 650W", potencia: 650 },
        { nome: "XPG Core Reactor 750W", potencia: 750 },
        { nome: "XPG Core Reactor 850W", potencia: 850 },
        { nome: "Seasonic Focus GX-650", potencia: 650 },
        { nome: "Seasonic Focus GX-750", potencia: 750 },
        { nome: "Seasonic Focus GX-850", potencia: 850 },
        { nome: "EVGA SuperNOVA 650 G5", potencia: 650 },
        { nome: "EVGA SuperNOVA 750 G6", potencia: 750 },
        { nome: "Cooler Master MWE 650 Bronze", potencia: 650 },
        { nome: "Cooler Master MWE 750 Gold", potencia: 750 },
        { nome: "Thermaltake Toughpower GF1 850W", potencia: 850 },
        { nome: "MSI MPG A850G 850W", potencia: 850 },
        { nome: "MSI MPG A1000G 1000W", potencia: 1000 },
        { nome: "Gigabyte UD750GM 750W", potencia: 750 },
        { nome: "Gigabyte UD850GM 850W", potencia: 850 },
        { nome: "SilverStone DA850 Gold", potencia: 850 }
    ];

    const dados = [
        ...await Promise.all(processadores.map(async (item) => ({ col: "processadores", doc: await buildCpuDoc(item) }))),
        ...await Promise.all(placasMae.map(async (item) => ({ col: "placamae", doc: await buildMotherboardDoc(item) }))),
        ...await Promise.all(gpus.map(async (item) => ({ col: "gpu", doc: await buildGpuDoc(item) }))),
        ...await Promise.all(rams.map(async (item) => ({ col: "ram", doc: await buildRamDoc(item) }))),
        ...await Promise.all(fontes.map(async (item) => ({ col: "fonte", doc: await buildFonteDoc(item) })))
    ];

    if (forceReset) {
        console.warn("forceReset solicitado, mas reset destrutivo foi desativado para evitar banco vazio em caso de quota estourada.");
    }

    console.log("Iniciando injeção rica no Firestore...");
    let injetados = 0;

    for (const item of dados) {
        const imagemUrl = await resolveImageUrl(item.doc.nome, imageMap);
        try {
            await setDoc(doc(db, item.col, toImageFile(item.doc.nome)), {
                ...item.doc,
                imagemUrl,
                data_criacao: new Date()
            });
            console.log(`✅ Salvo: ${item.doc.nome}`);
            injetados++;
        } catch (error) {
            const errorCode = error?.code || "";
            if (errorCode.includes("resource-exhausted")) {
                throw new Error("Quota do Firestore excedida durante a injeção. Aguarde a cota liberar e execute novamente.");
            }
            throw error;
        }
    }

    localStorage.setItem(seedKey, seedVersion);

    if (showAlerts) {
        if (injetados > 0) {
            alert(`Sucesso! ${injetados} componentes foram cadastrados no seu banco de dados Firebase!`);
        } else {
            alert("Todos os componentes principais já estão no banco de dados.");
        }
    }

    if(typeof window.loadComponentsList === 'function') {
        window.loadComponentsList();
    } else {
        location.reload();
    }
};

window.runInjector = (options = {}) => popularBanco(options);
window.runInjectorFullReset = () => popularBanco({ forceReset: true, showAlerts: false });

const params = new URLSearchParams(window.location.search);
if (params.get("runInjector") === "1") {
    popularBanco({ forceReset: true, showAlerts: true }).catch((error) => {
        console.error("Falha ao executar injetor:", error);
        alert(`Falha ao executar o injetor: ${error.message || error}`);
    });
}

