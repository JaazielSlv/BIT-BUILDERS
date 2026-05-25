import { db, auth } from "./firebase-config.js?v=20260526";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.__adminModuleReady = true;

const loginSection = document.getElementById("login-section");
const panelSection = document.getElementById("panel-section");
const formContainer = document.getElementById("form-container");
const loginFeedback = document.getElementById("login-feedback");

let editMode = false;
let editDocId = null;
let editCollection = null;

// Lógica para Abrir e Fechar o formulário de cadastro/edição
document.querySelector("header h1").style.color = "#00ff00";

function setLoginFeedback(message, kind = "error") {
    if (!loginFeedback) return;
    loginFeedback.style.display = "block";
    loginFeedback.textContent = message;
    if (kind === "ok") {
        loginFeedback.style.borderColor = "#00f0ff";
        loginFeedback.style.color = "#9ff9ff";
        loginFeedback.style.background = "rgba(0,240,255,0.15)";
    } else {
        loginFeedback.style.borderColor = "#ff0055";
        loginFeedback.style.color = "#ffb8d1";
        loginFeedback.style.background = "rgba(255,0,85,0.15)";
    }
}

window.addEventListener("error", (event) => {
    setLoginFeedback("Erro de script: " + event.message);
});

window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || event.reason || "Falha desconhecida";
    setLoginFeedback("Erro assíncrono: " + reason);
});

document.getElementById("btn-open-add").addEventListener("click", () => {
    cancelEditMode(); // Limpa as coisas antes de abrir
    formContainer.classList.remove("hidden");
});

document.getElementById("btn-close-form").addEventListener("click", () => {
    cancelEditMode();
    formContainer.classList.add("hidden");
});

// Suportar o botão Enter no campo de senha
document.getElementById("password").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("btn-login").click();
    }
});

// Sistema de Login
document.getElementById("btn-login").addEventListener("click", async (e) => {
    e.preventDefault(); // Impede qualquer comportamento padrão
    const btn = document.getElementById("btn-login");
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    
    if(!email || !pass) {
        setLoginFeedback("Preencha e-mail e senha para continuar.");
        return;
    }

    btn.innerText = "Verificando no Firebase...";
    btn.style.background = "#ff5500";
    btn.disabled = true;
    setLoginFeedback("Conectando ao Firebase Auth...", "ok");

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        btn.innerText = "Sucesso! Entrando...";
        btn.style.background = "#00ff00";
        setLoginFeedback("Login aceito. Carregando painel...", "ok");
    } catch (error) {
        setLoginFeedback("Erro de login: " + (error.code || error.message));
    } finally {
        btn.disabled = false;
        if(btn.innerText !== "Sucesso! Entrando...") {
            btn.innerText = "Entrar no Painel";
            btn.style.background = ""; // reseta a cor
        }
    }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
    await signOut(auth);
});

// Verifica estado do login para mostrar/esconder painel
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.classList.add("hidden");
        panelSection.classList.remove("hidden");
        setLoginFeedback("Sessão autenticada.", "ok");
        loadComponentsList(); // Carrega a lista ao logar
    } else {
        loginSection.classList.remove("hidden");
        panelSection.classList.add("hidden");
    }
});

// Mostrar os campos corretos baseados na categoria selecionada
document.getElementById("comp-categoria").addEventListener("change", (e) => {
    const cat = e.target.value;
    const divSocket = document.getElementById("div-socket");
    const divRam = document.getElementById("div-ram-type");
    const divTdp = document.getElementById("div-tdp");
    const divPotencia = document.getElementById("div-potencia");

    // Esconde tudo por padrão
    divSocket.style.display = "none";
    divRam.style.display = "none";
    divTdp.style.display = "block"; // A maioria tem TDP/Consumo
    divPotencia.style.display = "none";

    if (cat === "processadores") {
        divSocket.style.display = "block";
    } else if (cat === "placamae") {
        divSocket.style.display = "block";
        divRam.style.display = "block";
    } else if (cat === "ram") {
        divRam.style.display = "block";
    } else if (cat === "fonte") {
        divTdp.style.display = "none";
        divPotencia.style.display = "block";
    }
});


