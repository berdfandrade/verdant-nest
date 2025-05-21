window.onload = function () {
  const interval = setInterval(() => {
    const topbar = document.querySelector('.topbar-wrapper');
    if (topbar) {
      // Remove logo antigo
      const oldLogo = topbar.querySelector('img[alt="Swagger UI"]');
      if (oldLogo) oldLogo.remove();

      // Remove textos
      const spans = topbar.querySelectorAll('span, a');
      spans.forEach(el => el.remove());

      // Adiciona seu logo
      const newLogo = document.createElement('img');
      newLogo.src = '/logo.png'; // Caminho da imagem
      newLogo.style.height = '40px';
      newLogo.style.marginLeft = '10px';

      topbar.appendChild(newLogo);

      clearInterval(interval);
    }
  }, 100); // Verifica a cada 100ms até o Swagger carregar
};
