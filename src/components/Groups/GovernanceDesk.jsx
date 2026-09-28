import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { inkButtonClass, ruleButtonClass } from '../Auth/AuthPageLayout';
import { inviteUrl } from '../../helpers/groupHelpers';
import { copyText } from '../../utils/copyText';

const titleFieldClass =
  'min-w-0 flex-1 border border-border-strong bg-background px-space-sm py-space-sm text-base text-primary outline-none focus:border-primary';

const cleanTitle = (value) => value.trim().replace(/\s+/g, ' ');

const tabClass = (active) =>
  `border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    active ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

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

const GovernanceDesk = ({
  detail,
  onSave,
  onArchive,
  onLeave,
  onAlerts,
  pending,
}) => {
  const navigate = useNavigate();
  const { group, games, members } = detail;
  const isCurator = group.role === 'curator';
  const curatorCount = members.filter((member) => member.role === 'curator').length;
  const canLeave = group.role === 'fellow' || curatorCount > 1;
  const [name, setName] = useState(group.name);
  const [tab, setTab] = useState('games');
  const [draftGames, setDraftGames] = useState(() =>
    Object.fromEntries(games.map((game) => [game.slug, Boolean(game.enabled)]))
  );
  const copiedFromTouch = useRef(false);
  const nextName = cleanTitle(name);
  const nameChanged = isCurator && nextName.length > 0 && nextName !== group.name;
  const gamesChanged =
    isCurator && games.some((game) => Boolean(draftGames[game.slug]) !== Boolean(game.enabled));

  useEffect(() => {
    setName(group.name);
    setDraftGames(Object.fromEntries(games.map((game) => [game.slug, Boolean(game.enabled)])));
  }, [group.name, group.group_id, games]);

  const copyLink = async () => {
    try {
      await copyText(inviteUrl(group.invite_token));
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy invite link');
    }
  };

  const copyFromTouch = (event) => {
    if (event.pointerType !== 'touch') return;
    copiedFromTouch.current = true;
    copyLink();
  };

  const copyFromClick = () => {
    if (copiedFromTouch.current) {
      copiedFromTouch.current = false;
      return;
    }
    copyLink();
  };

  return (
    <section data-testid="governance-desk" className="max-w-measure">
      <div className="flex flex-wrap items-center gap-space-sm">
        <button
          type="button"
          onClick={() => navigate(`/groups/${group.group_id}`)}
          className={ruleButtonClass}
        >
          ← Back
        </button>
        <span aria-hidden="true" className="font-mono text-caption text-border-strong">
          |
        </span>
        {isCurator ? (
          <input
            aria-label="Group name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={titleFieldClass}
          />
        ) : (
          <h1 className="min-w-0 flex-1 font-masthead text-headline-md text-primary text-balance">{group.name}</h1>
        )}
        {nameChanged || gamesChanged ? (
          <>
            <span aria-hidden="true" className="font-mono text-caption text-border-strong">
              |
            </span>
            <button
              type="button"
              onClick={() =>
                onSave({
                  name: nameChanged ? nextName : null,
                  games: gamesChanged
                    ? games
                        .filter((game) => Boolean(draftGames[game.slug]) !== Boolean(game.enabled))
                        .map((game) => ({ slug: game.slug, enabled: Boolean(draftGames[game.slug]) }))
                    : null,
                })
              }
              className={inkButtonClass}
              disabled={pending}
            >
              Save Changes
            </button>
          </>
        ) : null}
      </div>

      <nav aria-label="Group sections" className="mt-space-lg flex gap-space-lg">
        <button type="button" aria-pressed={tab === 'games'} onClick={() => setTab('games')} className={tabClass(tab === 'games')}>
          Games
        </button>
        <button type="button" aria-pressed={tab === 'roster'} onClick={() => setTab('roster')} className={tabClass(tab === 'roster')}>
          Roster
        </button>
        <button type="button" aria-pressed={tab === 'controls'} onClick={() => setTab('controls')} className={tabClass(tab === 'controls')}>
          Controls
        </button>
      </nav>

      {tab === 'games' ? (
        <ul className="mt-space-lg space-y-space-sm">
          {games.map((game) => (
            <li key={game.slug}>
              <label className="flex items-center justify-between gap-space-md border border-border px-space-sm py-space-sm font-sans text-body-md text-primary">
                {game.name}
                <input
                  type="checkbox"
                  checked={Boolean(draftGames[game.slug])}
                  disabled={!isCurator || pending}
                  aria-label={game.name}
                  onChange={(event) =>
                    setDraftGames((current) => ({ ...current, [game.slug]: event.target.checked }))
                  }
                  className="h-4 w-4 border border-primary"
                />
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === 'roster' ? (
        <div className="mt-space-lg">
          <ul className="divide-y divide-border border-y border-border">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-baseline justify-between gap-space-md py-space-sm">
                <span className="font-sans text-body-md text-primary">
                  {member.display_name}{' '}
                  <span className="font-mono text-caption text-muted">@{member.handle}</span>
                </span>
                <span className="font-sans text-kicker uppercase tracking-kicker text-secondary">{member.role}</span>
              </li>
            ))}
          </ul>
          {isCurator && group.invite_token ? (
            <button
              type="button"
              onPointerUp={copyFromTouch}
              onClick={copyFromClick}
              className={`${ruleButtonClass} mt-space-lg`}
            >
              Copy invite link
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'controls' ? (
        <div className="mt-space-lg space-y-space-lg">
          <div className="space-y-space-sm">
            <SlideToggle
              label="Messages"
              on={group.alert_messages !== false}
              disabled={pending}
              onClick={() => onAlerts?.({
                alert_messages: group.alert_messages === false,
                alert_scores: group.alert_scores !== false,
              })}
            />
            <SlideToggle
              label="Scores"
              on={group.alert_scores !== false}
              disabled={pending}
              onClick={() => onAlerts?.({
                alert_messages: group.alert_messages !== false,
                alert_scores: group.alert_scores === false,
              })}
            />
          </div>
          <div className="flex flex-wrap gap-space-sm">
            {canLeave ? (
              <button type="button" onClick={onLeave} className={ruleButtonClass} disabled={pending}>
                Leave group
              </button>
            ) : null}
            {isCurator ? (
              <button type="button" onClick={onArchive} className={inkButtonClass} disabled={pending}>
                Archive group
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default GovernanceDesk;
