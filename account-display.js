(() => {
  const GAME_URL = 'https://lovable.dev/preview/Hgh5eKFZwTwWUcO2JuRNE6AsY0wwPxXq';
  const GAME_ID = 'lovable-preview-hgh5ekf';
  const SESSION_KEY = 'noteFlow.demoSession.v1';
  const USERS_KEY = 'noteFlow.demoUsers.v1';
  const GAMES_PREFIX = 'noteFlow.games.';

  function syncAccountAndGame() {
    const userLabel = document.getElementById('user-label');
    const avatar = document.getElementById('user-avatar');
    const app = document.getElementById('app-shell');
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId || !userLabel || !app || app.hidden) return;

    let users = [];
    try { users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { /* ignore invalid local data */ }
    const account = users.find((user) => user.id === userId);
    const email = account?.email || userLabel.title || userLabel.textContent.trim();
    const accountName = account?.name || (email.includes('@') ? email.split('@')[0] : email);
    if (accountName && userLabel.textContent !== accountName) userLabel.textContent = accountName;
    if (email && email.includes('@')) userLabel.title = email;
    if (avatar && accountName) avatar.textContent = accountName.slice(0, 1).toUpperCase();

    const gamesKey = `${GAMES_PREFIX}${userId}`;
    let games = [];
    try { games = JSON.parse(localStorage.getItem(gamesKey) || '[]'); } catch { /* ignore invalid local data */ }
    if (!Array.isArray(games)) games = [];
    if (!games.some((game) => game.url === GAME_URL)) {
      games.unshift({ id: GAME_ID, title: 'Моя мини-игра', url: GAME_URL });
      localStorage.setItem(gamesKey, JSON.stringify(games));
      // Refresh the app's game card if the mini-games section is currently open.
      document.querySelector('[data-view="games"]')?.click();
    }
  }

  syncAccountAndGame();
  const observer = new MutationObserver(syncAccountAndGame);
  const app = document.getElementById('app-shell');
  const userLabel = document.getElementById('user-label');
  if (app) observer.observe(app, { attributes: true, attributeFilter: ['hidden'] });
  if (userLabel) observer.observe(userLabel, { childList: true, characterData: true, subtree: true });
  window.addEventListener('storage', syncAccountAndGame);
})();
