/// <reference lib="webworker" />

import modelSource from '../models/two-sided-channel/model.py?raw';
import type { ModelField, ModelParameters, WorkerRequest, WorkerResponse } from './protocol';

const PYODIDE_VERSION = '314.0.6';
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface PythonProxy {
  toJs(options: { dict_converter: typeof Object.fromEntries; create_proxies: boolean }): unknown;
  destroy(): void;
}

interface BrowserPyodide {
  loadPackage(packageName: string): Promise<void>;
  runPython(code: string): PythonProxy;
  runPythonAsync(code: string): Promise<unknown>;
}

interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<BrowserPyodide>;
}

const worker = self as DedicatedWorkerGlobalScope;
let pyodide: BrowserPyodide | null = null;
let initialized = false;

function respond(message: WorkerResponse, transfer: Transferable[] = []) {
  worker.postMessage(message, transfer);
}

function pythonString(value: string) {
  return JSON.stringify(value);
}

function callFrame(steps: number, field: ModelField) {
  if (!pyodide || !initialized) throw new Error('The model runtime is not ready.');

  const proxy = pyodide.runPython(`simulation_frame(${steps}, ${pythonString(field)})`);
  const payload = proxy.toJs({ dict_converter: Object.fromEntries, create_proxies: false }) as {
    width: number;
    height: number;
    field: ModelField;
    data: Float32Array;
    obstacles: Uint8Array;
    timestep: number;
    meanSpeed: number;
    peakSpeed: number;
  };
  proxy.destroy();

  respond(
    {
      type: 'frame',
      width: payload.width,
      height: payload.height,
      field: payload.field,
      data: payload.data,
      obstacles: payload.obstacles,
      timestep: payload.timestep,
      metrics: {
        meanSpeed: payload.meanSpeed,
        peakSpeed: payload.peakSpeed,
      },
    },
    [payload.data.buffer, payload.obstacles.buffer],
  );
}

function configure(parameters: ModelParameters) {
  if (!pyodide || !initialized) throw new Error('The model runtime is not ready.');
  pyodide.runPython(
    `configure_simulation(${parameters.inflowVelocity}, ${parameters.channelWidth}, ${pythonString(parameters.density)})`,
  );
}

async function initialize(parameters: ModelParameters, field: ModelField) {
  respond({ type: 'status', stage: 'runtime' });
  const module = await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`) as PyodideModule;
  pyodide = await module.loadPyodide({ indexURL: PYODIDE_INDEX_URL });

  respond({ type: 'status', stage: 'numpy' });
  await pyodide.loadPackage('numpy');

  respond({ type: 'status', stage: 'model' });
  await pyodide.runPythonAsync(modelSource);
  pyodide.runPython(
    `initialize_simulation(${parameters.inflowVelocity}, ${parameters.channelWidth}, ${pythonString(parameters.density)})`,
  );
  initialized = true;
  respond({ type: 'ready' });
  callFrame(0, field);
}

worker.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  try {
    const message = event.data;
    switch (message.type) {
      case 'initialize':
        await initialize(message.parameters, message.field);
        break;
      case 'advance':
        callFrame(message.steps, message.field);
        break;
      case 'configure':
        configure(message.parameters);
        callFrame(0, message.field);
        break;
      case 'reset':
        pyodide?.runPython('reset_simulation()');
        callFrame(0, message.field);
        break;
      case 'field':
        callFrame(0, message.field);
        break;
    }
  } catch (error) {
    respond({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export {};
