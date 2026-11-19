import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import GameLogo from '../Brand/GameLogo';
import { CommentMark, LikeMark, MediaMark } from '../Brand/Marks';
import { inkButtonClass } from '../Auth/AuthPageLayout';
import UploadMeter from '../Loading/UploadMeter';
import PhotoViewer from './PhotoViewer';
import { selectUser } from '../../store/auth.reducer';
import { gameHref } from '../../helpers/gameCatalog';
import { formatResult } from '../../helpers/scoreHelpers';
import { relativeTime } from '../../utils/relativeTime';
import {
  deleteComment,
  fetchComments,
  fetchFeed,
  likeScore,
  postComment,
  unlikeScore,
  uploadPicture,
} from '../../helpers/feedHelpers';

const linkClass =
  'font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary';

const openGame = async (event) => {
  event.stopPropagation();
  if (!Capacitor.isNativePlatform()) return;
  event.preventDefault();
  const url = event.currentTarget.href;
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
};

const nameOf = (user) => user?.display_name || user?.handle || 'Reader';

const Portrait = ({ user }) => {
  const initial = nameOf(user).trim().charAt(0).toUpperCase();
  if (user?.portrait_url) {
    return <img src={user.portrait_url} alt="" className="portrait h-8 w-8 border border-primary object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className="portrait flex h-8 w-8 items-center justify-center border border-primary bg-background font-masthead text-body-md text-primary"
    >
      {initial}
    </span>
  );
};

