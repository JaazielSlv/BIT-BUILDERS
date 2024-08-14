function updateImage(component) {
    const selectElement = document.getElementById(component);
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const imgElement = document.getElementById(`${component}-img`);

    if (selectedOption.value) {
        imgElement.src = selectedOption.getAttribute('data-img');
        imgElement.style.display = 'block';
    } else {
        imgElement.style.display = 'none';
    }
}

function checkCompatibility() {
    const motherboard = document.getElementById('motherboard').value;
    const cpu = document.getElementById('cpu').value;
    const gpu = document.getElementById('gpu').value;
    const ram = document.getElementById('ram').value;
    const successGif = document.getElementById('success-gif');
    const failureGif = document.getElementById('failure-gif');
    const result = document.getElementById('compatibility-result');

    // Resetar a exibição inicial
    successGif.style.display = 'none';
    failureGif.style.display = 'none';
    result.textContent = "Verificando compatibilidade...";

    // Simular o tempo de carregamento (3 segundos)
    setTimeout(() => {
        // Verificar compatibilidade entre os componentes
        let isCompatible = true;
        let message = "Compatibilidade verificada com sucesso!";

        // Regras de compatibilidade simples (exemplos fictícios)
        if (motherboard === 'asus-prime' && cpu !== 'intel-i9') {
            isCompatible = false;
            message = "Incompatibilidade: A placa-mãe ASUS Prime Z590 requer um processador Intel Core i9.";
        } else if (gpu === 'nvidia-rtx-3080' && ram !== 'gskill-32gb') {
            isCompatible = false;
            message = "Incompatibilidade: A NVIDIA RTX 3080 requer memória RAM de 32GB.";
        }

        result.textContent = message;
        if (isCompatible) {
            successGif.style.display = 'block';
        } else {
            failureGif.style.display = 'block';
        }
    }, 3000);
}
