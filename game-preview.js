(() => {
  const GAME_URL = 'https://lovable.dev/preview/Hgh5eKFZwTwWUcO2JuRNE6AsY0wwPxXq';
  const IMAGE_URL = 'assets/my-game-preview.svg';
  const BRAND_NAME = 'Note by Barsik';
  const list = document.getElementById('games-list');

  // Set the brand once. Rewriting text from within a body-wide MutationObserver
  // caused a mutation loop that could freeze the page.
  document.title = `${BRAND_NAME} — заметки и мини-игры`;
  document.querySelectorAll('.brand-name').forEach((element) => {
    if (element.textContent !== BRAND_NAME) element.textContent = BRAND_NAME;
  });
  document.querySelectorAll('.brand-wrap[aria-label]').forEach((element) => {
    if (element.getAttribute('aria-label') !== BRAND_NAME) element.setAttribute('aria-label', BRAND_NAME);
  });

  if (!list) return;

  function replaceGameFrames() {
    list.querySelectorAll('.game-card iframe').forEach((frame) => {
      let frameUrl;
      try { frameUrl = new URL(frame.src).href; } catch { return; }
      if (frameUrl !== GAME_URL) return;

      const card = frame.closest('.game-card');
      const title = card?.querySelector('.game-heading h3')?.textContent || 'Моя мини-игра';
      const image = document.createElement('img');
      image.className = 'game-preview-image';
      image.src = IMAGE_URL;
      image.alt = `Превью начального экрана игры «${title}»`;
      image.width = 765;
      image.height = 184;
      image.loading = 'lazy';
      image.decoding = 'async';
      frame.replaceWith(image);

      // Keep only the existing “Открыть игру отдельно” link on this card.
      card?.querySelectorAll('a').forEach((link) => {
        if (!link.classList.contains('game-open-link')) link.remove();
      });
    });
  }

  replaceGameFrames();
  // Observe only game cards as they are rendered; don't watch the whole body.
  new MutationObserver(replaceGameFrames).observe(list, { childList: true, subtree: true });
})();
