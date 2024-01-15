import { Falcon } from './falcon';
import { FalconWorker } from './falcon_worker';
import * as FalconErrors from './falcon_errors';

import {
  FalconModel,
  FalconSegment,
  FalconSegments,
  FalconWorkerInitRequest,
  FalconWorkerProcessRequest,
  FalconWorkerReleaseRequest,
  FalconWorkerRequest,
  FalconWorkerInitResponse,
  FalconWorkerProcessResponse,
  FalconWorkerReleaseResponse,
  FalconWorkerFailureResponse,
  FalconWorkerResponse,
} from './types';

import falconWasm from '../lib/pv_falcon.wasm';
import falconWasmSimd from '../lib/pv_falcon_simd.wasm';

Falcon.setWasm(falconWasm);
Falcon.setWasmSimd(falconWasmSimd);
FalconWorker.setWasm(falconWasm);
FalconWorker.setWasmSimd(falconWasmSimd);

export {
  Falcon,
  FalconErrors,
  FalconModel,
  FalconSegment,
  FalconSegments,
  FalconWorker,
  FalconWorkerInitRequest,
  FalconWorkerProcessRequest,
  FalconWorkerReleaseRequest,
  FalconWorkerRequest,
  FalconWorkerInitResponse,
  FalconWorkerProcessResponse,
  FalconWorkerReleaseResponse,
  FalconWorkerFailureResponse,
  FalconWorkerResponse,
};
