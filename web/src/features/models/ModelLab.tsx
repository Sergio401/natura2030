import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ModelsCopy } from '../../data/models-copy';
import type {
  ModelField,
  ModelMetrics,
  ModelParameters,
  VegetationDensity,
  WorkerRequest,
  WorkerResponse,
} from './runtime/protocol';

interface Props {
  copy: ModelsCopy['model'];
}

const DEFAULT_PARAMETERS: ModelParameters = {
  inflowVelocity: 0.06,
  channelWidth: 28,
  density: 'Low',
};

const PRESETS: Array<{ id: 'open' | 'balanced' | 'dense'; parameters: ModelParameters }> = [
  { id: 'open', parameters: { inflowVelocity: 0.045, channelWidth: 44, density: 'Low' } },
  { id: 'balanced', parameters: DEFAULT_PARAMETERS },
  { id: 'dense', parameters: { inflowVelocity: 0.075, channelWidth: 18, density: 'High' } },
];

function mixColor(start: [number, number, number], end: [number, number, number], amount: number) {
  const t = Math.max(0, Math.min(1, amount));
  return [
    Math.round(start[0] + (end[0] - start[0]) * t),
    Math.round(start[1] + (end[1] - start[1]) * t),
    Math.round(start[2] + (end[2] - start[2]) * t),
  ] as const;
}

function fieldColor(value: number, field: ModelField) {
  if (field === 'speed') {
    const normalized = Math.max(0, Math.min(1, value / 0.18));
    if (normalized < 0.58) return mixColor([8, 22, 39], [53, 195, 187], normalized / 0.58);
    return mixColor([53, 195, 187], [255, 238, 159], (normalized - 0.58) / 0.42);
  }

  const normalized = Math.max(-1, Math.min(1, value / 0.035));
  return normalized < 0
    ? mixColor([255, 155, 106], [236, 242, 238], normalized + 1)
    : mixColor([236, 242, 238], [27, 156, 148], normalized);
}