const CommentList = ({ post, viewerId, onCount }) => {
  const [comments, setComments] = useState(null);
  const [draft, setDraft] = useState('');
  const [picture, setPicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [viewer, setViewer] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!picture || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(picture);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picture]);

  useEffect(() => {
    let cancelled = false;
    fetchComments(post.score_id)
      .then((data) => {
        if (!cancelled) setComments(Array.isArray(data?.comments) ? data.comments : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load comments');
      });
    return () => {
      cancelled = true;
    };
  }, [post.score_id]);

  const send = async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    if (picture) setUploadProgress(0);
    try {
      let imageUrl = '';
      if (picture) {
        imageUrl = await uploadPicture(picture, setUploadProgress);
        if (!imageUrl) throw new Error('Could not upload picture');
      }
      const saved = await postComment(post.score_id, draft, imageUrl);
      setComments((current) => [...(current || []), saved.comment]);
      setDraft('');
      setPicture(null);
      setPreviewUrl('');
      onCount(1);
    } catch (err) {
      setError(err.message || 'Could not comment');
    } finally {
      setPending(false);
      setUploadProgress(null);
    }
  };

  const remove = async (commentId) => {
    if (pending) return;
    setPending(true);
    try {
      await deleteComment(commentId);
      setComments((current) => (current || []).filter((comment) => comment.comment_id !== commentId));
      onCount(-1);
    } catch (err) {
      toast.error(err.message || 'Could not delete comment');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-space-sm">
      {error ? <p role="alert" className="font-sans text-body-md text-error">{error}</p> : null}
      {(comments || []).map((comment) => (
        <div key={comment.comment_id} className="border-t border-border py-space-sm">
          <p className="font-sans text-caption text-muted">{nameOf(comment.user)}</p>
          {comment.body ? <p className="font-sans text-body-md text-primary">{comment.body}</p> : null}
          {comment.image_url ? (
            <button type="button" aria-label="Open picture" onClick={() => setViewer(comment.image_url)} className="mt-space-sm block w-full cursor-pointer">
              <img src={comment.image_url} alt="Picture" className="max-h-64 w-full border border-border object-contain" />
            </button>
          ) : null}
          {Number(comment.user?.user_id) === Number(viewerId) ? (
            <button type="button" onClick={() => remove(comment.comment_id)} className="mt-space-sm font-sans text-caption text-muted hover:text-primary">
              Delete
            </button>
          ) : null}
        </div>
      ))}
      <form onSubmit={send} className="mt-space-sm border border-border-strong bg-background focus-within:border-primary">
        {previewUrl ? (
          <button type="button" aria-label="Open preview" onClick={() => setViewer(previewUrl)} className="block w-full cursor-pointer">
            <img src={previewUrl} alt="Preview" className="max-h-64 w-full border-b border-border object-contain" />
          </button>
        ) : null}
        {uploadProgress !== null ? (
          <div className="border-b border-border px-space-sm py-space-sm">
            <UploadMeter value={uploadProgress} />
          </div>
        ) : null}
        <label htmlFor={`comment-${post.score_id}`} className="sr-only">Comment</label>
        <textarea
          id={`comment-${post.score_id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="Comment"
          className="w-full resize-none bg-background px-space-sm pt-space-sm text-base text-primary outline-none"
        />
        <div className="flex items-center gap-space-sm border-t border-border px-space-sm py-space-sm">
          <label htmlFor={`picture-${post.score_id}`} className="cursor-pointer text-primary hover:text-secondary">
            <MediaMark />
          </label>
          <input
            id={`picture-${post.score_id}`}
            aria-label="Picture"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              event.target.value = '';
              setPicture(file);
            }}
          />
          <button type="submit" disabled={pending} className={`${inkButtonClass} ml-auto`}>
            Post
          </button>
        </div>
      </form>
      {viewer ? <PhotoViewer src={viewer} onClose={() => setViewer('')} /> : null}
    </div>
  );
};

export const ScoreCard = ({ post, viewerId, detail = false, onChange }) => {
  const navigate = useNavigate();
  const likeLock = useRef(false);
  const when = relativeTime(post.created_at);

  const toggleLike = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (likeLock.current) return;
    likeLock.current = true;
    const previous = post;
    const liked = !post.liked;
    onChange({
      ...post,
      liked,
      like_count: Math.max(0, post.like_count + (liked ? 1 : -1)),
    });
    try {
      const next = liked ? await likeScore(post.score_id) : await unlikeScore(post.score_id);
      onChange({ ...previous, liked: next.liked, like_count: next.like_count });
    } catch (err) {
      onChange(previous);
      toast.error(err.message || 'Could not like');
    } finally {
      likeLock.current = false;
    }
  };

  const openPost = (event) => {
    if (detail) return;
    const interactive = event.target.closest('a, button, input, textarea, label');
    if (interactive) return;
    navigate(`/post/${post.score_id}`);
  };

  const person = post.user?.handle ? (
    <Link to={`/profile/${post.user.handle}`} className={linkClass}>{nameOf(post.user)}</Link>
  ) : (
    <span className="font-sans text-body-md text-primary">{nameOf(post.user)}</span>
  );

  const likeLabel = `${post.liked ? 'Liked' : 'Like'} ${post.like_count}`;
  const commentLabel = `Comment ${post.comment_count}`;

  return (
    <article className="border-t border-border py-space-sm" onClick={openPost}>
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm whitespace-nowrap">
          <Portrait user={post.user} />
          {person}
          {when ? (
            <time dateTime={post.created_at} className="font-mono text-caption text-muted">
              {when}
            </time>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-space-sm">
          <a
            href={gameHref(post.game?.slug)}
            target="_blank"
            rel="noreferrer"
            onClick={openGame}
            className="inline-flex items-center gap-space-sm text-secondary underline decoration-secondary underline-offset-2 hover:text-primary"
          >
            <span className="text-right">
              <span className="block font-sans text-kicker uppercase tracking-kicker">{post.game?.name}</span>
              <span className="block font-mono text-caption text-muted no-underline">#{post.puzzle_number}</span>
            </span>
            <GameLogo slug={post.game?.slug} className="h-8 w-8" />
          </a>
        </div>
      </div>
      {detail ? (
        <div>
          <p className="mt-space-xs font-mono text-headline-md text-primary">{formatResult(post)}</p>
          {post.snippet ? (
            <pre className="mt-space-sm overflow-x-auto whitespace-pre-wrap font-mono text-caption text-primary">
              {post.snippet}
            </pre>
          ) : null}
        </div>
      ) : (
        <Link to={`/post/${post.score_id}`} className="block text-primary">
          <p className="mt-space-xs font-mono text-headline-md text-primary">{formatResult(post)}</p>
          {post.snippet ? (
            <pre className="mt-space-sm overflow-x-auto whitespace-pre-wrap font-mono text-caption text-primary">
              {post.snippet}
            </pre>
          ) : null}
        </Link>
      )}
      <div className="mt-space-sm flex items-center gap-space-lg">
        <button
          type="button"
          aria-label={likeLabel}
          aria-pressed={post.liked}
          onClick={toggleLike}
          className={`inline-flex items-center gap-space-xs font-mono text-caption ${post.liked ? 'text-secondary' : 'text-muted hover:text-primary'}`}
        >
          <LikeMark filled={post.liked} />
          {post.like_count}
        </button>
        {detail ? (
          <span className="inline-flex items-center gap-space-xs font-mono text-caption text-muted">
            <CommentMark />
            {post.comment_count}
          </span>
        ) : (
          <Link to={`/post/${post.score_id}`} aria-label={commentLabel} className="inline-flex items-center gap-space-xs font-mono text-caption text-muted hover:text-primary">
            <CommentMark />
            {post.comment_count}
          </Link>
        )}
      </div>
      {detail ? (
        <CommentList
          post={post}
          viewerId={viewerId}
          onCount={(delta) => onChange({ ...post, comment_count: Math.max(0, post.comment_count + delta) })}
        />
      ) : null}
    </article>
  );
};

const ScoreFeed = ({ refreshKey = 0, onReady }) => {
  const user = useSelector(selectUser);
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchFeed()
      .then((data) => {
        if (!cancelled) {
          setPosts(Array.isArray(data?.posts) ? data.posts : []);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPosts([]);
          setError(err.message || 'Could not load the feed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (posts && onReady) onReady();
  }, [posts, onReady]);

  const replace = (next) => {
    setPosts((current) => (current || []).map((post) => (post.score_id === next.score_id ? next : post)));
  };

  return (
    <section aria-label="Feed" className="w-full">
      {error ? (
        <p role="alert" className="mt-space-lg font-sans text-body-md text-error">{error}</p>
      ) : null}
      {posts && posts.length === 0 && !error ? (
        <p className="mt-space-xl font-masthead text-headline-md text-primary">No scores yet.</p>
      ) : null}
      {(posts || []).map((post) => (
        <ScoreCard
          key={post.score_id}
          post={post}
          viewerId={user?.user_id}
          onChange={replace}
        />
      ))}
    </section>
  );
};

export default ScoreFeed;