// Adicionar componente
document.getElementById("btn-add").addEventListener("click", async () => {
    const btn = document.getElementById("btn-add");
    btn.disabled = true;
    btn.innerText = "Salvando...";

    const categoria = document.getElementById("comp-categoria").value;
    const nome = document.getElementById("comp-nome").value;
    const descricao = document.getElementById("comp-descricao").value;
    const fileName = document.getElementById("comp-imagem").value.trim();
    
    // Pegando especificações técnicas
    const socket = document.getElementById("comp-socket").value.trim().toUpperCase();
    const ramType = document.getElementById("comp-ram-type").value;
    const tdp = parseInt(document.getElementById("comp-tdp").value) || 0;
    const potencia = parseInt(document.getElementById("comp-potencia").value) || 0;

    if(!nome || !fileName) {
        showToast("Nome e arquivo de imagem são obrigatórios!", "error");
        btn.disabled = false;
        btn.innerText = editMode ? "Atualizar Componente" : "Salvar no Banco de Dados";
        return;
    }

    try {
        // 1. O caminho da imagem será o caminho local relativo do seu GitHub
        const imageUrl = `./img/${fileName}`;

        // 2. Montar objeto do banco dependendo da categoria
        let produtoData = {
            nome: nome,
            descricao: descricao,
            imagemUrl: imageUrl
        };

        if (categoria === "processadores") {
            produtoData.socket = socket;
            produtoData.tdp = tdp;
        } else if (categoria === "placamae") {
            produtoData.socket = socket;
            produtoData.tipo_ram = ramType;
            produtoData.tdp = tdp || 40; // Placas mães tem consumo médio se branco
        } else if (categoria === "ram") {
            produtoData.tipo_ram = ramType;
            produtoData.tdp = tdp || 10;
        } else if (categoria === "gpu") {
            produtoData.tdp = tdp;
        } else if (categoria === "fonte") {
            produtoData.potencia = potencia;
        }

        if (editMode) {
            // Atualiza componente existente
            await updateDoc(doc(db, editCollection, editDocId), produtoData);
            showToast("Componente atualizado com sucesso!", "info");
            cancelEditMode();
        } else {
            // Salva novo componente
            produtoData.data_criacao = new Date();
            await addDoc(collection(db, categoria), produtoData);
            showToast("Componente salvo com sucesso!", "info");

            // Limpar campos
            document.getElementById("comp-nome").value = "";
            document.getElementById("comp-descricao").value = "";
            document.getElementById("comp-imagem").value = "";
            document.getElementById("comp-socket").value = "";
        }

        loadComponentsList(); // Atualizar a lista visual
    } catch (err) {
        showToast("Erro ao salvar: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = editMode ? "Atualizar Componente" : "Salvar no Banco de Dados";
    }
});

// Cancelar Edição (Resetar Form)
document.getElementById("btn-cancel-edit").addEventListener("click", cancelEditMode);

function cancelEditMode() {
    editMode = false;
    editDocId = null;
    editCollection = null;
    document.getElementById("btn-add").innerText = "Salvar no Banco de Dados";
    document.getElementById("btn-add").style.background = "#007bff";
    document.getElementById("btn-cancel-edit").classList.add("hidden");
    
    // Limpa campos
    document.getElementById("comp-nome").value = "";
    document.getElementById("comp-descricao").value = "";
    document.getElementById("comp-imagem").value = "";
    document.getElementById("comp-socket").value = "";
    document.getElementById("comp-tdp").value = "";
    document.getElementById("comp-potencia").value = "";
}

// -------------------------------------------------------------
// SISTEMA DE LISTAGEM, EDIÇÃO E EXCLUSÃO
// -------------------------------------------------------------
document.getElementById("btn-refresh").addEventListener("click", loadComponentsList);

async function loadComponentsList() {
    const listEl = document.getElementById("components-list");
    listEl.innerHTML = "<p>Carregando componentes do banco...</p>";
    
    // Agora incluem a categoria fonte
    const colecoesDesc = [
        { id: "processadores", nome: "Processadores" },
        { id: "placamae", nome: "Placas-Mãe" },
        { id: "gpu", nome: "Placas de Vídeo" },
        { id: "ram", nome: "Memórias RAM" },
        { id: "fonte", nome: "Fontes de Alimentação" }
    ];

    listEl.innerHTML = ""; // Limpa para renderizar por grupo

    let isEmpty = true;

    // Busca todos os dados por categoria e renderiza títulos
    for (const cat of colecoesDesc) {
        const querySnapshot = await getDocs(collection(db, cat.id));
        
        if (!querySnapshot.empty) {
            isEmpty = false;
            
            // Cria header da categoria
            const catHeader = document.createElement("h4");
            catHeader.style.color = "var(--neon-cyan)";
            catHeader.style.borderBottom = "1px solid var(--neon-purple)";
            catHeader.style.paddingBottom = "5px";
            catHeader.innerText = cat.nome;
            listEl.appendChild(catHeader);

            querySnapshot.forEach((docSnap) => {
                const item = { id: docSnap.id, col: cat.id, ...docSnap.data() };
                
                const div = document.createElement("div");
                div.style.background = "#1a0b2e";
                div.style.padding = "15px";
                div.style.marginBottom = "10px";
                div.style.border = "1px solid rgba(184, 41, 255, 0.4)";
                div.style.borderRadius = "5px";
                div.style.display = "flex";
                div.style.flexDirection = "row";
                div.style.alignItems = "center";
                div.style.justifyContent = "space-between";
                div.style.gap = "14px";
                
                let detalhes = "";
                if (item.socket) detalhes += ` | Socket: ${item.socket}`;
                if (item.tipo_ram) detalhes += ` | RAM: ${item.tipo_ram}`;
                if (item.tdp) detalhes += ` | Consumo: ${item.tdp}W`;
                if (item.potencia) detalhes += ` | Potência: ${item.potencia}W`;

                div.innerHTML = `
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; margin-bottom: 5px; font-weight: bold; color: var(--neon-pink);">${item.nome}</div>
                        <div style="font-size: 10px; color: #aaa; line-height: 1.6; word-break: break-word;">Specs${detalhes}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px; align-items: stretch; min-width: 96px; margin-left: auto;">
                        <button class="btn-edit" style="background: var(--neon-purple); padding: 6px 8px; font-size: 8px; width: 96px; margin-top: 0;">Editar</button>
                        <button class="btn-delete" style="background: #ff0055; padding: 6px 8px; font-size: 8px; width: 96px; margin-top: 0;">Apagar</button>
                    </div>
                `;
                
                // Ação de Apagar
                div.querySelector(".btn-delete").addEventListener("click", async () => {
                    showConfirm(`Atenção: Tem certeza que deseja apagar ${item.nome}?`, async () => {
                        await deleteDoc(doc(db, item.col, item.id));
                        loadComponentsList();
                    });
                });

                // Ação de Editar
                div.querySelector(".btn-edit").addEventListener("click", () => {
                    formContainer.classList.remove("hidden"); // Abre o modal

                    document.getElementById("comp-categoria").value = item.col;
                    document.getElementById("comp-categoria").dispatchEvent(new Event('change'));
                    
                    document.getElementById("comp-nome").value = item.nome;
                    document.getElementById("comp-descricao").value = item.descricao || "";
                    document.getElementById("comp-imagem").value = item.imagemUrl ? item.imagemUrl.replace('./img/', '') : "";
                    
                    if (item.socket) document.getElementById("comp-socket").value = item.socket;
                    if (item.tipo_ram) document.getElementById("comp-ram-type").value = item.tipo_ram;
                    if (item.tdp) document.getElementById("comp-tdp").value = item.tdp;
                    if (item.potencia) document.getElementById("comp-potencia").value = item.potencia;

                    editMode = true;
                    editDocId = item.id;
                    editCollection = item.col;
                    
                    const btnAdd = document.getElementById("btn-add");
                    btnAdd.innerText = "Atualizar Componente";
                    btnAdd.style.background = "var(--neon-cyan)";
                    btnAdd.style.color = "#000";
                    document.getElementById("btn-cancel-edit").classList.remove("hidden");
                    
                    window.scrollTo(0, 0);
                });

                listEl.appendChild(div);
            });
        }
    }

    if (isEmpty) {
        listEl.innerHTML = "<p style='color: #ff0055;'>Inventário está vazio.</p>";
    }
}
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

// Função de Confirm Customizado
function showConfirm(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0'; overlay.style.left = '0';
    overlay.style.width = '100vw'; overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
    
    let box = document.createElement('div');
    box.style.background = 'var(--bg-color, #0b001a)';
    box.style.border = '2px solid #ff0055';
    box.style.padding = '20px';
    box.style.color = '#fff';
    box.style.textAlign = 'center';
    box.style.boxShadow = '0 0 15px #ff0055';
    
    let msg = document.createElement('p');
    msg.innerText = message;
    msg.style.marginBottom = '20px';
    msg.style.fontSize = '12px';
    box.appendChild(msg);
    
    let btnRow = document.createElement('div');
    btnRow.style.display = 'flex'; btnRow.style.gap = '10px'; btnRow.style.justifyContent = 'center';
    
    let btnYes = document.createElement('button');
    btnYes.innerText = 'Sim, apagar';
    btnYes.className = 'btn-danger';
    btnYes.onclick = () => { onConfirm(); overlay.remove(); };
    
    let btnNo = document.createElement('button');
    btnNo.innerText = 'Cancelar';
    btnNo.className = 'btn-ghost';
    btnNo.onclick = () => { overlay.remove(); };
    
    btnRow.appendChild(btnYes);
    btnRow.appendChild(btnNo);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}
