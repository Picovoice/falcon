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

import falconWasmSimd from './lib/pv_falcon_simd.wasm';
import falconWasmSimdLib from './lib/pv_falcon_simd.txt';
import falconWasmPThread from './lib/pv_falcon_pthread.wasm';
import falconWasmPThreadLib from './lib/pv_falcon_pthread.txt';

Falcon.setWasmSimd(falconWasmSimd);
Falcon.setWasmSimdLib(falconWasmSimdLib);
Falcon.setWasmPThread(falconWasmPThread);
Falcon.setWasmPThreadLib(falconWasmPThreadLib);
FalconWorker.setWasmSimd(falconWasmSimd);
FalconWorker.setWasmSimdLib(falconWasmSimdLib);
FalconWorker.setWasmPThread(falconWasmPThread);
FalconWorker.setWasmPThreadLib(falconWasmPThreadLib);

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
