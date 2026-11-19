import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import PasteDesk from '../components/Home/PasteDesk';
import ScoreFeed from '../components/Home/ScoreFeed';
import { GearMark } from '../components/Brand/Marks';
import GamePicker from '../components/Games/GamePicker';
import { GAME_LINKS } from '../helpers/gameCatalog';
import { fetchMyGames } from '../helpers/profileHelpers';
import { bindPullRefresh, PULL_REFRESH_DISTANCE } from '../utils/pullRefresh';

const HOME_GAMES_KEY = 'ds:home-games';
const HOME_SCROLL_KEY = 'ds:home-scroll';

const cachedHomeGames = () => {
  try {
    const slugs = JSON.parse(sessionStorage.getItem(HOME_GAMES_KEY) || 'null');
    if (!Array.isArray(slugs) || !slugs.length) return null;
    const wanted = new Set(slugs);
    const games = GAME_LINKS.filter((game) => wanted.has(game.slug));
    return games.length ? games : null;
  } catch {
    return null;
  }
};

const rememberHomeGames = (games) => {
  try {
    sessionStorage.setItem(HOME_GAMES_KEY, JSON.stringify(games.map((game) => game.slug)));
  } catch {
    /* private mode */
  }
};

const gamesFromPayload = (data) => {
  const listed = Array.isArray(data?.games) ? data.games : [];
  if (!listed.length) return GAME_LINKS;
  const enabled = new Set(listed.filter((game) => game.enabled).map((game) => game.slug));
  const games = GAME_LINKS.filter((game) => enabled.has(game.slug));
  rememberHomeGames(games);
  return games;
};

const nativeIos = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

const openGame = async (event) => {
  if (!Capacitor.isNativePlatform()) return;
  event.preventDefault();
  const url = event.currentTarget.href;
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
};

const Home = () => {
  const [games, setGames] = useState(cachedHomeGames);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [feedRevision, setFeedRevision] = useState(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollerRef = useRef(null);
  const refreshDone = useRef(null);
  const nativeIosFeed = nativeIos();

  const restoreScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(HOME_SCROLL_KEY) || 0);
    } catch {
      saved = 0;
    }
    if (saved > 0) node.scrollTop = saved;
  }, []);

  const onFeedReady = useCallback(() => {
    setRefreshing(false);
    const done = refreshDone.current;
    refreshDone.current = null;
    if (done) done();
    restoreScroll();
  }, [restoreScroll]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return undefined;
    return bindPullRefresh(node, {
      enabled: nativeIosFeed,
      onOffset: setPull,
      onRefresh: () => new Promise((resolve) => {
        refreshDone.current = resolve;
        setRefreshing(true);
        setFeedRevision((value) => value + 1);
      }),
    });
  }, [nativeIosFeed]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return undefined;
    const save = () => {
      try {
        sessionStorage.setItem(HOME_SCROLL_KEY, String(node.scrollTop));
      } catch {
        /* private mode */
      }
    };
    node.addEventListener('scroll', save, { passive: true });
    return () => {
      save();
      node.removeEventListener('scroll', save);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadGames = () => {
      fetchMyGames()
        .then((data) => {
          if (!cancelled) setGames(gamesFromPayload(data));
        })
        .catch(() => {
          if (!cancelled) setGames((current) => current || GAME_LINKS);
        });
    };
    loadGames();
    window.addEventListener('ds:games', loadGames);
    return () => {
      cancelled = true;
      window.removeEventListener('ds:games', loadGames);
    };
  }, []);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="hidden justify-end lg:flex">
        <button
          type="button"
          aria-label="Select Your Games"
          onClick={() => setGamesOpen(true)}
          className="border border-primary p-space-sm text-primary hover:bg-primary hover:text-on-primary"
        >
          <GearMark />
        </button>
      </div>
      <div ref={scrollerRef} data-testid="home-scroller" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full lg:max-w-measure">
          {nativeIosFeed && (pull > 0 || refreshing) ? (
            <p role="status" className="py-space-sm text-center font-mono text-caption uppercase tracking-kicker text-muted">
              {refreshing ? 'Refreshing' : pull >= PULL_REFRESH_DISTANCE ? 'Release' : 'Pull'}
            </p>
          ) : null}
          <PasteDesk
            games={games || []}
            onOpenGame={openGame}
            onPosted={() => setFeedRevision((value) => value + 1)}
          />
          <ScoreFeed refreshKey={feedRevision} onReady={onFeedReady} />
        </div>
      </div>
      {gamesOpen ? <GamePicker onClose={() => setGamesOpen(false)} /> : null}
    </div>
  );
};

export default Home;
