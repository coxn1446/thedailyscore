import { apiJson } from './sessionClient';
import { saveMyGames, updateProfile } from './profileHelpers';
import { clearGuest, clearGuestImport, guestPastes, readGuest } from './guestCache';

export const importGuestIntoAccount = async () => {
  const file = readGuest();
  const games = Array.isArray(file.games) ? file.games : null;
  const pastes = guestPastes();
  const night = file.night_mode === true;
  if (!games && !pastes.length && !night) {
    clearGuest();
    clearGuestImport();
    return { saved: 0, skipped: 0 };
  }
  if (Array.isArray(file.order) && file.order.length) {
    const on = new Set(games || []);
    await saveMyGames(file.order.map((slug) => ({ slug, enabled: games ? on.has(slug) : true })));
  } else if (games) await saveMyGames(games);
  if (night) await updateProfile({ night_mode: true });
  let result = { saved: 0, skipped: 0 };
  if (pastes.length) {
    result = await apiJson('/api/scores/import', {
      method: 'POST',
      body: JSON.stringify({ pastes }),
    });
  }
  clearGuest();
  clearGuestImport();
  return result;
};
