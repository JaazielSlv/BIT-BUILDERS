let currentImageIndex = 0;
const images = document.querySelectorAll('.carousel-image');

function showNextImage() {
    images[currentImageIndex].style.opacity = 0;
    currentImageIndex = (currentImageIndex + 1) % images.length; 
    images[currentImageIndex].style.opacity = 1; 
}


setInterval(showNextImage, 5000);


images[currentImageIndex].style.opacity = 1;
