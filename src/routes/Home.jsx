import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import PasteDesk from '../components/Home/PasteDesk';
import ScoreFeed from '../components/Home/ScoreFeed';
import { inkButtonClass } from '../components/Auth/AuthPageLayout';
import { GearMark } from '../components/Brand/Marks';
import GamePicker from '../components/Games/GamePicker';
import { GAME_LINKS } from '../helpers/gameCatalog';
import {
  guestHomeGames,
  guestImportUserId,
  markGuestImportTried,
} from '../helpers/guestCache';
import { importGuestIntoAccount } from '../helpers/guestImport';
import { fetchMyGames } from '../helpers/profileHelpers';
import { selectUser } from '../store/auth.reducer';
import { bindPullRefresh, PULL_REFRESH_DISTANCE } from '../utils/pullRefresh';

const HOME_GAMES_KEY = 'ds:home-games';
const HOME_SCROLL_KEY = 'ds:home-scroll';

const cachedHomeGames = () => {
  try {
    const slugs = JSON.parse(sessionStorage.getItem(HOME_GAMES_KEY) || 'null');
    if (!Array.isArray(slugs) || !slugs.length) return null;
    const bySlug = new Map(GAME_LINKS.map((game) => [game.slug, game]));
    const games = slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
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
  const bySlug = new Map(GAME_LINKS.map((game) => [game.slug, game]));
  const games = listed.filter((game) => game.enabled).map((game) => bySlug.get(game.slug)).filter(Boolean);
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
  const user = useSelector(selectUser);
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
    const toTop = () => {
      const node = scrollerRef.current;
      if (node) node.scrollTop = 0;
      try {
        sessionStorage.setItem(HOME_SCROLL_KEY, '0');
      } catch {
        /* private mode */
      }
    };
    window.addEventListener('ds:home-top', toTop);
    return () => window.removeEventListener('ds:home-top', toTop);
  }, []);

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
    if (user?.user_id) return undefined;
    setGames(guestHomeGames());
    const loadGames = () => setGames(guestHomeGames());
    window.addEventListener('ds:games', loadGames);
    return () => window.removeEventListener('ds:games', loadGames);
  }, [user?.user_id]);

  useEffect(() => {
    if (!user?.user_id) return undefined;
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
  }, [user?.user_id]);

  useEffect(() => {
    if (!user?.user_id || guestImportUserId() !== String(user.user_id)) return undefined;
    markGuestImportTried(user.user_id);
    let cancelled = false;
    importGuestIntoAccount()
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Scores stayed on this device');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="hidden justify-end lg:flex">
        {user ? (
          <button
            type="button"
            aria-label="Select Your Games"
            onClick={() => setGamesOpen(true)}
            className="border border-primary p-space-sm text-primary hover:bg-primary hover:text-on-primary"
          >
            <GearMark />
          </button>
        ) : (
          <Link to="/login" className={inkButtonClass}>
            Log In
          </Link>
        )}
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
