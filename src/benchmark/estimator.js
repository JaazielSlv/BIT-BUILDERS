const gameProfiles = {
  csgo: { gpuWeight: 1.0, cpuWeight: 0.65, memoryWeight: 0.15, base: 35 },
  cs2: { gpuWeight: 0.98, cpuWeight: 0.7, memoryWeight: 0.18, base: 32 },
  valorant: { gpuWeight: 0.85, cpuWeight: 0.8, memoryWeight: 0.12, base: 60 },
  fortnite: { gpuWeight: 0.92, cpuWeight: 0.45, memoryWeight: 0.16, base: 28 },
  warzone: { gpuWeight: 0.98, cpuWeight: 0.3, memoryWeight: 0.18, base: 20 },
  gta5: { gpuWeight: 0.88, cpuWeight: 0.35, memoryWeight: 0.12, base: 42 },
  forza5: { gpuWeight: 0.96, cpuWeight: 0.24, memoryWeight: 0.14, base: 24 },
  rdr2: { gpuWeight: 0.98, cpuWeight: 0.2, memoryWeight: 0.14, base: 18 },
  sottr: { gpuWeight: 0.95, cpuWeight: 0.22, memoryWeight: 0.12, base: 18 },
  cyberpunk: { gpuWeight: 0.9, cpuWeight: 0.18, memoryWeight: 0.16, base: 12 }
};

const gpuTiers = [
  { match: /RTX 4090/i, score: 10.0 },
  { match: /RTX 4080|RX 7900 XTX/i, score: 9.1 },
  { match: /RTX 4070 Ti|RTX 4070|RX 7900 XT|RX 7800 XT/i, score: 8.0 },
  { match: /RTX 4060 Ti|RX 7700 XT|RX 6800 XT|RX 6900 XT|RX 6950 XT/i, score: 7.2 },
  { match: /RTX 4060|RX 6800|RX 6750 XT/i, score: 6.4 },
  { match: /RTX 3080 Ti|RTX 3080|RTX 3070 Ti|RTX 3070|RX 6700 XT/i, score: 5.7 },
  { match: /RTX 3090|RTX 3060 Ti|RX 6650 XT/i, score: 5.2 },
  { match: /RTX 3060|RTX 2060 Super|RX 6600 XT|RX 6600/i, score: 4.5 },
  { match: /RTX 2060|RTX 2070 Super|GTX 1660 Super|GTX 1660|GTX 1650/i, score: 3.4 },
  { match: /RX 6700 XT|RX 6800 XT|RX 6900 XT|RX 7800 XT|RX 7900 XT|RX 7900 XTX/i, score: 7.5 }
];

const cpuTiers = [
  { match: /i9-14900K|i9-13900K|i9-12900K|i9-11900K|i9-10900K|Ryzen 9 7950X|Ryzen 9 7900X|Ryzen 9 5950X|Ryzen 9 5900X/i, score: 10.0 },
  { match: /i7-13700K|i7-12700K|i7-11700K|i7-10700K|Ryzen 7 7800X3D|Ryzen 7 7700X|Ryzen 7 5800X|Ryzen 7 5700X/i, score: 8.9 },
  { match: /i5-14600K|i5-13400F|i5-12400F|i5-11400F|i5-10400F|Ryzen 5 7600X|Ryzen 5 7600|Ryzen 5 5600X|Ryzen 5 5600|Ryzen 5 3600/i, score: 7.8 },
  { match: /i3-10105F/i, score: 5.8 },
  { match: /14900|13900|12900|7950|7900/i, score: 10.0 },
  { match: /13700|12700|11700|10700|7700|5800|5700/i, score: 8.9 },
  { match: /14600|13400|12400|10400|7600|5600|3600/i, score: 7.8 }
];

const boardFactorByChipset = [
  { match: /Z790|Z690|X670E|X670/i, score: 1.05 },
  { match: /B760|B650|B550|Z590|B560/i, score: 1.0 },
  { match: /B460|B450/i, score: 0.96 }
];

