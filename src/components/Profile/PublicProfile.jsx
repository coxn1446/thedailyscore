import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { signedOutLoginTarget } from '../../helpers/accountDeleted';
import { acceptFriend, notifyFriendsChanged, removeFriend, requestFriend } from '../../helpers/friendHelpers';
import { fetchPlayer } from '../../helpers/profileHelpers';
import { selectUser } from '../../store/auth.reducer';
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
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const location = useLocation();
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
    if (!user?.user_id) {
      navigate(signedOutLoginTarget(location.pathname, location.search).to);
      return;
    }
    setPending(true);
    try {
      if (player.relation?.status === 'incoming') await acceptFriend(player.relation.friendship_id);
      else if (player.relation?.status === 'outgoing' || player.relation?.status === 'friends') {
        await removeFriend(player.relation.friendship_id);
      } else await requestFriend(player.user.handle);
      notifyFriendsChanged();
      load();
    } catch (err) {
      setError(err.message || 'Could not add friend.');
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
  const label = status === 'friends' ? 'Unfriend' : status === 'outgoing' ? 'Cancel request' : status === 'incoming' ? 'Accept' : 'Add Friend';
  const yours = Array.isArray(player.viewer_stats) ? player.viewer_stats : null;
  const mine = new Map((yours || []).map((game) => [game.slug, game]));
  const rows = (player.stats || []).map((game) => ({
    slug: game.slug,
    name: game.name,
    theirs: game,
    mine: mine.get(game.slug) || null,
  }));
  if (yours) {
    for (const game of yours) {
      if (!rows.some((row) => row.slug === game.slug)) {
        rows.push({ slug: game.slug, name: game.name, theirs: null, mine: game });
      }
    }
  }

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
          disabled={pending}
          onClick={follow}
          className={`${ruleButtonClass} mt-space-lg`}
        >
          {label}
        </button>
      ) : null}
      {error ? <p role="alert" className="mt-space-sm font-sans text-body-md text-error">{error}</p> : null}
      {rows.length ? (
        <div className="mt-space-lg">
          <div className={`grid gap-space-md border-b border-border py-space-sm ${yours ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <span className="font-sans text-kicker uppercase tracking-kicker text-muted">Game</span>
            <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Best Score</span>
            {yours ? <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">You</span> : null}
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.slug} className={`grid items-center gap-space-md border-b border-border py-space-sm ${yours ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <span className="flex items-center gap-space-sm font-sans text-body-md text-primary">
                  <GameLogo slug={row.slug} />
                  {row.name}
                </span>
                <span className="text-right font-mono text-body-md text-primary">{row.theirs ? formatStat(row.theirs) : '—'}</span>
                {yours ? (
                  <span className="text-right font-mono text-body-md text-primary">{row.mine ? formatStat(row.mine) : '—'}</span>
                ) : null}
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
