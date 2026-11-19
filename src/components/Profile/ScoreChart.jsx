import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import GameLogo from '../Brand/GameLogo';
import { SCORE_POSTED, fetchArchive } from '../../helpers/scoreHelpers';
import { fetchMyGames } from '../../helpers/profileHelpers';
import { buildScoreLines } from '../../helpers/scoreChart';

const SERIES = {
  'map-tap': { stroke: 'stroke-primary', fill: 'fill-primary', dash: undefined },
  krillion: { stroke: 'stroke-secondary', fill: 'fill-secondary', dash: undefined },
  'size-it-up': { stroke: 'stroke-muted', fill: 'fill-muted', dash: undefined },
  wordle: { stroke: 'stroke-primary', fill: 'fill-primary', dash: '7 4' },
  redactle: { stroke: 'stroke-secondary', fill: 'fill-secondary', dash: '7 4' },
  'time-guesser': { stroke: 'stroke-muted', fill: 'fill-muted', dash: '2 3' },
  fermi: { stroke: 'stroke-secondary', fill: 'fill-secondary', dash: '2 3' },
};

const styleOf = (slug) => SERIES[slug] || SERIES.krillion;

const WIDTH = 640;
const HEIGHT = 280;
const PAD_X = 28;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

const ScoreChart = () => {
  const [chart, setChart] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const [active, setActive] = useState(null);
  const [tip, setTip] = useState(null);
  const nameRef = useRef(null);
  const detailRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([fetchArchive(), fetchMyGames().catch(() => ({ games: [] }))])
        .then(([archive, games]) => {
          if (cancelled) return;
          const enabled = new Set((games.games || []).filter((game) => game.enabled).map((game) => game.slug));
          const scores = (archive.scores || []).filter((row) => !enabled.size || enabled.has(row.game?.slug));
          setChart(buildScoreLines(scores));
        })
        .catch(() => {
          if (!cancelled) setChart({ series: [], start: '', end: '' });
        });
    };
    load();
    window.addEventListener(SCORE_POSTED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SCORE_POSTED, load);
    };
  }, []);

  useLayoutEffect(() => {
    if (!active || !nameRef.current || !detailRef.current || !chart) {
      setTip((current) => (current ? null : current));
      return;
    }
    if (typeof nameRef.current.getBBox !== 'function' || typeof detailRef.current.getBBox !== 'function') return;
    const nameBox = nameRef.current.getBBox();
    const detailBox = detailRef.current.getBBox();
    const width = Math.ceil(Math.max(nameBox.width, detailBox.width) + 16);
    const height = Math.ceil(nameBox.height + detailBox.height + 18);
    const spotX = PAD_X + active.x * (WIDTH - PAD_X * 2);
    const spotY = PAD_TOP + (1 - active.y) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
    const x = Math.max(4, Math.min(spotX + 12, WIDTH - width - 4));
    const y = spotY - height - 8 < 4 ? spotY + 12 : spotY - height - 8;
    const next = {
      x,
      y,
      width,
      height,
      nameY: 8 + nameBox.height,
      detailY: 12 + nameBox.height + detailBox.height,
    };
    setTip((current) => (
      current
      && current.x === next.x
      && current.y === next.y
      && current.width === next.width
      && current.height === next.height
        ? current
        : next
    ));
  }, [active, chart]);

  if (!chart?.series.length) return null;
  const visible = chart.series.filter((series) => !hidden.has(series.slug));

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const pointAt = (point) => ({
    cx: PAD_X + point.x * plotWidth,
    cy: PAD_TOP + (1 - point.y) * plotHeight,
  });

  return (
    <section aria-label="Scores over time" className="mt-space-lg">
      <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">Scores</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-space-md w-full border border-border bg-inset" role="img">
        <line x1={PAD_X} y1={PAD_TOP + plotHeight} x2={WIDTH - PAD_X} y2={PAD_TOP + plotHeight} className="stroke-border" />
        {visible.map((series) => {
          const look = styleOf(series.slug);
          const line = series.points.map((point) => {
            const { cx, cy } = pointAt(point);
            return `${cx},${cy}`;
          }).join(' ');
          return (
            <g key={series.slug}>
              {series.points.length > 1 ? (
                <polyline
                  points={line}
                  fill="none"
                  strokeWidth="2"
                  strokeDasharray={look.dash}
                  className={look.stroke}
                />
              ) : null}
              {series.points.map((point) => {
                const { cx, cy } = pointAt(point);
                return (
                  <circle
                    key={point.scoreId}
                    cx={cx}
                    cy={cy}
                    r="6"
                    tabIndex="0"
                    className={`${look.fill} stroke-background`}
                    strokeWidth="2"
                    aria-label={`${point.name} ${point.on} ${point.label}`}
                    onMouseEnter={() => setActive(point)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(point)}
                    onBlur={() => setActive(null)}
                  />
                );
              })}
            </g>
          );
        })}
        <text x={PAD_X} y={HEIGHT - 8} className="fill-muted font-mono text-caption">{chart.start}</text>
        <text x={WIDTH - PAD_X} y={HEIGHT - 8} textAnchor="end" className="fill-muted font-mono text-caption">{chart.end}</text>
        {active ? (
          <g role="tooltip" pointerEvents="none" transform={tip ? `translate(${tip.x} ${tip.y})` : undefined}>
            {tip ? <rect width={tip.width} height={tip.height} className="fill-background stroke-primary" /> : null}
            <text ref={nameRef} x="8" y={tip ? tip.nameY : 0} className="fill-primary font-sans text-caption">{active.name}</text>
            <text ref={detailRef} x="8" y={tip ? tip.detailY : 0} className="fill-muted font-mono text-caption">{`${active.on} · ${active.label} · #${active.puzzle}`}</text>
          </g>
        ) : null}
      </svg>
      <ul className="mt-space-sm flex gap-space-md overflow-x-auto">
        {chart.series.map((series) => {
          const shown = !hidden.has(series.slug);
          return (
            <li key={series.slug} className="shrink-0">
              <button
                type="button"
                aria-pressed={shown}
                onClick={() => {
                  setHidden((current) => {
                    const next = new Set(current);
                    if (next.has(series.slug)) next.delete(series.slug);
                    else next.add(series.slug);
                    return next;
                  });
                  setActive((point) => (point?.name === series.name ? null : point));
                }}
                className={`chart-pill inline-flex items-center gap-space-xs whitespace-nowrap border px-space-sm py-space-xs font-sans text-caption ${
                  shown ? 'border-primary bg-inset text-primary' : 'border-border bg-background text-muted'
                }`}
              >
                <GameLogo slug={series.slug} className="h-4 w-4" />
                {series.name}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ScoreChart;
