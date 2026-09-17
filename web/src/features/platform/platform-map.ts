import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { platformLocations, type PlatformLocation } from '../../data/platform-locations';
import { platformCopy } from '../../data/platform-copy';
import { ICONS } from './icons';

const DATA_INPUT_ICONS = [ICONS.satellite, ICONS.waves, ICONS.sprout];
const OUTPUT_ICONS = [ICONS.map, ICONS.barChart, ICONS.trendingUp];

const CATEGORY_COLORS = {
  'coastal-adaptation': '#35c3bb',
  'ecosystem-restoration': '#82d49a',
  infrastructure: '#ffee9f',
  'risk-management': '#ff9b6a',
} as const;

const STREET_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: 'street-background', type: 'background', paint: { 'background-color': '#dce5e5' } },
    { id: 'osm-streets', type: 'raster', source: 'osm-tiles' },
  ],
};

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution:
        'Powered by <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> — Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    { id: 'satellite-background', type: 'background', paint: { 'background-color': '#071321' } },
    { id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite' },
    {
      id: 'satellite-shade',
      type: 'background',
      paint: { 'background-color': 'rgba(5, 18, 31, 0.13)' },
    },
  ],
};

const MAP_STYLES = {
  satellite: SATELLITE_STYLE,
  streets: STREET_STYLE,
};

type MapStyleId = keyof typeof MAP_STYLES;

function fillList(element: HTMLElement | null, values: string[]): void {
  if (!element) return;
  element.replaceChildren(
    ...values.map((value) => {
      const item = document.createElement('li');
      item.textContent = value;
      return item;
    }),
  );
}

/** Same as `fillList`, but prefixes each row with an icon (cycling through `icons`). */
function fillIconList(element: HTMLElement | null, values: string[], icons: readonly string[]): void {
  if (!element) return;
  element.replaceChildren(
    ...values.map((value, index) => {
      const item = document.createElement('li');
      const icon = document.createElement('span');
      icon.className = 'platform-icon';
      icon.innerHTML = icons[index % icons.length] ?? '';
      const text = document.createElement('span');
      text.textContent = value;
      item.append(icon, text);
      return item;
    }),
  );
}

