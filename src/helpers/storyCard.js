import { Capacitor } from '@capacitor/core';
import { gameLogo } from './gameCatalog';
import { shareToInstagramStory } from './instagramStories';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_FOOTER = 'thedailyscore.site';

export const STORY_STYLES = {
  paper: {
    label: 'Paper',
    background: '#FBF9F5',
    ink: '#111111',
    kicker: '#9E2A2B',
    muted: '#4A4A4A',
    rule: '#111111',
  },
  ink: {
    label: 'Ink',
    background: '#111111',
    ink: '#FBF9F5',
    kicker: '#C45C5C',
    muted: '#B0ACA4',
    rule: '#C45C5C',
  },
  carmine: {
    label: 'Carmine',
    background: '#9E2A2B',
    ink: '#FBF9F5',
    kicker: '#FBF9F5',
    muted: '#F4F0E8',
    rule: '#FBF9F5',
  },
};

export const storySpec = (recap, styleId = 'paper') => {
  const style = STORY_STYLES[styleId] ? styleId : 'paper';
  const games = Array.isArray(recap?.games) ? recap.games : [];
  return {
    style,
    title: 'The Daily Score',
    kicker: recap?.period === 'week' ? 'This week' : 'Today',
    edition: recap?.on || '',
    lines: games.map((game) => ({
      slug: game.slug,
      name: game.name,
      line: game.line,
      rank: game.rank,
      text: [game.name, game.line].filter(Boolean).join(' '),
    })),
    rankHeader: games.some((game) => game.rank != null) ? 'Rank' : '',
    footer: STORY_FOOTER,
    colors: STORY_STYLES[style],
  };
};

const loadImage = (src) => new Promise((resolve) => {
  if (!src || typeof Image === 'undefined') {
    resolve(null);
    return;
  }
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

export const drawStory = async (canvas, spec) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const { colors } = spec;
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  const pad = 96;
  ctx.fillStyle = colors.kicker;
  ctx.font = '700 28px Inter';
  ctx.fillText(spec.kicker.toUpperCase(), pad, 160);
  ctx.fillStyle = colors.ink;
  ctx.font = '700 84px Newsreader';
  ctx.fillText(spec.title, pad, 270);
  ctx.fillStyle = colors.muted;
  ctx.font = '500 32px "JetBrains Mono"';
  if (spec.edition) ctx.fillText(spec.edition, pad, 330);
  ctx.strokeStyle = colors.rule;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pad, 380);
  ctx.lineTo(STORY_WIDTH - pad, 380);
  ctx.stroke();
  const rankX = STORY_WIDTH - pad;
  if (spec.rankHeader) {
    ctx.fillStyle = colors.kicker;
    ctx.font = '700 28px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(spec.rankHeader, rankX, 440);
    ctx.textAlign = 'left';
  }
  let y = spec.rankHeader ? 520 : 480;
  for (const line of spec.lines) {
    const logo = await loadImage(gameLogo(line.slug));
    if (logo) {
      const lightMark = line.slug === 'semantle' && spec.style !== 'paper';
      if (lightMark) {
        ctx.save();
        ctx.filter = 'brightness(0) invert(1)';
      }
      ctx.drawImage(logo, pad, y - 48, 72, 72);
      if (lightMark) ctx.restore();
    }
    ctx.fillStyle = colors.ink;
    ctx.font = '600 40px Inter';
    ctx.fillText(line.name || '', pad + 96, y);
    ctx.font = '500 36px "JetBrains Mono"';
    ctx.fillText(line.line || '', pad + 96, y + 48);
    if (line.rank != null) {
      ctx.fillStyle = colors.kicker;
      ctx.font = '700 40px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(String(line.rank), rankX, y);
      ctx.textAlign = 'left';
    }
    y += 140;
  }
  ctx.fillStyle = colors.ink;
  ctx.font = '700 36px Inter';
  ctx.fillText(spec.footer, pad, STORY_HEIGHT - 120);
  return canvas;
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    const comma = result.indexOf(',');
    resolve(comma >= 0 ? result.slice(comma + 1) : result);
  };
  reader.onerror = () => reject(reader.error || new Error('Could not share'));
  reader.readAsDataURL(blob);
});

export const shareStory = async (canvas) => {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'failed';
  if (Capacitor.getPlatform() === 'ios') {
    try {
      await shareToInstagramStory(await blobToBase64(blob));
      return 'shared';
    } catch (err) {
      if (err?.code !== 'UNIMPLEMENTED') throw err;
    }
  }
  const file = new File([blob], 'the-daily-score.png', { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: 'The Daily Score' });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'the-daily-score.png';
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
};
