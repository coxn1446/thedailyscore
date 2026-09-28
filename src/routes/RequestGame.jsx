import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fieldClass, inkButtonClass, labelClass } from '../components/Auth/AuthPageLayout';
import { fileGameRequest } from '../helpers/gameRequestHelpers';

const RequestGame = () => {
  const [gameName, setGameName] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [filed, setFiled] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await fileGameRequest({ gameName, note });
      setFiled(true);
      toast.success('Request filed');
    } catch (err) {
      toast.error(err.message || 'Could not file the request');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="max-w-measure border-t-2 border-primary pt-space-md">
      <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">The Daily Score</p>
      <h1 className="mt-space-sm font-masthead text-headline-lg text-primary text-balance">Request a game</h1>
      {filed ? (
        <p className="mt-space-lg font-sans text-body-md text-primary">Request filed.</p>
      ) : (
        <form onSubmit={submit} className="mt-space-lg space-y-space-md">
          <div>
            <label htmlFor="game-name" className={labelClass}>
              Game
            </label>
            <input
              id="game-name"
              value={gameName}
              onChange={(event) => setGameName(event.target.value)}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label htmlFor="game-note" className={labelClass}>
              Note
            </label>
            <textarea
              id="game-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={6}
              className={`${fieldClass} font-mono`}
            />
          </div>
          <button type="submit" disabled={pending} className={inkButtonClass}>
            Submit
          </button>
        </form>
      )}
      <Link
        to="/"
        className="mt-space-lg inline-block font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary"
      >
        Back
      </Link>
    </section>
  );
};

export default RequestGame;
