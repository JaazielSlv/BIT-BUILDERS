let currentImageIndex = 0;
const images = document.querySelectorAll('.carousel-image');

function showNextImage() {
    images[currentImageIndex].style.opacity = 0; // Esconde a imagem atual
    currentImageIndex = (currentImageIndex + 1) % images.length; // Incrementa o índice
    images[currentImageIndex].style.opacity = 1; // Mostra a próxima imagem
}

// Inicia o loop para alternar as imagens a cada 5 segundos (5000ms)
setInterval(showNextImage, 5000);

// Exibe a primeira imagem
images[currentImageIndex].style.opacity = 1;
