(() => {
  const GAME_URL = 'https://lovable.dev/preview/Hgh5eKFZwTwWUcO2JuRNE6AsY0wwPxXq';
  const IMAGE_URL = 'assets/my-game-preview.svg';
  const BRAND_NAME = 'Note by Barsik';
  const list = document.getElementById('games-list');

  function applyBrandName() {
    document.title = `${BRAND_NAME} — заметки и мини-игры`;
    document.querySelectorAll('.brand-name').forEach((element) => {
      element.textContent = BRAND_NAME;
    });
    document.querySelectorAll('.brand-wrap[aria-label]').forEach((element) => {
      element.setAttribute('aria-label', BRAND_NAME);
    });
  }

  function replaceGameFrames() {
    if (!list) return;
    list.querySelectorAll('.game-card').forEach((card) => {
      const frame = card.querySelector('iframe');
      if (!frame) return;
      let frameUrl;
      try { frameUrl = new URL(frame.src).href; } catch { return; }
      if (frameUrl !== GAME_URL) return;

      const title = card.querySelector('.game-heading h3')?.textContent || 'Моя мини-игра';
      const image = document.createElement('img');
      image.className = 'game-preview-image';
      image.src = IMAGE_URL;
      image.alt = `Превью начального экрана игры «${title}»`;
      image.width = 765;
      image.height = 184;
      image.loading = 'lazy';
      image.decoding = 'async';
      frame.replaceWith(image);

      // Retain only the designated standalone game link.
      card.querySelectorAll('a').forEach((link) => {
        if (!link.classList.contains('game-open-link')) link.remove();
      });
    });
  }

  applyBrandName();
  replaceGameFrames();
  new MutationObserver(() => {
    applyBrandName();
    replaceGameFrames();
  }).observe(document.body, { childList: true, subtree: true });
})();