const ramFactorByType = [
  { match: /DDR5/i, score: 1.06 },
  { match: /DDR4/i, score: 1.0 },
  { match: /DDR3/i, score: 0.9 }
];

const gpuOverrides = {
  "NVIDIA GeForce GTX 1650": 2.8,
  "NVIDIA GeForce GTX 1660": 3.1,
  "NVIDIA GeForce GTX 1660 Super": 3.4,
  "NVIDIA GeForce RTX 2060": 4.0,
  "NVIDIA GeForce RTX 2060 Super": 4.3,
  "NVIDIA GeForce RTX 2070 Super": 4.8,
  "NVIDIA GeForce RTX 3060": 5.0,
  "NVIDIA GeForce RTX 3060 Ti": 5.7,
  "NVIDIA GeForce RTX 3070": 6.0,
  "NVIDIA GeForce RTX 3070 Ti": 6.2,
  "NVIDIA GeForce RTX 3080": 7.0,
  "NVIDIA GeForce RTX 3080 Ti": 7.4,
  "NVIDIA GeForce RTX 3090": 7.7,
  "NVIDIA GeForce RTX 4060": 6.1,
  "NVIDIA GeForce RTX 4060 Ti": 6.8,
  "NVIDIA GeForce RTX 4070": 7.9,
  "NVIDIA GeForce RTX 4070 Ti": 8.3,
  "NVIDIA GeForce RTX 4080": 9.2,
  "NVIDIA GeForce RTX 4090": 10.0,
  "AMD Radeon RX 6600": 4.4,
  "AMD Radeon RX 6600 XT": 4.7,
  "AMD Radeon RX 6650 XT": 4.9,
  "AMD Radeon RX 6700 XT": 5.8,
  "AMD Radeon RX 6750 XT": 6.0,
  "AMD Radeon RX 6800": 6.6,
  "AMD Radeon RX 6800 XT": 7.1,
  "AMD Radeon RX 6900 XT": 7.5,
  "AMD Radeon RX 6950 XT": 7.7,
  "AMD Radeon RX 7700 XT": 7.6,
  "AMD Radeon RX 7800 XT": 8.1,
  "AMD Radeon RX 7900 XT": 8.7,
  "AMD Radeon RX 7900 XTX": 9.4
};

const cpuOverrides = {
  "Intel Core i3-10105F": 5.8,
  "Intel Core i5-10400F": 7.0,
  "Intel Core i5-11400F": 7.5,
  "Intel Core i5-12400F": 8.0,
  "Intel Core i5-13400F": 8.4,
  "Intel Core i5-14600K": 9.1,
  "Intel Core i7-10700K": 8.1,
  "Intel Core i7-11700K": 8.5,
  "Intel Core i7-12700K": 9.0,
  "Intel Core i7-13700K": 9.5,
  "Intel Core i9-10900K": 8.7,
  "Intel Core i9-11900K": 8.8,
  "Intel Core i9-12900K": 9.4,
  "Intel Core i9-13900K": 9.8,
  "Intel Core i9-14900K": 10.0,
  "AMD Ryzen 5 3600": 7.2,
  "AMD Ryzen 5 5600": 7.8,
  "AMD Ryzen 5 5600X": 8.0,
  "AMD Ryzen 5 7600": 8.5,
  "AMD Ryzen 5 7600X": 8.7,
  "AMD Ryzen 7 5700X": 8.5,
  "AMD Ryzen 7 5800X": 8.8,
  "AMD Ryzen 7 7700X": 9.4,
  "AMD Ryzen 7 7800X3D": 10.0,
  "AMD Ryzen 9 5900X": 9.1,
  "AMD Ryzen 9 5950X": 9.3,
  "AMD Ryzen 9 7900X": 9.7,
  "AMD Ryzen 9 7950X": 10.0
};

function normalizeText(value) {
  return String(value || "").trim();
}

