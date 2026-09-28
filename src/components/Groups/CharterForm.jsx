import React, { useState } from 'react';
import { fieldClass, labelClass, primaryButtonClass } from '../Auth/AuthPageLayout';

const CharterForm = ({ games, onSubmit, isSubmitting, error }) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [handles, setHandles] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (slug) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const picked = games.filter((game) => selected.has(game.slug)).map((game) => game.slug);
    onSubmit({ name, tagline, handles, games: picked });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-space-lg max-w-measure space-y-space-md" data-testid="charter-form">
      <div>
        <label htmlFor="group-name" className={labelClass}>
          Name
        </label>
        <input
          id="group-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="group-tagline" className={labelClass}>
          Tagline
        </label>
        <input
          id="group-tagline"
          name="tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="group-handles" className={labelClass}>
          Handles
        </label>
        <input
          id="group-handles"
          name="handles"
          value={handles}
          onChange={(event) => setHandles(event.target.value)}
          placeholder="@handles"
          className={fieldClass}
        />
      </div>
      <fieldset className="space-y-space-sm">
        <legend className={labelClass}>Games</legend>
        <ul className="mt-space-sm space-y-space-sm">
          {games.map((game) => (
            <li key={game.slug}>
              <label className="flex items-center gap-space-sm font-sans text-body-md text-primary">
                <input
                  type="checkbox"
                  checked={selected.has(game.slug)}
                  onChange={() => toggle(game.slug)}
                  className="h-4 w-4 border border-primary"
                />
                {game.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {error ? (
        <p role="alert" className="font-sans text-body-md text-error">
          {error}
        </p>
      ) : null}
      <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
        Create a Group
      </button>
    </form>
  );
};

export default CharterForm;
