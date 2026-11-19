import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fieldClass, inkButtonClass, labelClass, ruleButtonClass } from '../Auth/AuthPageLayout';
import { logout } from '../../helpers/authHelpers';
import { ensurePushRegistration } from '../../helpers/pushRegistration';
import { fetchArchivedGroups, unarchiveGroup } from '../../helpers/groupHelpers';
import { SCORE_POSTED } from '../../helpers/scoreHelpers';
import { markAccountDeleted } from '../../helpers/accountDeleted';
import {
  deleteAccount,
  exportScores,
  fetchProfile,
  updateProfile,
  uploadPortrait,
} from '../../helpers/profileHelpers';
import { formatBestGuesses, formatMetrics } from '../../helpers/scoreHelpers';
import WeightTip from '../Groups/WeightTip';
import { CloseMark } from '../Brand/Marks';
import UploadMeter from '../Loading/UploadMeter';
import LegalLinks from '../Legal/LegalLinks';
import GameArchive from './GameArchive';
import GameLogo from '../Brand/GameLogo';
import GamePicker from '../Games/GamePicker';
import FriendDesk from '../Board/FriendDesk';
import PublicProfile from './PublicProfile';
import ScoreChart from './ScoreChart';
import { fetchFriends } from '../../helpers/friendHelpers';
import { clearUser, selectUser, setUser } from '../../store/auth.reducer';

