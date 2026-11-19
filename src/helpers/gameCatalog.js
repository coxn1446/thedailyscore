import mapTapLogo from '../assets/gamelogos/maptap.png';
import krillionLogo from '../assets/gamelogos/krillion.png';
import sizeItUpLogo from '../assets/gamelogos/sizeitup.png';
import wordleLogo from '../assets/gamelogos/wordle-logo.png';
import redactleLogo from '../assets/gamelogos/redactle.png';
import timeGuesserLogo from '../assets/gamelogos/timeguesser.png';
import semantleLogo from '../assets/gamelogos/semantle.png';
import farflungLogo from '../assets/gamelogos/farflung.png';
import eralyLogo from '../assets/gamelogos/eraly.png';
import fermiLogo from '../assets/gamelogos/fermi.png';
import hivemindLogo from '../assets/gamelogos/hivemind.png';
import noillirkLogo from '../assets/gamelogos/noillirk.png';

export const GAME_LINKS = [
  { slug: 'map-tap', name: 'Map Tap', mark: '🌐', href: 'https://maptap.gg', logo: mapTapLogo },
  { slug: 'krillion', name: 'Krillion', mark: '🦐', href: 'https://krillion.io', logo: krillionLogo },
  { slug: 'size-it-up', name: 'Size it Up', mark: '📈', href: 'https://magnitudle.com/size-it-up', logo: sizeItUpLogo },
  { slug: 'wordle', name: 'Wordle', mark: '🟩', href: 'https://www.nytimes.com/games/wordle/index.html', logo: wordleLogo },
  { slug: 'redactle', name: 'Redactle', mark: '⬛', href: 'https://redactle.net', logo: redactleLogo },
  { slug: 'time-guesser', name: 'Time Guesser', mark: '🕰️', href: 'https://timeguessr.com', logo: timeGuesserLogo },
  { slug: 'semantle', name: 'Semantle', mark: '🔤', href: 'https://semantle.com', logo: semantleLogo },
  { slug: 'farflung', name: 'Farflung', mark: '📍', href: 'https://farflung.game', logo: farflungLogo },
  { slug: 'eraly', name: 'Eraly', mark: '⏳', href: 'https://eraly.io', logo: eralyLogo },
  { slug: 'fermi', name: 'Fermi', mark: '🧮', href: 'https://fermi.gg', logo: fermiLogo },
  { slug: 'hivemind', name: 'Hivemind', mark: '🐝', href: 'https://playpindrop.app/hivemind', logo: hivemindLogo },
  { slug: 'noillirk', name: 'Noillirk', mark: '🎈', href: 'https://noillirkgame.com/', logo: noillirkLogo },
];

export const gameMark = (slug) => GAME_LINKS.find((game) => game.slug === slug)?.mark || '';

export const gameLogo = (slug) => GAME_LINKS.find((game) => game.slug === slug)?.logo || '';

export const gameHref = (slug) => GAME_LINKS.find((game) => game.slug === slug)?.href || '';
