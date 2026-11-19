import React, { useEffect, useState } from 'react';
import { acceptFriend, notifyFriendsChanged, requestFriend } from '../../helpers/friendHelpers';
import { fetchPlayer } from '../../helpers/profileHelpers';
import { ruleButtonClass } from '../Auth/AuthPageLayout';
import GameLogo from '../Brand/GameLogo';

const formatStat = (game) => {
  if (game.rank_basis === 'guesses') {
    if (game.best_guesses == null) return '—';
    return game.guess_cap ? `${game.best_guesses}/${game.guess_cap}` : String(game.best_guesses);
  }
  return game.best_score == null ? '—' : String(game.best_score);
};

const PublicProfile = ({ handle }) => {
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const load = () => {
    fetchPlayer(handle)
      .then((data) => {
        setPlayer(data);
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load this profile.'));
  };

  useEffect(() => {
    load();
  }, [handle]);

  const follow = async () => {
    if (!player || pending) return;
    setPending(true);
    try {
      if (player.relation?.status === 'incoming') await acceptFriend(player.relation.friendship_id);
      else await requestFriend(player.user.handle);
      notifyFriendsChanged();
      load();
    } catch (err) {
      setError(err.message || 'Could not follow.');
    } finally {
      setPending(false);
    }
  };

  if (error && !player) {
    return <p role="alert" className="font-sans text-body-md text-error">{error}</p>;
  }
  if (!player) return null;
  const name = player.user.display_name || player.user.handle;
  const status = player.relation?.status;
  const label = status === 'friends' ? 'Friends' : status === 'outgoing' ? 'Requested' : status === 'incoming' ? 'Accept' : 'Follow';

  return (
    <section>
      <div className="flex items-center gap-space-md">
        {player.user.portrait_url ? (
          <img src={player.user.portrait_url} alt="" className="portrait h-16 w-16 border border-primary object-cover" />
        ) : (
          <span className="portrait flex h-16 w-16 items-center justify-center border border-primary font-masthead text-headline-md text-primary">
            {name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="font-masthead text-headline-lg text-primary">{name}</h1>
          <p className="font-mono text-caption text-muted">@{player.user.handle}</p>
        </div>
      </div>
      {status !== 'self' ? (
        <button
          type="button"
          disabled={pending || status === 'friends' || status === 'outgoing'}
          onClick={follow}
          className={`${ruleButtonClass} mt-space-lg`}
        >
          {label}
        </button>
      ) : null}
      {error ? <p role="alert" className="mt-space-sm font-sans text-body-md text-error">{error}</p> : null}
      {player.stats?.length ? (
        <div className="mt-space-lg">
          <div className="grid grid-cols-2 gap-space-md border-b border-border py-space-sm">
            <span className="font-sans text-kicker uppercase tracking-kicker text-muted">Game</span>
            <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Best Score</span>
          </div>
          <ul>
            {player.stats.map((game) => (
              <li key={game.slug} className="grid grid-cols-2 items-center gap-space-md border-b border-border py-space-sm">
                <span className="flex items-center gap-space-sm font-sans text-body-md text-primary">
                  <GameLogo slug={game.slug} />
                  {game.name}
                </span>
                <span className="text-right font-mono text-body-md text-primary">{formatStat(game)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <h2 className="mt-space-lg font-masthead text-headline-md text-primary">Nothing filed.</h2>
      )}
    </section>
  );
};

export default PublicProfile;