function tierScore(value, tiers, fallback) {
  const text = normalizeText(value);
  for (const tier of tiers) {
    if (tier.match.test(text)) {
      return tier.score;
    }
  }
  return fallback;
}

function gpuScore(gpuName) {
  const text = normalizeText(gpuName);
  if (gpuOverrides[text]) {
    return gpuOverrides[text];
  }
  return tierScore(text, gpuTiers, 4.0);
}

function cpuScore(cpuName) {
  const text = normalizeText(cpuName);
  if (cpuOverrides[text]) {
    return cpuOverrides[text];
  }
  return tierScore(text, cpuTiers, 7.0);
}

function boardFactor(boardName = "") {
  return tierScore(boardName, boardFactorByChipset, 1.0);
}

function ramFactor(ramName = "", ramGb = 16) {
  const typeFactor = tierScore(ramName, ramFactorByType, 1.0);
  if (ramGb < 16) return typeFactor * 0.92;
  if (ramGb >= 32) return typeFactor * 1.04;
  return typeFactor;
}

function resolutionFactor(res) {
  const value = Number(res);
  if (value === 1080) return 1.0;
  if (value === 1440) return 0.72;
  if (value === 2160) return 0.45;
  return 1.0;
}

function gameFactor(game) {
  return gameProfiles[game] || gameProfiles.cyberpunk;
}

function parseRamGb(ram) {
  const text = normalizeText(ram);
  if (!text) return 16;
  const direct = Number(text);
  if (!Number.isNaN(direct) && direct > 0) return direct;
  const match = text.match(/(\d{1,3})\s*GB/i);
  if (match) return Number(match[1]);
  const anyNumber = text.match(/\b(\d{1,3})\b/);
  if (anyNumber) return Number(anyNumber[1]);
  return 16;
}

function toGameBase(game, gpu, cpu, ram, board) {
  const profile = gameFactor(game);
  const g = gpuScore(gpu);
  const c = cpuScore(cpu);
  const r = ramFactor(ram, parseRamGb(ram));
  const b = boardFactor(board);
  const weighted = (g * profile.gpuWeight) + (c * profile.cpuWeight) + (r * profile.memoryWeight);
  return Math.max(15, (profile.base + weighted * 10) * b);
}

export function estimateSingle({ gpu, cpu, ram, res, game, board = "" }) {
  const base = toGameBase(game, gpu, cpu, ram, board);
  const resFactor = resolutionFactor(res);
  const estimated = Math.round(base * resFactor);
  return Math.max(10, estimated);
}

function populateSelect(id, items) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = "";
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    sel.appendChild(opt);
  }
}

function setOutput(html) {
  const out = document.getElementById("output");
  if (!out) return;
  out.hidden = false;
  out.innerHTML = html;
}

function initUI() {
  const gpuSelect = document.getElementById("gpuSelect");
  const cpuSelect = document.getElementById("cpuSelect");
  const calcBtn = document.getElementById("calcBtn");
  const output = document.getElementById("output");
  if (!gpuSelect || !cpuSelect || !calcBtn || !output) return;

  populateSelect("gpuSelect", Object.keys(gpuOverrides));
  populateSelect("cpuSelect", Object.keys(cpuOverrides));

  calcBtn.addEventListener("click", () => {
    const gpu = document.getElementById("gpuSelect").value;
    const cpu = document.getElementById("cpuSelect").value;
    const ram = document.getElementById("ramSelect").value;
    const res = document.getElementById("resSelect").value;
    const game = document.getElementById("gameSelect").value;
    const board = document.getElementById("boardSelect")?.value || "";
    const fps = estimateSingle({ gpu, cpu, ram, res, game, board });
    setOutput(`
      <strong>Estimativa:</strong> ~${fps} FPS<br/>
      <div class="muted">Modelo baseado em faixa de desempenho da CPU/GPU, RAM e resolução.</div>
    `);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initUI);
}