function drawFrame(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  data: Float32Array,
  obstacles: Uint8Array,
  field: ModelField,
) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;

  const image = context.createImageData(width, height);
  for (let sourceY = 0; sourceY < height; sourceY += 1) {
    const displayY = height - sourceY - 1;
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = sourceY * width + x;
      const displayIndex = (displayY * width + x) * 4;
      const color = obstacles[sourceIndex]
        ? ([224, 231, 229] as const)
        : fieldColor(data[sourceIndex], field);
      image.data[displayIndex] = color[0];
      image.data[displayIndex + 1] = color[1];
      image.data[displayIndex + 2] = color[2];
      image.data[displayIndex + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function request(worker: Worker | null, message: WorkerRequest) {
  worker?.postMessage(message);
}

export default function ModelLab({ copy }: Props) {
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const busyRef = useRef(true);
  const fieldRef = useRef<ModelField>('speed');
  const parametersRef = useRef<ModelParameters>(DEFAULT_PARAMETERS);
  const [runtimeAttempt, setRuntimeAttempt] = useState(0);
  const [parameters, setParameters] = useState<ModelParameters>(DEFAULT_PARAMETERS);
  const [field, setField] = useState<ModelField>('speed');
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<'runtime' | 'numpy' | 'model'>('runtime');
  const [error, setError] = useState<string | null>(null);
  const [timestep, setTimestep] = useState(0);
  const [metrics, setMetrics] = useState<ModelMetrics>({ meanSpeed: 0.06, peakSpeed: 0.06 });

  useEffect(() => {
    const worker = new Worker(new URL('./runtime/lbm.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    busyRef.current = true;
    setReady(false);
    setRunning(false);
    setError(null);
    setStage('runtime');

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === 'status') {
        setStage(message.stage);
        return;
      }
      if (message.type === 'ready') {
        setReady(true);
        setRunning(true);
        return;
      }
      if (message.type === 'error') {
        busyRef.current = false;
        setRunning(false);
        setError(message.message);
        return;
      }
      if (message.type === 'frame') {
        busyRef.current = false;
        setTimestep(message.timestep);
        setMetrics(message.metrics);
        if (canvasRef.current) {
          drawFrame(
            canvasRef.current,
            message.width,
            message.height,
            message.data,
            message.obstacles,
            message.field,
          );
        }
      }
    });

    request(worker, {
      type: 'initialize',
      parameters: parametersRef.current,
      field: fieldRef.current,
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [runtimeAttempt]);

  useEffect(() => {
    if (!ready || !running) return;
    const timer = window.setInterval(() => {
      if (busyRef.current) return;
      busyRef.current = true;
      request(workerRef.current, { type: 'advance', steps: 4, field: fieldRef.current });
    }, 80);
    return () => window.clearInterval(timer);
  }, [ready, running]);

  const configure = useCallback((next: ModelParameters) => {
    parametersRef.current = next;
    setParameters(next);
    if (!ready) return;
    busyRef.current = true;
    request(workerRef.current, { type: 'configure', parameters: next, field: fieldRef.current });
  }, [ready]);

  const changeField = (next: ModelField) => {
    fieldRef.current = next;
    setField(next);
    if (!ready) return;
    busyRef.current = true;
    request(workerRef.current, { type: 'field', field: next });
  };

  const changeDensity = (density: VegetationDensity) => configure({ ...parametersRef.current, density });

  const reset = () => {
    if (!ready) return;
    busyRef.current = true;
    request(workerRef.current, { type: 'reset', field: fieldRef.current });
  };

  const loadingLabel = stage === 'runtime'
    ? copy.loadingRuntime
    : stage === 'numpy'
      ? copy.loadingNumpy
      : copy.loadingModel;

  const rangeStyle = (value: number, min: number, max: number) => ({
    '--range-progress': `${((value - min) / (max - min)) * 100}%`,
  }) as CSSProperties;

  return (
    <div className="model-lab" data-ready={ready ? 'true' : 'false'}>
      <section className="model-viewport" aria-label={copy.subtitle}>
        <div className="model-viewport-topline">
          <span className="model-live-status">
            <i aria-hidden="true" />
            {ready ? copy.ready : loadingLabel}
          </span>
          <span>{field === 'speed' ? copy.speed : copy.vorticity} · {copy.latticeUnits}</span>
        </div>

        <div className="model-canvas-frame">
          <div className="model-axis model-axis-y">{copy.crossChannel}</div>
          <canvas ref={canvasRef} aria-label={`${copy.title}: ${field === 'speed' ? copy.speed : copy.vorticity}`} />
          <div className="model-flow-direction" aria-hidden="true">
            <span>FLOW</span><i /><i /><i />
          </div>
          {!ready && !error && (
            <div className="model-loading" role="status">
              <div className="model-loading-mark"><span /><span /><span /></div>
              <strong>{loadingLabel}</strong>
            </div>
          )}
          {error && (
            <div className="model-loading model-loading-error" role="alert">
              <strong>{copy.error}</strong>
              <small>{error}</small>
              <button type="button" onClick={() => setRuntimeAttempt((attempt) => attempt + 1)}>{copy.retry}</button>
            </div>
          )}
        </div>

        <div className="model-axis-x">{copy.streamwise}<span aria-hidden="true">→</span></div>

        <div className={`model-color-scale field-${field}`} aria-label={copy.displayedField}>
          <span>{field === 'speed' ? '0.00' : '−0.035'}</span>
          <i />
          <span>{field === 'speed' ? '0.18' : '+0.035'}</span>
        </div>

        <div className="model-metrics" aria-live="polite">
          <div><span>{copy.simulationStep}</span><strong>{String(timestep).padStart(5, '0')}</strong></div>
          <div><span>{copy.meanSpeed}</span><strong>{metrics.meanSpeed.toFixed(4)}</strong></div>
          <div><span>{copy.peakSpeed}</span><strong>{metrics.peakSpeed.toFixed(4)}</strong></div>
        </div>
      </section>

      <aside className="model-controls">
        <div className="model-controls-heading">
          <span>CTRL · 01</span>
          <h2>{copy.controls}</h2>
        </div>

        <div className="model-control-group">
          <label htmlFor="inflow-velocity">
            <span>{copy.inflowVelocity}</span>
            <output>{parameters.inflowVelocity.toFixed(3)}</output>
          </label>
          <input
            id="inflow-velocity"
            type="range"
            min="0.02"
            max="0.10"
            step="0.005"
            value={parameters.inflowVelocity}
            style={rangeStyle(parameters.inflowVelocity, 0.02, 0.1)}
            onChange={(event) => setParameters({ ...parameters, inflowVelocity: Number(event.target.value) })}
            onPointerUp={() => configure(parameters)}
            onKeyUp={() => configure(parameters)}
            disabled={!ready}
          />
          <div className="model-range-labels"><span>0.02</span><span>0.10</span></div>
        </div>

        <div className="model-control-group">
          <label htmlFor="channel-width">
            <span>{copy.centerWidth}</span>
            <output>{parameters.channelWidth}</output>
          </label>
          <input
            id="channel-width"
            type="range"
            min="12"
            max="48"
            step="2"
            value={parameters.channelWidth}
            style={rangeStyle(parameters.channelWidth, 12, 48)}
            onChange={(event) => setParameters({ ...parameters, channelWidth: Number(event.target.value) })}
            onPointerUp={() => configure(parameters)}
            onKeyUp={() => configure(parameters)}
            disabled={!ready}
          />
          <div className="model-range-labels"><span>12</span><span>48</span></div>
        </div>

        <div className="model-control-group model-choice-control" role="group" aria-labelledby="vegetation-density-title">
          <h3 className="model-control-title" id="vegetation-density-title">{copy.cylinderDensity}</h3>
          <div className="model-segmented">
            <button type="button" className={parameters.density === 'Low' ? 'is-active' : ''} onClick={() => changeDensity('Low')} disabled={!ready}>{copy.low}</button>
            <button type="button" className={parameters.density === 'High' ? 'is-active' : ''} onClick={() => changeDensity('High')} disabled={!ready}>{copy.high}</button>
          </div>
        </div>

        <div className="model-control-group model-choice-control" role="group" aria-labelledby="displayed-field-title">
          <h3 className="model-control-title" id="displayed-field-title">{copy.displayedField}</h3>
          <div className="model-segmented">
            <button type="button" className={field === 'speed' ? 'is-active' : ''} onClick={() => changeField('speed')} disabled={!ready}>{copy.speed}</button>
            <button type="button" className={field === 'vorticity' ? 'is-active' : ''} onClick={() => changeField('vorticity')} disabled={!ready}>{copy.vorticity}</button>
          </div>
        </div>

        <div className="model-control-group model-presets">
          <h3 className="model-control-title">{copy.presets}</h3>
          <div>
            {PRESETS.map((preset) => (
              <button key={preset.id} type="button" onClick={() => configure(preset.parameters)} disabled={!ready}>
                {preset.id === 'open' ? copy.presetOpen : preset.id === 'balanced' ? copy.presetBalanced : copy.presetDense}
              </button>
            ))}
          </div>
        </div>

        <div className="model-actions">
          <button type="button" className="model-primary-action" onClick={() => setRunning((current) => !current)} disabled={!ready}>
            <span aria-hidden="true">{running ? 'Ⅱ' : '▶'}</span>{running ? copy.pause : copy.run}
          </button>
          <button type="button" className="model-secondary-action" onClick={reset} disabled={!ready}>
            <span aria-hidden="true">↺</span>{copy.reset}
          </button>
        </div>
      </aside>
    </div>
  );
}
