import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ScoreCard } from '../components/Home/ScoreFeed';
import { selectUser } from '../store/auth.reducer';
import { fetchPost } from '../helpers/feedHelpers';

const Post = () => {
  const { scoreId } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [post, setPost] = useState(null);
  const [viewerScore, setViewerScore] = useState(null);
  const [dayAverage, setDayAverage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPost(null);
    setViewerScore(null);
    setDayAverage(null);
    setError('');
    fetchPost(scoreId)
      .then((data) => {
        if (!cancelled) {
          setPost(data.post || null);
          setViewerScore(data.viewer_score || null);
          setDayAverage(data.day_average || null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Score not found');
      });
    return () => {
      cancelled = true;
    };
  }, [scoreId]);

  const back = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="mx-auto w-full lg:max-w-measure">
      <button type="button" onClick={back} className="font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary">
        Back
      </button>
      {error ? <p role="alert" className="mt-space-lg font-sans text-body-md text-error">{error}</p> : null}
      {post ? (
        <div className="mt-space-md">
          <ScoreCard
            post={post}
            viewerId={user?.user_id}
            detail
            viewer={user}
            viewerScore={viewerScore}
            dayAverage={dayAverage}
            onChange={setPost}
          />
        </div>
      ) : null}
    </div>
  );
};

export default Post;
