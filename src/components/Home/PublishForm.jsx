import React from 'react';
import { inkButtonClass, ruleButtonClass } from '../Auth/AuthPageLayout';

const PublishForm = ({ groups, selected, onToggle, onToggleAll, onSubmit, onEdit, pending, error }) => {
  const allOn = groups.length > 0 && groups.every((group) => selected.has(group.group_id));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {groups.length ? (
        <div className="mt-space-lg">
          <div className="flex items-center justify-between gap-space-md">
            <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">Groups</p>
            <button type="button" aria-pressed={allOn} onClick={onToggleAll} className={ruleButtonClass}>
              {allOn ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <ul className="mt-space-sm space-y-space-sm">
            {groups.map((group) => (
              <li key={group.group_id}>
                <label className="flex items-center gap-space-sm font-sans text-body-md text-primary">
                  <input
                    type="checkbox"
                    checked={selected.has(group.group_id)}
                    onChange={() => onToggle(group.group_id)}
                    className="h-4 w-4 border border-primary"
                  />
                  {group.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
          {error}
        </p>
      ) : null}
      <div className="mt-space-lg flex gap-space-sm">
        <button type="submit" disabled={pending} className={inkButtonClass}>
          Post
        </button>
        <button type="button" disabled={pending} onClick={onEdit} className={ruleButtonClass}>
          Edit
        </button>
      </div>
    </form>
  );
};

export default PublishForm;
