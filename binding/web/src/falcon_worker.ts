/*
  Copyright 2024-2025 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import PvWorker from 'web-worker:./falcon_worker_handler.ts';

import {
  FalconModel,
  FalconSegments,
  FalconWorkerInitResponse,
  FalconWorkerProcessResponse,
  FalconWorkerReleaseResponse,
  PvStatus,
} from './types';
import { loadModel } from '@picovoice/web-utils';
import { pvStatusToException } from './falcon_errors';

export class FalconWorker {
  private readonly _worker: Worker;
  private readonly _version: string;
  private readonly _sampleRate: number;

  private static _wasmSimd: string;
  private static _wasmSimdLib: string;
  private static _wasmPThread: string;
  private static _wasmPThreadLib: string;
  private static _sdk: string = 'web';

  private constructor(worker: Worker, version: string, sampleRate: number) {
    this._worker = worker;
    this._version = version;
    this._sampleRate = sampleRate;
  }

  /**
   * Get Falcon engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * Get Falcon worker instance.
   */
  get worker(): Worker {
    return this._worker;
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm SIMD file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Set base64 wasm file with SIMD feature in text format.
   * @param wasmSimdLib Base64'd wasm SIMD file in text format.
   */
  public static setWasmSimdLib(wasmSimdLib: string): void {
    if (this._wasmSimdLib === undefined) {
      this._wasmSimdLib = wasmSimdLib;
    }
  }

  /**
   * Set base64 wasm file with SIMD and pthread feature.
   * @param wasmPThread Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmPThread(wasmPThread: string): void {
    if (this._wasmPThread === undefined) {
      this._wasmPThread = wasmPThread;
    }
  }

  /**
   * Set base64 SIMD and thread wasm file in text format.
   * @param wasmPThreadLib Base64'd wasm file in text format.
   */
  public static setWasmPThreadLib(wasmPThreadLib: string): void {
    if (this._wasmPThreadLib === undefined) {
      this._wasmPThreadLib = wasmPThreadLib;
    }
  }

  public static setSdk(sdk: string): void {
    FalconWorker._sdk = sdk;
  }

  /**
   * Creates a worker instance of the Picovoice Falcon Speaker Diarization engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param model Falcon model options.
   * @param model.base64 The model in base64 string to initialize Falcon.
   * @param model.publicPath The model path relative to the public directory.
   * @param model.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `falcon` instances.
   * @param model.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param model.version Version of the model file. Increment to update the model file in storage.
   * @param device String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
   * suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To select a specific
   * GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If set to
   * `cpu`, the engine will run on the CPU with the default number of threads. To specify the number of threads, set this
   * argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of threads.
   *
   * @returns An instance of FalconWorker.
   */
  public static async create(
    accessKey: string,
    model: FalconModel,
    device?: string,
  ): Promise<FalconWorker> {
    const customWritePath = model.customWritePath
      ? model.customWritePath
      : 'falcon_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    const worker = new PvWorker();
    const returnPromise: Promise<FalconWorker> = new Promise(
      (resolve, reject) => {
        // @ts-ignore - block from GC
        this.worker = worker;
        worker.onmessage = (
          event: MessageEvent<FalconWorkerInitResponse>
        ): void => {
          switch (event.data.command) {
            case 'ok':
              resolve(
                new FalconWorker(
                  worker,
                  event.data.version,
                  event.data.sampleRate
                )
              );
              break;
            case 'failed':
            case 'error':
              reject(
                pvStatusToException(
                  event.data.status,
                  event.data.shortMessage,
                  event.data.messageStack
                )
              );
              break;
            default:
              reject(
                pvStatusToException(
                  PvStatus.RUNTIME_ERROR,
                  // @ts-ignore
                  `Unrecognized command: ${event.data.command}`
                )
              );
          }
        };
      }
    );

    worker.postMessage({
      command: 'init',
      accessKey: accessKey,
      modelPath: modelPath,
      device: device,
      wasmSimd: this._wasmSimd,
      wasmSimdLib: this._wasmSimdLib,
      wasmPThread: this._wasmPThread,
      wasmPThreadLib: this._wasmPThreadLib,
      sdk: this._sdk,
    });

    return returnPromise;
  }

  /**
   * Processes audio in a worker. The required sample rate can be retrieved from '.sampleRate'.
   * The audio needs to be 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm Frame of audio with properties described above.
   * @param options Optional process arguments.
   * @param options.transfer Flag to indicate if the buffer should be transferred or not. If set to true,
   * input buffer array will be transferred to the worker.
   * @param options.transferCallback Optional callback containing a new Int16Array with contents from 'pcm'. Use this callback
   * to get the input pcm when using transfer.
   *
   * @return A segments object.
   */
  public process(
    pcm: Int16Array,
    options: {
      transfer?: boolean;
      transferCallback?: (data: Int16Array) => void;
    } = {}
  ): Promise<FalconSegments> {
    const { transfer = false, transferCallback } = options;

    const returnPromise: Promise<FalconSegments> = new Promise(
      (resolve, reject) => {
        this._worker.onmessage = (
          event: MessageEvent<FalconWorkerProcessResponse>
        ): void => {
          switch (event.data.command) {
            case 'ok':
              if (transfer && transferCallback && event.data.inputFrame) {
                transferCallback(new Int16Array(event.data.inputFrame.buffer));
              }
              resolve(event.data.result);
              break;
            case 'failed':
            case 'error':
              reject(
                pvStatusToException(
                  event.data.status,
                  event.data.shortMessage,
                  event.data.messageStack
                )
              );
              break;
            default:
              reject(
                pvStatusToException(
                  PvStatus.RUNTIME_ERROR,
                  // @ts-ignore
                  `Unrecognized command: ${event.data.command}`
                )
              );
          }
        };
      }
    );

    const transferable = transfer ? [pcm.buffer] : [];

    this._worker.postMessage(
      {
        command: 'process',
        inputFrame: pcm,
        transfer: transfer,
      },
      transferable
    );

    return returnPromise;
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public release(): Promise<void> {
    const returnPromise: Promise<void> = new Promise((resolve, reject) => {
      this._worker.onmessage = (
        event: MessageEvent<FalconWorkerReleaseResponse>
      ): void => {
        switch (event.data.command) {
          case 'ok':
            resolve();
            break;
          case 'failed':
          case 'error':
            reject(
              pvStatusToException(
                event.data.status,
                event.data.shortMessage,
                event.data.messageStack
              )
            );
            break;
          default:
            reject(
              pvStatusToException(
                PvStatus.RUNTIME_ERROR,
                // @ts-ignore
                `Unrecognized command: ${event.data.command}`
              )
            );
        }
      };
    });

    this._worker.postMessage({
      command: 'release',
    });

    return returnPromise;
  }

  /**
   * Terminates the active worker. Stops all requests being handled by worker.
   */
  public terminate(): void {
    this._worker.terminate();
  }
}
