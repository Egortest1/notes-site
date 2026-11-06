(() => {
  const GAME_URL = 'https://lovable.dev/preview/Hgh5eKFZwTwWUcO2JuRNE6AsY0wwPxXq';
  const IMAGE_URL = 'assets/my-game-preview.svg';
  const list = document.getElementById('games-list');
  if (!list) return;

  function renderStaticPreviews() {
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

      // Keep exactly one game link: the existing “Открыть игру отдельно” action.
      card.querySelectorAll('a').forEach((link) => {
        if (!link.classList.contains('game-open-link')) link.remove();
      });
    });
  }

  renderStaticPreviews();
  new MutationObserver(renderStaticPreviews).observe(list, { childList: true, subtree: true });
})();
