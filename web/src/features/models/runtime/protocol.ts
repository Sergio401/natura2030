export type ModelField = 'speed' | 'vorticity';
export type VegetationDensity = 'Low' | 'High';

export interface ModelParameters {
  inflowVelocity: number;
  channelWidth: number;
  density: VegetationDensity;
}

export interface ModelMetrics {
  meanSpeed: number;
  peakSpeed: number;
}

export type WorkerRequest =
  | { type: 'initialize'; parameters: ModelParameters; field: ModelField }
  | { type: 'advance'; steps: number; field: ModelField }
  | { type: 'configure'; parameters: ModelParameters; field: ModelField }
  | { type: 'reset'; field: ModelField }
  | { type: 'field'; field: ModelField };

export type WorkerResponse =
  | { type: 'status'; stage: 'runtime' | 'numpy' | 'model' }
  | {
      type: 'frame';
      width: number;
      height: number;
      field: ModelField;
      data: Float32Array;
      obstacles: Uint8Array;
      timestep: number;
      metrics: ModelMetrics;
    }
  | { type: 'ready' }
  | { type: 'error'; message: string };