const tabClass = (active) =>
  `border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    active ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

const formatBest = (game) => {
  if (game.rank_basis === 'guesses') return formatBestGuesses(game.best_guesses, game.guess_cap);
  return game.best_score == null ? '—' : String(game.best_score);
};

const formatAverage = (game) => {
  const value = game.rank_basis === 'guesses' ? game.average_guesses : game.average_score;
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};

const Section = ({ kicker, children }) => (
  <div className="mt-space-lg">
    <div className="double-rule" />
    <p className="mt-space-md font-sans text-kicker uppercase tracking-kicker text-secondary">{kicker}</p>
    {children}
  </div>
);

const SlideToggle = ({ on, label, disabled, onClick }) => (
  <div className="flex items-center justify-between gap-space-md border border-border px-space-sm py-space-sm">
    <span className="font-sans text-body-md text-primary">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="relative h-6 w-10 shrink-0 overflow-hidden border border-primary bg-background"
    >
      <span className={`absolute inset-y-0 left-0 w-5 transition-transform ${on ? 'translate-x-full bg-secondary' : 'bg-primary'}`} />
    </button>
  </div>
);

const SettingsDialog = ({
  notificationsOn,
  notifyPending,
  onNotifications,
  nightOn,
  nightPending,
  onNightMode,
  onExport,
  onDelete,
  onGames,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inset px-margin" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        className="w-full max-w-md border border-primary bg-background p-space-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-space-md">
          <h2 id="profile-settings-title" className="font-masthead text-headline-md text-primary">Settings</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-primary">
            <CloseMark />
          </button>
        </div>
        <div className="mt-space-lg flex flex-col gap-space-sm">
          <SlideToggle
            label="Notifications"
            on={notificationsOn}
            disabled={notifyPending}
            onClick={onNotifications}
          />
          <SlideToggle
            label="Night mode"
            on={nightOn}
            disabled={nightPending}
            onClick={onNightMode}
          />
        </div>
        <div className="mt-space-lg flex flex-col items-center gap-space-sm">
          <button type="button" onClick={onGames} className={`${ruleButtonClass} w-44 justify-center`}>
            Select Your Games
          </button>
          <button type="button" onClick={onExport} className={`${ruleButtonClass} w-44 justify-center`}>
            Export CSV
          </button>
          <button type="button" onClick={onDelete} className={`${ruleButtonClass} w-44 justify-center`}>
            Delete Profile
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteAccountDialog = ({ pending, onCancel, onConfirm }) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inset px-margin" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="w-full max-w-md border border-primary bg-background p-space-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">The Daily Score</p>
        <h2 id="delete-account-title" className="mt-space-sm font-masthead text-headline-md text-primary">
          Delete account
        </h2>
        <p className="mt-space-md font-sans text-body-md text-primary">
          Deleting your account is permanent and cannot be reversed.
        </p>
        <div className="mt-space-lg flex gap-space-sm">
          <button type="button" onClick={onConfirm} disabled={pending} className={inkButtonClass}>
            Delete account
          </button>
          <button type="button" onClick={onCancel} disabled={pending} className={ruleButtonClass}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileDesk = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { handle: routeHandle } = useParams();
  const user = useSelector(selectUser);
  const [tab, setTab] = useState('stats');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [handle, setHandle] = useState(user?.handle || '');
  const [email, setEmail] = useState(user?.email || '');
  const [portraitUrl, setPortraitUrl] = useState(user?.portrait_url || '');
  const [span, setSpan] = useState('all');
  const [stats, setStats] = useState([]);
  const [archived, setArchived] = useState([]);
  const [pendingId, setPendingId] = useState(null);
  const [archiveError, setArchiveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [incomingCount, setIncomingCount] = useState(0);
  const [notifyPending, setNotifyPending] = useState(false);
  const [nightPending, setNightPending] = useState(false);
  const portraitGeneration = useRef(0);
  const native = Capacitor.isNativePlatform();
  const notificationsOn = user?.notifications !== false;
  const nightOn = user?.night_mode === true;

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const seenGeneration = portraitGeneration.current;
      fetchProfile(span)
        .then((data) => {
          if (cancelled || !data?.user) return;
          const next = data.user;
          if (portraitGeneration.current !== seenGeneration) {
            setStats(data.stats || []);
            return;
          }
          dispatch(setUser(next));
          setDisplayName(next.display_name || '');
          setHandle(next.handle || '');
          setEmail(next.email || '');
          setPortraitUrl(next.portrait_url || '');
          setStats(data.stats || []);
        })
        .catch(() => {
          if (!cancelled) setStats([]);
        });
    };
    load();
    window.addEventListener(SCORE_POSTED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SCORE_POSTED, load);
    };
  }, [dispatch, span]);

  useEffect(() => {
    let cancelled = false;
    fetchArchivedGroups()
      .then((data) => {
        if (!cancelled) setArchived(data.groups || []);
      })
      .catch(() => {
        if (!cancelled) setArchived([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const handlePortrait = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Portrait must be an image');
      return;
    }
    const generation = portraitGeneration.current + 1;
    portraitGeneration.current = generation;
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadPortrait(file, setUploadProgress);
      if (!url) throw new Error('Could not upload portrait');
      const data = await updateProfile({
        display_name: displayName,
        handle,
        email,
        portrait_url: url,
      });
      if (portraitGeneration.current !== generation) return;
      const next = data.user;
      setPortraitUrl(next?.portrait_url || url);
      if (next) dispatch(setUser(next));
      toast.success('Saved');
    } catch (err) {
      if (portraitGeneration.current === generation) {
        toast.error(err.message || 'Could not upload portrait');
      }
    } finally {
      if (portraitGeneration.current === generation) {
        setUploading(false);
        setUploadProgress(null);
      }
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    try {
      const data = await updateProfile({
        display_name: displayName,
        handle,
        email,
        portrait_url: portraitUrl || null,
      });
      const next = data.user;
      setDisplayName(next.display_name || '');
      setHandle(next.handle || '');
      setEmail(next.email || '');
      setPortraitUrl(next.portrait_url || '');
      dispatch(setUser(next));
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleUnarchive = async (groupId) => {
    setPendingId(groupId);
    setArchiveError('');
    try {
      await unarchiveGroup(groupId);
      setArchived((current) => current.filter((group) => group.group_id !== groupId));
    } catch (err) {
      setArchiveError(err.message || 'Could not unarchive the group');
    } finally {
      setPendingId(null);
    }
  };

  const handleExport = async () => {
    try {
      await exportScores();
    } catch (err) {
      toast.error(err.message || 'Could not export scores');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      markAccountDeleted();
      dispatch(clearUser());
      navigate('/login', { replace: true, state: { accountDeleted: true } });
    } catch (err) {
      toast.error(err.message || 'Could not delete account');
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    dispatch(clearUser());
  };

  const handleNightMode = async () => {
    if (nightPending || !user) return;
    const next = !nightOn;
    const previous = user;
    setNightPending(true);
    dispatch(setUser({ ...user, night_mode: next }));
    try {
      const data = await updateProfile({ night_mode: next });
      if (data?.user) dispatch(setUser(data.user));
    } catch (err) {
      dispatch(setUser(previous));
      toast.error(err.message || 'Could not save');
    } finally {
      setNightPending(false);
    }
  };

  const handleNotifications = async () => {
    if (notifyPending) return;
    const next = !notificationsOn;
    setNotifyPending(true);
    try {
      if (next && native) {
        const result = await ensurePushRegistration({ request: true });
        if (result !== 'granted') {
          toast.error('Notifications are off.');
          return;
        }
      }
      const data = await updateProfile({ notifications: next });
      if (data?.user) dispatch(setUser(data.user));
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setNotifyPending(false);
    }
  };

  const initial = (displayName || handle || 'R').trim().charAt(0).toUpperCase();
  const viewingOther = Boolean(routeHandle) && routeHandle !== user?.handle;

  useEffect(() => {
    if (viewingOther) return undefined;
    let cancelled = false;
    const load = () => {
      fetchFriends()
        .then((data) => {
          if (!cancelled) setIncomingCount((data.incoming || []).length);
        })
        .catch(() => {
          if (!cancelled) setIncomingCount(0);
        });
    };
    load();
    window.addEventListener('ds:friends', load);
    return () => {
      cancelled = true;
      window.removeEventListener('ds:friends', load);
    };
  }, [viewingOther]);

  if (viewingOther) {
    return (
      <section data-testid="desk-profile" className="max-w-measure border-t-2 border-primary pt-space-md">
        <PublicProfile handle={routeHandle} />
      </section>
    );
  }
  const closeDelete = () => {
    if (!deleting) setConfirmingDelete(false);
  };

  return (
    <section data-testid="desk-profile" className="max-w-measure border-t-2 border-primary pt-space-md">
      <h1 className="font-masthead text-headline-lg text-primary text-balance">{displayName}</h1>
      <nav aria-label="Profile sections" className="mt-space-lg flex gap-space-lg">
        <button type="button" aria-pressed={tab === 'stats'} onClick={() => setTab('stats')} className={tabClass(tab === 'stats')}>
          Stats
        </button>
        <button type="button" aria-pressed={tab === 'archive'} onClick={() => setTab('archive')} className={tabClass(tab === 'archive')}>
          Game Archive
        </button>
        <button type="button" aria-pressed={tab === 'requests'} onClick={() => setTab('requests')} className={`${tabClass(tab === 'requests')} relative`}>
          Friendship requests
          {incomingCount > 0 ? (
            <span className="absolute right-0 top-0 bg-secondary px-space-xs font-mono text-caption text-on-primary">
              {incomingCount > 99 ? '99' : incomingCount}
            </span>
          ) : null}
        </button>
        <button type="button" aria-pressed={tab === 'profile'} onClick={() => setTab('profile')} className={tabClass(tab === 'profile')}>
          Profile
        </button>
      </nav>

      {tab === 'stats' ? (
        <>
          <ScoreChart />
          <nav aria-label="Stats period" className="mt-space-lg flex gap-space-lg">
            {[
              { id: 'all', label: 'All time' },
              { id: 'week', label: 'Weekly' },
              { id: 'month', label: 'Monthly' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={span === item.id}
                onClick={() => setSpan(item.id)}
                className={tabClass(span === item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {stats.length ? (
            <div className="mt-space-md">
              <div className="grid grid-cols-4 gap-space-md border-b border-border py-space-sm">
                <span className="font-sans text-kicker uppercase tracking-kicker text-muted">Game</span>
                <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Best Score</span>
                <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Average Score</span>
                <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Games Played</span>
              </div>
              <ul>
                {stats.map((game) => {
                  const metrics = formatMetrics(game.average_duration_seconds, game.average_hints);
                  const detail = [
                    metrics,
                    game.slug === 'redactle' && game.gave_up
                      ? `${game.gave_up} ${game.gave_up === 1 ? 'give-up' : 'give-ups'}`
                      : '',
                  ].filter(Boolean).join(' · ');
                  return (
                    <li key={game.slug} className="border-b border-border py-space-sm">
                      <div className="grid grid-cols-4 items-baseline gap-space-md">
                        <span className="flex min-w-0 items-center gap-space-sm font-sans text-body-md text-primary">
                          <GameLogo slug={game.slug} />
                          {game.name}
                        </span>
                        <span className="text-right font-mono text-body-md text-primary">{formatBest(game)}</span>
                        <span className="inline-flex items-center justify-end gap-space-xs text-right font-mono text-body-md text-primary">
                          <span>{formatAverage(game)}</span>
                          {detail ? <WeightTip text={detail} label="Score details" /> : null}
                        </span>
                        <span className="text-right font-mono text-body-md text-primary">{game.played}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'archive' ? <GameArchive timeZone={user?.timezone} /> : null}

      {tab === 'requests' ? <FriendDesk /> : null}

      {tab === 'profile' ? (
        <>
          <form onSubmit={handleSave} className="mt-space-lg space-y-space-md">
            <div className="flex items-center gap-space-md">
              {portraitUrl ? (
                <img src={portraitUrl} alt="" className="portrait h-16 w-16 border border-primary object-cover" />
              ) : (
                <div
                  aria-hidden="true"
                  className="portrait flex h-16 w-16 items-center justify-center border border-primary bg-background font-masthead text-headline-md text-primary"
                >
                  {initial}
                </div>
              )}
              <div>
                <label htmlFor="portrait" className={`${ruleButtonClass} cursor-pointer`}>
                  Choose file
                </label>
                <input
                  id="portrait"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    handlePortrait(file);
                  }}
                />
              </div>
            </div>
            {uploadProgress !== null ? <UploadMeter value={uploadProgress} /> : null}
            <div>
              <label htmlFor="display-name" className={labelClass}>
                Display name
              </label>
              <input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label htmlFor="handle" className={labelClass}>
                Handle
              </label>
              <input
                id="handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoCapitalize="off"
                className={fieldClass}
                required
              />
            </div>
            {displayName !== (user?.display_name || '')
              || handle !== (user?.handle || '')
              || email !== (user?.email || '')
              || (portraitUrl || '') !== (user?.portrait_url || '') ? (
                <button type="submit" disabled={saving || uploading} className={inkButtonClass}>
                  Save
                </button>
              ) : null}
          </form>

          {archived.length ? (
            <Section kicker="Archived">
              <ul className="mt-space-sm">
                {archived.map((group) => (
                  <li
                    key={group.group_id}
                    className="flex items-center justify-between gap-space-md border-b border-border py-space-sm"
                  >
                    <span className="font-sans text-body-md text-primary">{group.name}</span>
                    <button
                      type="button"
                      onClick={() => handleUnarchive(group.group_id)}
                      className={ruleButtonClass}
                      disabled={pendingId === group.group_id}
                    >
                      Unarchive
                    </button>
                  </li>
                ))}
              </ul>
              {archiveError ? (
                <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
                  {archiveError}
                </p>
              ) : null}
            </Section>
          ) : null}

          <div className="mt-space-lg flex flex-col items-center gap-space-sm">
            <button type="button" onClick={() => setSettingsOpen(true)} className={`${ruleButtonClass} w-44 justify-center`}>
              Settings
            </button>
            <button type="button" onClick={handleLogout} className={`${ruleButtonClass} w-44 justify-center`}>
              Sign Out
            </button>
            <LegalLinks />
          </div>
        </>
      ) : null}

      {settingsOpen ? (
        <SettingsDialog
          notificationsOn={notificationsOn}
          notifyPending={notifyPending}
          onNotifications={handleNotifications}
          nightOn={nightOn}
          nightPending={nightPending}
          onNightMode={handleNightMode}
          onExport={handleExport}
          onDelete={() => setConfirmingDelete(true)}
          onGames={() => setGamesOpen(true)}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {gamesOpen ? <GamePicker onClose={() => setGamesOpen(false)} /> : null}

      {confirmingDelete ? (
        <DeleteAccountDialog pending={deleting} onCancel={closeDelete} onConfirm={handleDelete} />
      ) : null}
    </section>
  );
};

export default ProfileDesk;
