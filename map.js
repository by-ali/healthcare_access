/*
 * Recovered from MapboxMap-CpPiad2e.js.
 * This is a framework-free adaptation of the original React component.
 */
(() => {
  'use strict';

  const MAPBOX_TOKEN = 'pk.eyJ1IjoiYnktYWxpIiwiYSI6ImNtcmw4am9kZzBkc20yenB2d3ZxbmFxbGEifQ.YDYxwOp9z_7OlOp14YGOKA';
  const MAPBOX_STYLE = 'mapbox://styles/by-ali/cmrk5jg2a00dl01s45ecbh4cy';

  const STORY_LAYERS = [
    'settlements_over60min',
    'vitebsk',
    'vitebsk_borders',
    '6c5a137fd7e58c06690a',
    'top_20_connections',
    'top_20_connections_underneath',
    'med_for_20_icons',
    'med_for_20',
    'top_20',
    'facilities',
    'region_borders',
    'districts_borders',
    'hexagons',
    'age',
    'salary',
    'pct_over_10km'
  ];

  const mapContainer = document.getElementById('map');
  const status = document.getElementById('map-status');

  function showStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('map-status--error', isError);
    status.hidden = false;
  }

  if (!mapContainer) return;

  if (!window.mapboxgl) {
    showStatus('Mapbox GL JS не загрузился. Проверьте интернет-соединение и доступ к api.mapbox.com.', true);
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  let map;
  try {
    map = new mapboxgl.Map({
      container: mapContainer,
      style: MAPBOX_STYLE,
      center: [28, 53.7],
      zoom: 5,
      interactive: false,
      projection: 'mercator',
      attributionControl: true
    });
  } catch (error) {
    showStatus(`Не удалось создать карту: ${error.message}`, true);
    return;
  }

  map.on('error', (event) => {
    const message = event?.error?.message || 'Неизвестная ошибка Mapbox';
    console.error('Mapbox error:', event?.error || event);
    showStatus(
      `Карта Mapbox не загрузилась. Проверьте публичный токен, доступность стиля и разрешённые URL токена. ${message}`,
      true
    );
  });

  map.on('load', () => {
    if (status) status.hidden = true;

    let regionsOnlyTimeout;
    let regionsOnlyInterval;
    let hexagonsTimeout;
    let hexagonsInterval;
    let ageTimeout;
    let ageInterval;
    let top20Timeout;
    let top20Interval;
    let connectionsTimeout;
    let chartIntroTimeout;

    const ageOpacity = map.getPaintProperty('age', 'fill-opacity') ?? 1;
    const top20Opacity = map.getPaintProperty('top_20', 'circle-opacity') ?? 1;

    function findFirstGetProperty(expression) {
      if (!Array.isArray(expression)) return undefined;
      if (expression[0] === 'get' && typeof expression[1] === 'string') {
        return expression[1];
      }
      for (const item of expression) {
        const property = findFirstGetProperty(item);
        if (property) return property;
      }
      return undefined;
    }

    const ageProperty = findFirstGetProperty(
      map.getPaintProperty('age', 'fill-color')
    );

    function queryLayerSourceFeatures(layerId) {
      const layer = map.getStyle().layers?.find((candidate) => candidate.id === layerId);
      const source = layer && 'source' in layer ? layer.source : undefined;
      const sourceLayer = layer && 'source-layer' in layer ? layer['source-layer'] : undefined;

      if (typeof source !== 'string') return [];
      return map.querySourceFeatures(
        source,
        sourceLayer ? { sourceLayer } : undefined
      );
    }

    function findNumericPropertyWithMostDistinctValues(features) {
      const properties = new Map();

      features.forEach((feature) => {
        Object.entries(feature.properties ?? {}).forEach(([key, value]) => {
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue)) return;
          if (!properties.has(key)) properties.set(key, new Set());
          properties.get(key)?.add(numericValue);
        });
      });

      return Array.from(properties.entries())
        .sort((left, right) => right[1].size - left[1].size)[0];
    }

    function clearAnimations() {
      if (regionsOnlyTimeout) clearTimeout(regionsOnlyTimeout);
      if (regionsOnlyInterval) clearInterval(regionsOnlyInterval);
      if (hexagonsTimeout) clearTimeout(hexagonsTimeout);
      if (hexagonsInterval) clearInterval(hexagonsInterval);
      if (ageTimeout) clearTimeout(ageTimeout);
      if (ageInterval) clearInterval(ageInterval);
      if (top20Timeout) clearTimeout(top20Timeout);
      if (top20Interval) clearInterval(top20Interval);
      if (connectionsTimeout) clearTimeout(connectionsTimeout);
      if (chartIntroTimeout) clearTimeout(chartIntroTimeout);

      regionsOnlyTimeout = undefined;
      regionsOnlyInterval = undefined;
      hexagonsTimeout = undefined;
      hexagonsInterval = undefined;
      ageTimeout = undefined;
      ageInterval = undefined;
      top20Timeout = undefined;
      top20Interval = undefined;
      connectionsTimeout = undefined;
      chartIntroTimeout = undefined;
    }

    function setState(state) {
      clearAnimations();

      let visibleLayers;
  if (state === 'over60min') {
    visibleLayers = ['settlements_over60min'];
  } else if (state === 'top20') {
    visibleLayers = ['hexagons', 'top_20'];
      } else if (state === 'regions' || state === 'vitebskZoom') {
        visibleLayers = [
          'hexagons',
          'top_20_connections',
          'top_20_connections_underneath',
          'med_for_20_icons',
          'med_for_20',
          'top_20',
          'vitebsk_borders',
          'region_borders',
        ];
      } else if (state === 'hexagons' || state === 'regionsOnly') {
        visibleLayers = ['hexagons'];
      } else if (state === 'age' || state === 'chartIntro') {
        visibleLayers = ['age'];
      } else {
        visibleLayers = [];
      }
const hexLegend = document.getElementById('hex-legend');

if (hexLegend) {
  const showHexLegend =
    Array.isArray(visibleLayers) &&
    visibleLayers.includes('hexagons');

  hexLegend.hidden = !showHexLegend;
}
      if (map.getLayer('hexagons')) {
        map.setPaintProperty('hexagons', 'fill-opacity-transition', {
          duration: 0,
          delay: 0
        });
        map.setPaintProperty(
          'hexagons',
          'fill-opacity',
          state === 'hexagons' ? 0 : 0.85
        );
      }

      STORY_LAYERS.forEach((layerId) => {
        if (!map.getLayer(layerId)) return;
        map.setLayoutProperty(
          layerId,
          'visibility',
          visibleLayers.includes(layerId) ? 'visible' : 'none'
        );
      });

      if (map.getLayer('age')) {
        map.setPaintProperty('age', 'fill-opacity-transition', {
          duration: 0,
          delay: 0
        });
        map.setPaintProperty('age', 'fill-opacity', ageOpacity);
      }

      if (map.getLayer('top_20')) {
        map.setPaintProperty('top_20', 'circle-opacity-transition', {
          duration: 0,
          delay: 0
        });
        map.setPaintProperty(
          'top_20',
          'circle-opacity',
          state === 'top20' ? 0 : top20Opacity
        );
      }

      map.fitBounds(
        state === 'vitebskZoom'
          ? [[26.9, 54.25], [31.5, 56.25]]
          : [[23.1, 51.2], [32.8, 56.2]],
        {
          padding: { top: 55, right: 35, bottom: 55, left: 35 },
          duration: state === 'base' ? 0 : 900
        }
      );

      if (state === 'regionsOnly' && map.getLayer('hexagons')) {
        regionsOnlyTimeout = setTimeout(() => {
          let threshold = 0;
          regionsOnlyInterval = setInterval(() => {
            threshold += 10;
            map.setPaintProperty('hexagons', 'fill-opacity', [
              'case',
              ['<=', ['to-number', ['get', 'uncovered_pct'], 0], threshold],
              0,
              0.85
            ]);

            if (threshold >= 100) {
              clearInterval(regionsOnlyInterval);
              regionsOnlyInterval = undefined;
              map.setLayoutProperty('hexagons', 'visibility', 'none');
            }
          }, 80);
        }, 500);
      }

      if (state === 'hexagons' && map.getLayer('hexagons')) {
        hexagonsTimeout = setTimeout(() => {
          let threshold = 0;
          hexagonsInterval = setInterval(() => {
            threshold += 3;
            map.setPaintProperty('hexagons', 'fill-opacity', [
              'case',
              ['<=', ['to-number', ['get', 'uncovered_pct'], 0], threshold],
              0.85,
              0
            ]);

            if (threshold >= 100) {
              clearInterval(hexagonsInterval);
              hexagonsInterval = undefined;
              map.setPaintProperty('hexagons', 'fill-opacity', 0.85);
            }
          }, 35);
        }, 20);
      }

      if (state === 'top20' && map.getLayer('top_20')) {
        const showConnections = () => {
          ['med_for_20', 'med_for_20_icons'].forEach((layerId) => {
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, 'visibility', 'visible');
            }
          });

          connectionsTimeout = setTimeout(() => {
            ['top_20_connections_underneath', 'top_20_connections'].forEach((layerId) => {
              if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', 'visible');
              }
            });
          }, 180);
        };

        top20Timeout = setTimeout(() => {
          const propertyAndValues = findNumericPropertyWithMostDistinctValues(
            queryLayerSourceFeatures('top_20')
          );

          if (!propertyAndValues || propertyAndValues[1].size === 0) {
            map.setPaintProperty('top_20', 'circle-opacity-transition', {
              duration: 350,
              delay: 0
            });
            map.setPaintProperty('top_20', 'circle-opacity', top20Opacity);
            connectionsTimeout = setTimeout(showConnections, 380);
            return;
          }

          const [property, valueSet] = propertyAndValues;
          const values = Array.from(valueSet).sort((left, right) => left - right);
          let index = 0;

          top20Interval = setInterval(() => {
            const currentValue = values[index];
            map.setPaintProperty('top_20', 'circle-opacity', [
              'case',
              [
                '<=',
                ['to-number', ['get', property], values[0]],
                currentValue
              ],
              top20Opacity,
              0
            ]);

            index += 1;
            if (index >= values.length) {
              clearInterval(top20Interval);
              top20Interval = undefined;
              map.setPaintProperty('top_20', 'circle-opacity', top20Opacity);
              showConnections();
            }
          }, Math.max(20, 400 / values.length));
        }, 30);
      }

      if (state === 'age' && map.getLayer('age')) {
        map.setPaintProperty('age', 'fill-opacity', 0);

        ageTimeout = setTimeout(() => {
          const layer = map.getStyle().layers?.find((candidate) => candidate.id === 'age');
          const source = layer && 'source' in layer ? layer.source : undefined;
          const sourceLayer = layer && 'source-layer' in layer ? layer['source-layer'] : undefined;
          const features = typeof source === 'string'
            ? map.querySourceFeatures(source, sourceLayer ? { sourceLayer } : undefined)
            : [];

          const values = ageProperty
            ? Array.from(
                new Set(
                  features
                    .map((feature) => Number(feature.properties?.[ageProperty]))
                    .filter((value) => Number.isFinite(value))
                )
              ).sort((left, right) => left - right)
            : [];

          if (!ageProperty || values.length === 0) {
            map.setPaintProperty('age', 'fill-opacity-transition', {
              duration: 450,
              delay: 0
            });
            map.setPaintProperty('age', 'fill-opacity', ageOpacity);
            return;
          }

          let index = 0;
          const interval = Math.max(15, 480 / values.length);

          ageInterval = setInterval(() => {
            const currentValue = values[index];
            map.setPaintProperty('age', 'fill-opacity', [
              'case',
              [
                '<=',
                ['to-number', ['get', ageProperty], values[0]],
                currentValue
              ],
              ageOpacity,
              0
            ]);

            index += 1;
            if (index >= values.length) {
              clearInterval(ageInterval);
              ageInterval = undefined;
              map.setPaintProperty('age', 'fill-opacity', ageOpacity);
            }
          }, interval);
        }, 30);
      }

      if (state === 'chartIntro' && map.getLayer('age')) {
        map.setPaintProperty('age', 'fill-opacity-transition', {
          duration: 650,
          delay: 0
        });
        map.setPaintProperty('age', 'fill-opacity', 0);
        chartIntroTimeout = setTimeout(() => {
          map.setLayoutProperty('age', 'visibility', 'none');
        }, 680);
      }
    }

    setState('base');

    const steps = document.querySelectorAll('[data-map-state]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          document.querySelectorAll('.step-card.is-active').forEach((card) => {
            card.classList.remove('is-active');
          });
          entry.target.classList.add('is-active');
          setState(entry.target.dataset.mapState || 'base');
        });
      },
      { threshold: 0.01 }
    );

    steps.forEach((step) => observer.observe(step));

    map.once('remove', () => {
      observer.disconnect();
      clearAnimations();
    });
  });

  window.addEventListener('resize', () => map.resize());
})();