export function initPlatformMap(root: HTMLElement): void {
  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const copy = platformCopy[locale];
  const mapElement = root.querySelector<HTMLElement>('[data-platform-map]');
  const panel = root.querySelector<HTMLElement>('[data-location-panel]');
  const mapError = root.querySelector<HTMLElement>('[data-map-error]');
  if (!mapElement || !panel) return;

  const languageLink = root.querySelector<HTMLAnchorElement>('.platform-language');
  const initialLocationId = new URL(window.location.href).searchParams.get('location');
  if (languageLink && platformLocations.some((location) => location.id === initialLocationId)) {
    const languageUrl = new URL(languageLink.href);
    languageUrl.searchParams.set('location', initialLocationId ?? '');
    languageLink.href = languageUrl.toString();
  }

  let selectedLocationId: string | null = null;
  let selectedLocation: PlatformLocation | null = null;

  let map: maplibregl.Map;
  try {
    map = new maplibregl.Map({
      container: mapElement,
      style: SATELLITE_STYLE,
      center: [-70, -8],
      zoom: 2.6,
      minZoom: 2,
      maxZoom: 17,
      attributionControl: false,
      fadeDuration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
    });
  } catch {
    if (mapError) mapError.hidden = false;
    return;
  }

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  const regionalBounds = new maplibregl.LngLatBounds();
  for (const location of platformLocations) regionalBounds.extend(location.coordinates);

  const fitRegionalView = (animated = true): void => {
    map.fitBounds(regionalBounds, {
      padding: { top: 90, right: 95, bottom: 110, left: 95 },
      maxZoom: 4.15,
      duration: animated && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 850 : 0,
    });
  };

  const updateUrl = (locationId: string | null): void => {
    const url = new URL(window.location.href);
    if (locationId) url.searchParams.set('location', locationId);
    else url.searchParams.delete('location');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const updateSelectedMarker = (): void => {
    root.querySelectorAll<HTMLElement>('[data-marker-location]').forEach((marker) => {
      marker.classList.toggle('is-selected', marker.dataset.markerLocation === selectedLocationId);
    });
  };

  // Reserve screen space for the panel via `padding` (not `offset`). `padding` keeps
  // `map.getCenter()` at the location's real coordinates and adjusts what maplibre treats
  // as the visible viewport — so zoom controls, scroll-wheel zoom, etc. all scale around the
  // pin the user actually sees. `offset` instead moves the *true* center to a point hidden
  // behind the panel, so any later zoom (which pivots on that true center) makes markers
  // visibly swim across the screen. This was the cause of "los puntos se mueven al hacer zoom".
  const focusMapOnLocation = (location: PlatformLocation): void => {
    const isDesktop = window.innerWidth >= 760;
    const panelRect = panel.getBoundingClientRect();
    const padding = isDesktop
      ? { top: 70, right: 60, bottom: 70, left: panelRect.width + 40 }
      : { top: 60, right: 40, bottom: panelRect.height + 30, left: 40 };
    map.easeTo({
      center: location.coordinates,
      zoom: Math.max(map.getZoom(), 5.2),
      padding,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
    });
  };

  const showLocation = (location: PlatformLocation, updateHistory = true): void => {
    const details = location.content[locale];
    selectedLocationId = location.id;
    selectedLocation = location;
    root.classList.add('is-panel-open');
    panel.setAttribute('aria-hidden', 'false');
    panel.inert = false;

    const setText = (selector: string, value: string): void => {
      const element = panel.querySelector<HTMLElement>(selector);
      if (element) element.textContent = value;
    };

    setText('[data-location-region]', details.region);
    setText('[data-location-title]', details.title);
    setText('[data-location-summary]', details.summary);
    setText('[data-location-status]', details.status);
    setText(
      '[data-location-coordinates]',
      `${location.coordinates[1].toFixed(4)}°, ${location.coordinates[0].toFixed(4)}°`,
    );

    const categoryBadge = panel.querySelector<HTMLElement>('[data-location-category-badge]');
    if (categoryBadge) {
      categoryBadge.textContent = copy.categories[location.category];
      categoryBadge.style.setProperty('--badge-color', CATEGORY_COLORS[location.category]);
    }

    const challengeBlock = panel.querySelector<HTMLElement>('[data-location-challenge-block]');
    if (challengeBlock) {
      const hasChallenge = Boolean(details.challenge && details.response);
      challengeBlock.hidden = !hasChallenge;
      if (hasChallenge) {
        setText('[data-location-challenge]', details.challenge ?? '');
        setText('[data-location-response]', details.response ?? '');
      }
    }

    fillList(panel.querySelector<HTMLElement>('[data-location-applications]'), details.applications);
    fillIconList(panel.querySelector<HTMLElement>('[data-location-inputs]'), details.dataInputs, DATA_INPUT_ICONS);
    fillIconList(panel.querySelector<HTMLElement>('[data-location-outputs]'), details.outputs, OUTPUT_ICONS);

    const collaborateCta = panel.querySelector<HTMLAnchorElement>('[data-location-cta]');
    if (collaborateCta) {
      const subject = locale === 'es' ? `Colaboración — ${details.title}` : `Collaboration — ${details.title}`;
      collaborateCta.href = `mailto:info@adaptationla.org?subject=${encodeURIComponent(subject)}`;
    }

    updateSelectedMarker();
    focusMapOnLocation(location);
    if (updateHistory) updateUrl(location.id);

    window.setTimeout(() => {
      panel.querySelector<HTMLElement>('[data-location-title]')?.focus({ preventScroll: true });
    }, 180);
  };

  const closePanel = (): void => {
    selectedLocationId = null;
    selectedLocation = null;
    root.classList.remove('is-panel-open');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    updateSelectedMarker();
    updateUrl(null);
    map.easeTo({
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400,
    });
  };

  const renderMarkers = (): void => {
    for (const location of platformLocations) {
      const markerButton = document.createElement('button');
      markerButton.type = 'button';
      markerButton.className = 'platform-marker';
      const details = location.content[locale];
      markerButton.dataset.markerLocation = location.id;
      markerButton.style.setProperty('--marker-color', CATEGORY_COLORS[location.category]);
      markerButton.setAttribute('aria-label', details.title);
      markerButton.title = details.title;
      markerButton.addEventListener('click', () => showLocation(location));

      new maplibregl.Marker({ element: markerButton, anchor: 'center' })
        .setLngLat(location.coordinates)
        .addTo(map);
    }

    updateSelectedMarker();
  };

  map.on('load', () => {
    if (mapError) mapError.hidden = true;
    fitRegionalView(false);
    renderMarkers();

    const requestedId = new URL(window.location.href).searchParams.get('location');
    const requestedLocation = platformLocations.find((location) => location.id === requestedId);
    if (requestedLocation) showLocation(requestedLocation, false);
  });

  root.querySelectorAll<HTMLElement>('[data-panel-close]').forEach((button) => {
    button.addEventListener('click', closePanel);
  });

  panel.querySelector<HTMLButtonElement>('[data-location-view-map]')?.addEventListener('click', () => {
    if (selectedLocation) focusMapOnLocation(selectedLocation);
  });

  root.querySelectorAll<HTMLButtonElement>('[data-map-style]').forEach((button) => {
    button.addEventListener('click', () => {
      const styleId = button.dataset.mapStyle as MapStyleId;
      if (!(styleId in MAP_STYLES)) return;
      map.setStyle(MAP_STYLES[styleId]);
      root.querySelectorAll<HTMLButtonElement>('[data-map-style]').forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
      });
    });
  });

  root.querySelector<HTMLButtonElement>('[data-map-home]')?.addEventListener('click', () => {
    closePanel();
    fitRegionalView();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-location-shortcut]').forEach((button) => {
    button.addEventListener('click', () => {
      const location = platformLocations.find((item) => item.id === button.dataset.locationShortcut);
      if (location) showLocation(location);
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selectedLocationId) closePanel();
  });
}
