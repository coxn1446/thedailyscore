import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CalendarMark, CloseMark } from '../components/Brand/Marks';
import CharterForm from '../components/Groups/CharterForm';
import GroupDirectory from '../components/Groups/GroupDirectory';
import GroupParlor from '../components/Groups/GroupParlor';
import GroupRegister from '../components/Groups/GroupRegister';
import Loading from '../components/Loading/Loading';
import { charterGroup, fetchGroup, fetchGroups } from '../helpers/groupHelpers';
import { fetchConversations, markParlorRead } from '../helpers/parlorHelpers';
import { getSocket } from '../helpers/socketHelpers';
import { selectUser } from '../store/auth.reducer';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

const tabClass = (active) =>
  `border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    active ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

const playsGame = (group, slug) => group.enabled_games?.some((game) => game.slug === slug);

const iconButtonClass = 'inline-flex shrink-0 border border-primary p-space-sm text-primary hover:bg-primary hover:text-on-primary';

const groupPath = (id, game, period, from, to) => {
  const params = new URLSearchParams();
  if (game) params.set('game', game);
  params.set('period', period || 'today');
  if (period === 'custom' && from) {
    params.set('from', from);
    if (to) params.set('to', to);
  }
  return `/groups/${id}?${params.toString()}`;
};

const Groups = () => {
  const user = useSelector(selectUser);
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGame = searchParams.get('game');
  const period = PERIODS.some((item) => item.id === searchParams.get('period'))
    ? searchParams.get('period')
    : 'today';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const wide = !(typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches);
  const [directory, setDirectory] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showCharter, setShowCharter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [parlorOpen, setParlorOpen] = useState(false);
  const [parlorGame, setParlorGame] = useState(null);
  const [conversations, setConversations] = useState([]);
  const activeSlug = parlorGame || selectedGame;

  useEffect(() => {
    let cancelled = false;
    fetchGroups(period === 'custom' ? from : '', period === 'custom' ? to || from : '')
      .then((data) => {
        if (!cancelled) setDirectory(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load groups.');
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to]);

  useEffect(() => {
    if (!directory || selectedGame) return undefined;
    const current = directory.groups.find((group) => String(group.group_id) === String(groupId)) || directory.groups[0];
    const played = current?.standings?.find((row) => row.daily_rank != null || row.weekly_rank != null);
    const firstEnabled = directory.groups.flatMap((group) => group.enabled_games || [])[0]?.slug;
    const slug = played?.slug || current?.enabled_games?.[0]?.slug || firstEnabled;
    if (!slug) return undefined;
    const next = new URLSearchParams(searchParams);
    next.set('game', slug);
    setSearchParams(next, { replace: true });
    return undefined;
  }, [directory, groupId, selectedGame, searchParams, setSearchParams]);

  useEffect(() => {
    if (!directory || showCharter || !selectedGame) return undefined;
    if (directory.groups.some((group) => playsGame(group, selectedGame))) return undefined;
    const fallback = directory.groups.flatMap((group) => group.enabled_games || [])[0]?.slug;
    if (!fallback || fallback === selectedGame) return undefined;
    const next = new URLSearchParams(searchParams);
    next.set('game', fallback);
    if (!next.get('period')) next.set('period', period);
    setSearchParams(next, { replace: true });
    return undefined;
  }, [directory, showCharter, selectedGame, searchParams, setSearchParams, period]);

  useEffect(() => {
    if (!wide || !directory || groupId || showCharter || directory.groups.length === 0) return;
    const played = directory.groups[0].standings?.find((row) => row.daily_rank != null || row.weekly_rank != null || row.all_time_rank != null);
    const slug = selectedGame || played?.slug || directory.groups[0].enabled_games?.[0]?.slug || directory.games?.[0]?.slug;
    const playing = slug ? directory.groups.filter((group) => playsGame(group, slug)) : directory.groups;
    const target = playing[0];
    if (!target) return;
    navigate(groupPath(target.group_id, slug, period, from, to), { replace: true });
  }, [directory, groupId, navigate, showCharter, selectedGame, period, from, to, wide]);

  useEffect(() => {
    if (!directory || !selectedGame || showCharter || !groupId) return;
    const playing = directory.groups.filter((group) => playsGame(group, selectedGame));
    if (!playing.length) return;
    if (playing.some((group) => String(group.group_id) === String(groupId))) return;
    navigate(groupPath(playing[0].group_id, selectedGame, period, from, to), { replace: true });
  }, [directory, selectedGame, groupId, showCharter, navigate, period]);

  useEffect(() => {
    if (!groupId || !selectedGame) {
      if (!groupId) setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setDetail(null);
    setLoadError('');
    fetchGroup(groupId, selectedGame, period === 'custom' ? from : '', period === 'custom' ? to || from : '')
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load this group.');
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, selectedGame, period, from, to]);

  const noteParlorSeen = useCallback((id, slug) => {
    const game = slug || selectedGame;
    markParlorRead(id, game)
      .then(() => {
        setConversations((current) => current.map((row) => (
          String(row.group_id) === String(id) && row.slug === game
            ? { ...row, unread_count: 0 }
            : row
        )));
      })
      .catch(() => {});
  }, [selectedGame]);

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((data) => {
        if (!cancelled) setConversations(data.conversations || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId, selectedGame]);

  const fromMessages = searchParams.get('chat') === '1' && !wide;

  useEffect(() => {
    setParlorOpen(fromMessages);
  }, [fromMessages]);

  useEffect(() => {
    if (!fromMessages) return;
    setParlorGame(selectedGame);
  }, [fromMessages, groupId, selectedGame]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.user_id) return undefined;
    const onMessage = (message) => {
      if (!message || Number(message.user_id) === Number(user.user_id)) return;
      const watching = parlorOpen ? activeSlug : selectedGame;
      const looking = String(message.group_id) === String(groupId)
        && message.game_slug === watching
        && !showCharter
        && (parlorOpen || wide);
      if (looking) return;
      setConversations((current) => current.map((row) => (
        String(row.group_id) === String(message.group_id) && row.slug === message.game_slug
          ? { ...row, unread_count: Number(row.unread_count || 0) + 1 }
          : row
      )));
    };
    socket.on('parlor:message', onMessage);
    return () => socket.off?.('parlor:message', onMessage);
  }, [user?.user_id, groupId, selectedGame, activeSlug, parlorOpen, wide, showCharter]);

  const handleCharter = async (body) => {
    setIsSubmitting(true);
    setError('');
    try {
      const created = await charterGroup(body);
      const nextDirectory = await fetchGroups();
      setDirectory(nextDirectory);
      setShowCharter(false);
      navigate(groupPath(created.group.group_id, selectedGame, period, from, to));
    } catch (err) {
      setError(err.message || 'Could not create the group');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!directory && !loadError) return <Loading />;

  if (loadError && !directory) {
    return (
      <p role="alert" className="font-sans text-body-md text-error">
        {loadError}
      </p>
    );
  }

  const groups = directory?.groups || [];
  const games = [...(directory?.games || [])].sort((a, b) => a.sort_order - b.sort_order);
  const switcherGames = games.filter((game) => groups.some((group) => playsGame(group, game.slug)));
  const empty = groups.length === 0;

  const chooseFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    if (!next.get('period')) next.set('period', 'today');
    setSearchParams(next);
  };

  const playing = selectedGame ? groups.filter((group) => playsGame(group, selectedGame)) : groups;
  const unreadFor = (id) => conversations.find(
    (row) => String(row.group_id) === String(id) && row.slug === selectedGame
  )?.unread_count || 0;
  const parlorGames = [...(detail?.games || [])]
    .filter((game) => game.enabled)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const activeGame = parlorGames.find((game) => game.slug === activeSlug)
    || games.find((game) => game.slug === activeSlug);
  const currentPlays = !selectedGame || playing.some((group) => String(group.group_id) === String(groupId));

  return (
    <div data-testid="desk-groups" className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-t-2 border-primary pt-space-md">
      {empty ? (
        <section data-testid="groups-empty" className="max-w-measure">
          <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">Groups</p>
          <h1 className="mt-space-sm font-masthead text-headline-xl-mobile text-primary text-balance md:text-headline-lg">
            No syndicates.
          </h1>
          <CharterForm games={games} onSubmit={handleCharter} isSubmitting={isSubmitting} error={error} />
        </section>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {switcherGames.length ? (
            <div className="mb-space-lg flex shrink-0 flex-col gap-space-md lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-space-xl">
              <nav aria-label="Games" className="flex flex-wrap gap-space-lg">
                {switcherGames.map((game) => (
                  <button
                    key={game.slug}
                    type="button"
                    aria-pressed={game.slug === selectedGame}
                    onClick={() => chooseFilter('game', game.slug)}
                    className={tabClass(game.slug === selectedGame)}
                  >
                    {game.name}
                  </button>
                ))}
              </nav>
              <nav aria-label="Time period" className="flex flex-wrap gap-space-lg">
                {PERIODS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === period}
                    onClick={() => chooseFilter('period', item.id)}
                    className={tabClass(item.id === period)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              {period === 'custom' ? (
                <div className="flex gap-space-sm">
                  <label className="font-sans text-kicker uppercase tracking-kicker text-muted">
                    <span className="flex items-center gap-space-xs">
                      <CalendarMark className="h-4 w-4" />
                      From
                    </span>
                    <input
                      type="date"
                      value={from}
                      onChange={(event) => chooseFilter('from', event.target.value)}
                      className="mt-space-xs block border border-border-strong bg-background px-space-sm py-space-sm text-base text-primary"
                    />
                  </label>
                  <label className="font-sans text-kicker uppercase tracking-kicker text-muted">
                    <span className="flex items-center gap-space-xs">
                      <CalendarMark className="h-4 w-4" />
                      To
                    </span>
                    <input
                      type="date"
                      value={to}
                      onChange={(event) => chooseFilter('to', event.target.value)}
                      className="mt-space-xs block border border-border-strong bg-background px-space-sm py-space-sm text-base text-primary"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}
          {showCharter && !wide ? (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-background px-margin py-space-lg">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-group-title"
                className="mx-auto w-full max-w-measure"
              >
                <div className="flex items-start justify-between gap-space-md">
                  <h1 id="create-group-title" className="font-masthead text-headline-lg text-primary">
                    Create a Group
                  </h1>
                  <button type="button" aria-label="Close" onClick={() => setShowCharter(false)} className={iconButtonClass}>
                    <CloseMark />
                  </button>
                </div>
                <CharterForm games={games} onSubmit={handleCharter} isSubmitting={isSubmitting} error={error} />
              </div>
            </div>
          ) : null}
          <div className="grid min-h-0 flex-1 grid-rows-1 gap-gutter overflow-hidden lg:grid-cols-3">
          <div className={`min-h-0 lg:col-span-1 ${groupId ? 'hidden lg:block' : ''}`}>
            <GroupDirectory
              groups={playing.map((group) => ({ ...group, unread_count: unreadFor(group.group_id) }))}
              selectedId={groupId}
              selectedGame={selectedGame}
              period={period}
              from={from}
              to={to}
              onCharter={() => {
                setError('');
                setShowCharter(true);
              }}
            />
          </div>
          <div className={`min-h-0 overflow-y-auto lg:col-span-1 ${groupId ? '' : 'hidden lg:block'}`}>
            {showCharter && wide ? (
              <section>
                <div className="flex items-start justify-between gap-space-md">
                  <h1 className="font-masthead text-headline-lg text-primary">Create a Group</h1>
                  <button type="button" aria-label="Close" onClick={() => setShowCharter(false)} className={iconButtonClass}>
                    <CloseMark />
                  </button>
                </div>
                <CharterForm games={games} onSubmit={handleCharter} isSubmitting={isSubmitting} error={error} />
              </section>
            ) : null}
            {!showCharter && loadError ? (
              <p role="alert" className="font-sans text-body-md text-error">
                {loadError}
              </p>
            ) : null}
            {!showCharter && !loadError && groupId && !detail ? <Loading /> : null}
            {!showCharter && currentPlays && detail ? (
              <GroupRegister
                detail={detail}
                gameSlug={selectedGame}
                period={period}
                from={from}
                to={to}
                unreadCount={unreadFor(groupId)}
                onOpenParlor={() => {
                  setParlorGame(selectedGame);
                  setParlorOpen(true);
                }}
              />
            ) : null}
          </div>
          {wide ? (
            <div className="hidden h-full min-h-0 flex-col overflow-hidden lg:flex">
              {groupId && !showCharter && currentPlays && detail ? (
                <GroupParlor groupId={detail.group.group_id} gameSlug={selectedGame} onSeen={noteParlorSeen} />
              ) : null}
            </div>
          ) : null}
          </div>
          {parlorOpen && detail ? (
            <div className="absolute inset-0 z-50 flex flex-col overflow-hidden overscroll-none bg-background px-margin py-space-lg lg:hidden">
              <div className="mx-auto flex w-full max-w-measure shrink-0 items-start justify-between gap-space-md">
                <h2 className="font-masthead text-headline-lg text-primary">
                  {activeGame ? `${detail.group.name} - ${activeGame.name}` : 'Chat'}
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => {
                    if (searchParams.get('chat') === '1') {
                      navigate('/messages');
                      return;
                    }
                    setParlorOpen(false);
                  }}
                  className={iconButtonClass}
                >
                  <CloseMark />
                </button>
              </div>
              {parlorGames.length ? (
                <nav aria-label="Chat games" className="mx-auto mt-space-md flex w-full max-w-measure shrink-0 flex-wrap gap-space-lg">
                  {parlorGames.map((game) => (
                    <button
                      key={game.slug}
                      type="button"
                      aria-pressed={game.slug === activeSlug}
                      onClick={() => setParlorGame(game.slug)}
                      className={tabClass(game.slug === activeSlug)}
                    >
                      {game.name}
                    </button>
                  ))}
                </nav>
              ) : null}
              <div className="mx-auto mt-space-md flex min-h-0 w-full max-w-measure flex-1 flex-col">
                <GroupParlor
                  key={activeSlug || 'parlor'}
                  groupId={detail.group.group_id}
                  gameSlug={activeSlug}
                  onSeen={noteParlorSeen}
                  showTitle={false}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Groups;
