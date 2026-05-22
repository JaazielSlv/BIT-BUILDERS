import { db } from "../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { estimateSingle } from "./estimator.js";

function parseRamFromDoc(data){
  if (!data) return null;
  const keys = ['capacidade','capacidade_gb','ram_gb','tamanho'];
  for(const k of keys){
    if (k in data){
      const v = String(data[k]);
      const m = v.match(/(\d{1,3})/);
      if (m) return Number(m[1]);
    }
  }
  if (data.nome){
    const m = String(data.nome).match(/(\d{1,3})GB|GB|(\d{1,3})/i);
    if (m) return Number(m[1]||m[2]);
  }
  return null;
}

function showMessage(msg){
  const out = document.getElementById('output');
  out.hidden = false;
  out.innerHTML = msg;
}

document.getElementById('calcFromDbBtn').addEventListener('click', async ()=>{
  const collection = document.getElementById('docCollection').value.trim();
  const id = document.getElementById('docId').value.trim();
  if (!collection || !id){
    showMessage('<strong>Erro:</strong> informe coleção e id');
    return;
  }
  try{
    const dref = doc(db, collection, id);
    const snap = await getDoc(dref);
    if (!snap.exists()){
      showMessage('<strong>Documento não encontrado.</strong>');
      return;
    }
    const data = snap.data();

    // Tentar extrair gpu/cpu/ram
    let gpu = data.gpu || data.placa_video || data.nome || null;
    let cpu = data.cpu || data.processador || data.nome || null;
    let ram = parseRamFromDoc(data) || data.ram_gb || null;

    // Se o documento é de uma peça específica, priorizar nome como a peça correta
    if (collection.toLowerCase().includes('gpu')) gpu = data.nome || gpu;
    if (collection.toLowerCase().includes('processador') || collection.toLowerCase().includes('processador') ) cpu = data.nome || cpu;
    if (collection.toLowerCase().includes('ram')) ram = parseRamFromDoc(data) || ram;

    // Fallback: se o doc possui campos compostos (build)
    if (!gpu && data.gpu_nome) gpu = data.gpu_nome;
    if (!cpu && data.cpu_nome) cpu = data.cpu_nome;

    if (!gpu && !cpu){
      showMessage('<strong>Não foi possível determinar GPU/CPU no documento.</strong>');
      return;
    }

    const game = document.getElementById('gameSelect').value;
    const res = document.getElementById('resSelect').value;
    const ramVal = ram || document.getElementById('ramSelect').value;

    const est = estimateSingle({gpu, cpu, ram: ramVal, res, game});
    if (est === null){
      showMessage('<strong>Estimativa indisponível:</strong> perfil ou dados insuficientes.\n' + JSON.stringify({gpu,cpu,ram:ramVal}));
      return;
    }
    showMessage(`<strong>Estimativa (do Firestore):</strong> ~${est} FPS<br/><div class="muted">Origem: ${collection}/${id}</div>`);
  }catch(err){
    showMessage('<strong>Erro:</strong> '+String(err));
  }
});
