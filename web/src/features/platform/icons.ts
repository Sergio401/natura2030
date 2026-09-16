// Inline SVG icon set for the platform location panel, sourced from Lucide
// (lucide-static, ISC license — https://lucide.dev). Imported with Vite's
// `?raw` suffix so each icon is bundled as a plain SVG string: no icon-font
// or extra runtime, safe to inject with `set:html` (Astro) or `innerHTML`
// (platform-map.ts) since the source is our own dependency, not user input.
import triangleAlert from 'lucide-static/icons/triangle-alert.svg?raw';
import leaf from 'lucide-static/icons/leaf.svg?raw';
import grid2x2 from 'lucide-static/icons/grid-2x2.svg?raw';
import satellite from 'lucide-static/icons/satellite.svg?raw';
import waves from 'lucide-static/icons/waves.svg?raw';
import sprout from 'lucide-static/icons/sprout.svg?raw';
import map from 'lucide-static/icons/map.svg?raw';
import barChart from 'lucide-static/icons/bar-chart-3.svg?raw';
import trendingUp from 'lucide-static/icons/trending-up.svg?raw';
import usersRound from 'lucide-static/icons/users-round.svg?raw';
import mapPin from 'lucide-static/icons/map-pin.svg?raw';
import compass from 'lucide-static/icons/compass.svg?raw';

export const ICONS = {
  triangleAlert,
  leaf,
  grid2x2,
  satellite,
  waves,
  sprout,
  map,
  barChart,
  trendingUp,
  usersRound,
  mapPin,
  compass,
} as const;

export type IconName = keyof typeof ICONS;
