import React from 'react';
import { gameLogo } from '../../helpers/gameCatalog';

const GameLogo = ({ slug, className = 'h-6 w-6' }) => {
  const src = gameLogo(slug);
  if (!src) return null;
  const tone = slug === 'semantle' ? 'semantle-logo' : '';
  return <img src={src} alt="" className={`object-contain ${tone} ${className}`} />;
};

export default GameLogo;
