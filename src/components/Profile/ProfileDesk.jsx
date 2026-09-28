import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fieldClass, inkButtonClass, labelClass, ruleButtonClass } from '../Auth/AuthPageLayout';
import { logout } from '../../helpers/authHelpers';
import { fetchArchivedGroups, unarchiveGroup } from '../../helpers/groupHelpers';
import {
  deleteAccount,
  exportScores,
  fetchProfile,
  updateProfile,
  uploadPortrait,
} from '../../helpers/profileHelpers';
import GameArchive from './GameArchive';
import { clearUser, selectUser, setUser } from '../../store/auth.reducer';

const tabClass = (active) =>
  `border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    active ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

const formatBest = (game) => {
  if (game.rank_basis === 'guesses') {
    return game.best_guesses == null ? '—' : `${game.best_guesses}/6`;
  }
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProfile(span)
      .then((data) => {
        if (cancelled || !data?.user) return;
        const next = data.user;
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
    return () => {
      cancelled = true;
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
    setUploading(true);
    try {
      const url = await uploadPortrait(file);
      if (url) setPortraitUrl(url);
    } catch (err) {
      toast.error(err.message || 'Could not upload portrait');
    } finally {
      setUploading(false);
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
      dispatch(clearUser());
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not delete account');
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    dispatch(clearUser());
  };

  const initial = (displayName || handle || 'R').trim().charAt(0).toUpperCase();
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
        <button type="button" aria-pressed={tab === 'profile'} onClick={() => setTab('profile')} className={tabClass(tab === 'profile')}>
          Profile
        </button>
      </nav>

      {tab === 'stats' ? (
        <>
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
                {stats.map((game) => (
                  <li key={game.slug} className="grid grid-cols-4 items-baseline gap-space-md border-b border-border py-space-sm">
                    <span className="font-sans text-body-md text-primary">{game.name}</span>
                    <span className="text-right font-mono text-body-md text-primary">{formatBest(game)}</span>
                    <span className="text-right font-mono text-body-md text-primary">{formatAverage(game)}</span>
                    <span className="text-right font-mono text-body-md text-primary">{game.played}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'archive' ? <GameArchive timeZone={user?.timezone} /> : null}

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
            <button type="button" onClick={handleExport} className={`${ruleButtonClass} w-44 justify-center`}>
              Export CSV
            </button>
            <button type="button" onClick={handleLogout} className={`${ruleButtonClass} w-44 justify-center`}>
              Sign Out
            </button>
            <button type="button" onClick={() => setConfirmingDelete(true)} className={`${ruleButtonClass} w-44 justify-center`}>
              Delete Profile
            </button>
          </div>
        </>
      ) : null}

      {confirmingDelete ? (
        <DeleteAccountDialog pending={deleting} onCancel={closeDelete} onConfirm={handleDelete} />
      ) : null}
    </section>
  );
};

export default ProfileDesk;
