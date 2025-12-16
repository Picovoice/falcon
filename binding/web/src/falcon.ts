/*
  Copyright 2024-2025 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import { simd } from 'wasm-feature-detect';

import {
  arrayBufferToStringAtIndex,
  base64ToUint8Array,
  isAccessKeyValid,
  loadModel,
} from '@picovoice/web-utils';

import createModuleSimd from "./lib/pv_falcon_simd";
import createModulePThread from "./lib/pv_falcon_pthread";

import { FalconModel, FalconSegment, FalconSegments, PvStatus } from './types';
import { pvStatusToException } from './falcon_errors';
import * as FalconErrors from './falcon_errors';

/**
 * WebAssembly function types
 */

type pv_falcon_init_type = (
  accessKey: number,
  modelPath: number,
  device: number,
  object: number
) => Promise<number>;
type pv_falcon_process_type = (
  object: number,
  pcm: number,
  numSamples: number,
  numSegments: number,
  segments: number
) => Promise<number>;
type pv_falcon_delete_type = (object: number) => void;
type pv_falcon_segments_delete_type = (segments: number) => void;
type pv_sample_rate_type = () => number;
type pv_falcon_version_type = () => number;
type pv_falcon_list_hardware_devices_type = (
  hardwareDevices: number,
  numHardwareDevices: number
) => number;
type pv_falcon_free_hardware_devices_type = (
  hardwareDevices: number,
  numHardwareDevices: number
) => number;
type pv_set_sdk_type = (sdk: number) => void;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => number;
type pv_free_error_stack_type = (messageStack: number) => void;

type FalconModule = EmscriptenModule & {
  _pv_free: (address: number) => void;

  _pv_falcon_segments_delete: pv_falcon_segments_delete_type
  _pv_sample_rate: pv_sample_rate_type
  _pv_falcon_version: pv_falcon_version_type
  _pv_falcon_list_hardware_devices: pv_falcon_list_hardware_devices_type;
  _pv_falcon_free_hardware_devices: pv_falcon_free_hardware_devices_type;

  _pv_set_sdk: pv_set_sdk_type;
  _pv_get_error_stack: pv_get_error_stack_type;
  _pv_free_error_stack: pv_free_error_stack_type;

  // em default functions
  addFunction: typeof addFunction;
  ccall: typeof ccall;
  cwrap: typeof cwrap;
}

type FalconWasmOutput = {
  module: FalconModule;

  pv_falcon_process: pv_falcon_process_type;
  pv_falcon_delete: pv_falcon_delete_type;

  version: string;
  sampleRate: number;

  objectAddress: number;
  numSegmentsAddress: number;
  segmentsAddressAddress: number;
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;
};

const MAX_PCM_LENGTH_SEC = 60 * 15;

export class Falcon {
  private _module?: FalconModule;

  private readonly _pv_falcon_process: pv_falcon_process_type;
  private readonly _pv_falcon_delete: pv_falcon_delete_type;

  private readonly _sampleRate: number;
  private readonly _version: string;

  private readonly _functionMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;
  private readonly _segmentsAddressAddress: number;
  private readonly _numSegmentsAddress: number;

  private static _wasmSimd: string;
  private static _wasmSimdLib: string;
  private static _wasmPThread: string;
  private static _wasmPThreadLib: string;
  private static _sdk: string = 'web';

  private static _falconMutex = new Mutex();

  private constructor(handleWasm: FalconWasmOutput) {
    this._module = handleWasm.module;

    this._pv_falcon_process = handleWasm.pv_falcon_process;
    this._pv_falcon_delete = handleWasm.pv_falcon_delete;

    this._version = handleWasm.version;
    this._sampleRate = handleWasm.sampleRate;

    this._objectAddress = handleWasm.objectAddress;
    this._messageStackAddressAddressAddress = handleWasm.messageStackAddressAddressAddress;
    this._messageStackDepthAddress = handleWasm.messageStackDepthAddress;
    this._segmentsAddressAddress = handleWasm.segmentsAddressAddress;
    this._numSegmentsAddress = handleWasm.numSegmentsAddress;

    this._functionMutex = new Mutex();
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
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Set base64 SIMD wasm file in text format.
   * @param wasmSimdLib Base64'd wasm file in text format.
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
    Falcon._sdk = sdk;
  }

  /**
   * Creates an instance of the Picovoice Falcon Speaker Diarization engine.
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
   * @returns An instance of the Falcon engine.
   */
  public static async create(
    accessKey: string,
    model: FalconModel,
    device?: string,
  ): Promise<Falcon> {
    const customWritePath = model.customWritePath
      ? model.customWritePath
      : 'falcon_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    return await Falcon._init(accessKey, modelPath, device);
  }

  public static async _init(accessKey: string, modelPath: string, device?: string): Promise<Falcon> {
    if (!isAccessKeyValid(accessKey)) {
      throw new FalconErrors.FalconInvalidArgumentError('Invalid AccessKey');
    }

    const isSimd = await simd();
    if (!isSimd) {
      throw new FalconErrors.FalconRuntimeError('Browser not supported.');
    }

    let deviceArg = (device) ? device : "best";
    const isWorkerScope = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
    if (
      !isWorkerScope &&
      (deviceArg === 'best' || (deviceArg.startsWith('cpu') && deviceArg !== 'cpu:1'))
    ) {
      // eslint-disable-next-line no-console
      console.warn('Multi-threading is not supported on main thread.');
      deviceArg = 'cpu:1';
    }

    const sabDefined = typeof SharedArrayBuffer !== 'undefined'
      && (deviceArg !== "cpu:1");

    return new Promise<Falcon>((resolve, reject) => {
      Falcon._falconMutex
        .runExclusive(async () => {
          const wasmOutput = await Falcon.initWasm(
            accessKey.trim(),
            modelPath.trim(),
            deviceArg,
            (sabDefined) ? this._wasmPThread : this._wasmSimd,
            (sabDefined) ? this._wasmPThreadLib : this._wasmSimdLib,
            (sabDefined) ? createModulePThread : createModuleSimd,
          );
          return new Falcon(wasmOutput);
        })
        .then((result: Falcon) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Processes audio. The required sample rate can be retrieved from '.sampleRate'. The audio needs to be
   * 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm A frame of audio with properties described above.
   * @return The segments.
   */
  public async process(pcm: Int16Array): Promise<FalconSegments> {
    if (!(pcm instanceof Int16Array)) {
      throw new FalconErrors.FalconInvalidArgumentError(
        "The argument 'pcm' must be provided as an Int16Array"
      );
    }

    const maxSize = MAX_PCM_LENGTH_SEC * this._sampleRate;
    if (pcm.length > maxSize) {
      throw new FalconErrors.FalconInvalidArgumentError(
        `'pcm' must be less than ${maxSize} samples (${MAX_PCM_LENGTH_SEC} seconds)`
      );
    }

    return new Promise<FalconSegments>((resolve, reject) => {
      this._functionMutex
        .runExclusive(async () => {
          if (this._module === undefined) {
            throw new FalconErrors.FalconInvalidStateError(
              'Attempted to call Falcon process after release.'
            );
          }

          const inputBufferAddress = this._module._malloc(
            pcm.length * Int16Array.BYTES_PER_ELEMENT
          );
          if (inputBufferAddress === 0) {
            throw new FalconErrors.FalconOutOfMemoryError(
              'malloc failed: Cannot allocate memory'
            );
          }

          this._module.HEAP16.set(
            pcm,
            inputBufferAddress / Int16Array.BYTES_PER_ELEMENT
          );
          const status = await this._pv_falcon_process(
            this._objectAddress,
            inputBufferAddress,
            pcm.length,
            this._numSegmentsAddress,
            this._segmentsAddressAddress
          );
          this._module._pv_free(inputBufferAddress);

          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Falcon.getMessageStack(
              this._module._pv_get_error_stack,
              this._module._pv_free_error_stack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              this._module.HEAP32,
              this._module.HEAPU8
            );

            throw pvStatusToException(status, 'Process failed', messageStack);
          }

          const numSegments = this._module.HEAP32[this._numSegmentsAddress / Int32Array.BYTES_PER_ELEMENT];
          const segmentsAddress = this._module.HEAP32[this._segmentsAddressAddress / Int32Array.BYTES_PER_ELEMENT];

          let ptr = segmentsAddress;
          const segments: FalconSegment[] = [];
          for (let i = 0; i < numSegments; i++) {
            const startSec = this._module.HEAPF32[ptr / Float32Array.BYTES_PER_ELEMENT];
            ptr += Float32Array.BYTES_PER_ELEMENT;
            const endSec = this._module.HEAPF32[ptr / Float32Array.BYTES_PER_ELEMENT];
            ptr += Float32Array.BYTES_PER_ELEMENT;
            const speakerTag = this._module.HEAP32[ptr / Int32Array.BYTES_PER_ELEMENT];
            ptr += Int32Array.BYTES_PER_ELEMENT;
            segments.push({ startSec, endSec, speakerTag });
          }

          this._module._pv_falcon_segments_delete(segmentsAddress);

          return { segments };
        })
        .then((result: FalconSegments) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    if (!this._module) {
      return;
    }
    this._pv_falcon_delete(this._objectAddress);
    this._module._pv_free(this._messageStackAddressAddressAddress);
    this._module._pv_free(this._messageStackDepthAddress);
    this._module._pv_free(this._segmentsAddressAddress);
    this._module._pv_free(this._numSegmentsAddress);
    this._module = undefined;
  }

  /**
   * Lists all available devices that Falcon can use for inference.
   * Each entry in the list can be the used as the `device` argument for the `.create` method.
   *
   * @returns List of all available devices that Falcon can use for inference.
   */
  public static async listAvailableDevices(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      Falcon._falconMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          if (!isSimd) {
            throw new FalconErrors.FalconRuntimeError('Unsupported Browser');
          }

          const blob = new Blob(
            [base64ToUint8Array(this._wasmSimdLib)],
            { type: 'application/javascript' }
          );
          const module: FalconModule = await createModuleSimd({
            mainScriptUrlOrBlob: blob,
            wasmBinary: base64ToUint8Array(this._wasmSimd),
          });

          const hardwareDevicesAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (hardwareDevicesAddressAddress === 0) {
            throw new FalconErrors.FalconOutOfMemoryError(
              'malloc failed: Cannot allocate memory for hardwareDevices'
            );
          }

          const numHardwareDevicesAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (numHardwareDevicesAddress === 0) {
            throw new FalconErrors.FalconOutOfMemoryError(
              'malloc failed: Cannot allocate memory for numHardwareDevices'
            );
          }

          const status: PvStatus = module._pv_falcon_list_hardware_devices(
            hardwareDevicesAddressAddress,
            numHardwareDevicesAddress
          );

          const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (!messageStackDepthAddress) {
            throw new FalconErrors.FalconOutOfMemoryError(
              'malloc failed: Cannot allocate memory for messageStackDepth'
            );
          }

          const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (!messageStackAddressAddressAddress) {
            throw new FalconErrors.FalconOutOfMemoryError(
              'malloc failed: Cannot allocate memory messageStack'
            );
          }

          if (status !== PvStatus.SUCCESS) {
            const messageStack = Falcon.getMessageStack(
              module._pv_get_error_stack,
              module._pv_free_error_stack,
              messageStackAddressAddressAddress,
              messageStackDepthAddress,
              module.HEAP32,
              module.HEAPU8,
            );
            module._pv_free(messageStackAddressAddressAddress);
            module._pv_free(messageStackDepthAddress);

            throw pvStatusToException(
              status,
              'List devices failed',
              messageStack
            );
          }
          module._pv_free(messageStackAddressAddressAddress);
          module._pv_free(messageStackDepthAddress);

          const numHardwareDevices: number = module.HEAP32[numHardwareDevicesAddress / Int32Array.BYTES_PER_ELEMENT];
          module._pv_free(numHardwareDevicesAddress);

          const hardwareDevicesAddress = module.HEAP32[hardwareDevicesAddressAddress / Int32Array.BYTES_PER_ELEMENT];

          const hardwareDevices: string[] = [];
          for (let i = 0; i < numHardwareDevices; i++) {
            const deviceAddress = module.HEAP32[hardwareDevicesAddress / Int32Array.BYTES_PER_ELEMENT + i];
            hardwareDevices.push(arrayBufferToStringAtIndex(module.HEAPU8, deviceAddress));
          }
          module._pv_falcon_free_hardware_devices(
            hardwareDevicesAddress,
            numHardwareDevices
          );
          module._pv_free(hardwareDevicesAddressAddress);

          return hardwareDevices;
        })
        .then((result: string[]) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  private static async initWasm(
    accessKey: string,
    modelPath: string,
    device: string,
    wasmBase64: string,
    wasmLibBase64: string,
    createModuleFunc: any,
  ): Promise<any> {
    const blob = new Blob(
      [base64ToUint8Array(wasmLibBase64)],
      { type: 'application/javascript' }
    );
    const module: FalconModule = await createModuleFunc({
      mainScriptUrlOrBlob: blob,
      wasmBinary: base64ToUint8Array(wasmBase64),
    });

    const pv_falcon_init: pv_falcon_init_type = this.wrapAsyncFunction(
      module,
      "pv_falcon_init",
      4);
    const pv_falcon_process: pv_falcon_process_type = this.wrapAsyncFunction(
      module,
      "pv_falcon_process",
      5);
    const pv_falcon_delete: pv_falcon_delete_type = this.wrapAsyncFunction(
      module,
      "pv_falcon_delete",
      1);

    const objectAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (objectAddressAddress === 0) {
      throw new FalconErrors.FalconOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const accessKeyAddress = module._malloc((accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (accessKeyAddress === 0) {
      throw new FalconErrors.FalconOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    for (let i = 0; i < accessKey.length; i++) {
      module.HEAPU8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    module.HEAPU8[accessKeyAddress + accessKey.length] = 0;

    const modelPathEncoded = new TextEncoder().encode(modelPath);
    const modelPathAddress = module._malloc((modelPathEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (modelPathAddress === 0) {
      throw new FalconErrors.FalconOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    module.HEAPU8.set(modelPathEncoded, modelPathAddress);
    module.HEAPU8[modelPathAddress + modelPathEncoded.length] = 0;

    const deviceAddress = module._malloc((device.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (deviceAddress === 0) {
      throw new FalconErrors.FalconOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    for (let i = 0; i < device.length; i++) {
      module.HEAPU8[deviceAddress + i] = device.charCodeAt(i);
    }
    module.HEAPU8[deviceAddress + device.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = module._malloc((sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (!sdkAddress) {
      throw new FalconErrors.FalconOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    module.HEAPU8.set(sdkEncoded, sdkAddress);
    module.HEAPU8[sdkAddress + sdkEncoded.length] = 0;
    module._pv_set_sdk(sdkAddress);
    module._pv_free(sdkAddress);

    const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackDepthAddress) {
      throw new FalconErrors.FalconOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackAddressAddressAddress) {
      throw new FalconErrors.FalconOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const status = await pv_falcon_init(
      accessKeyAddress,
      modelPathAddress,
      deviceAddress,
      objectAddressAddress,
    );
    module._pv_free(accessKeyAddress);
    module._pv_free(modelPathAddress);
    module._pv_free(deviceAddress);
    if (status !== PvStatus.SUCCESS) {
      const messageStack = await Falcon.getMessageStack(
        module._pv_get_error_stack,
        module._pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        module.HEAP32,
        module.HEAPU8,
      );

      throw pvStatusToException(status, 'Initialization failed', messageStack);
    }

    const objectAddress = module.HEAP32[objectAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    module._pv_free(objectAddressAddress);

    const numSegmentsAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (numSegmentsAddress === 0) {
      throw new FalconErrors.FalconOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const segmentsAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (segmentsAddressAddress === 0) {
      throw new FalconErrors.FalconOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const sampleRate = module._pv_sample_rate();

    const versionAddress = module._pv_falcon_version();
    const version = arrayBufferToStringAtIndex(
      module.HEAPU8,
      versionAddress,
    );

    return {
      module: module,

      pv_falcon_process: pv_falcon_process,
      pv_falcon_delete: pv_falcon_delete,

      version: version,
      sampleRate: sampleRate,

      objectAddress: objectAddress,
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,
      segmentsAddressAddress: segmentsAddressAddress,
      numSegmentsAddress: numSegmentsAddress,
    };
  }

  private static getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferInt32: Int32Array,
    memoryBufferUint8: Uint8Array
  ): string[] {
    const status = pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status !== PvStatus.SUCCESS) {
      throw new Error(`Unable to get error state: ${status}`);
    }

    const messageStackAddressAddress = memoryBufferInt32[messageStackAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];

    const messageStackDepth = memoryBufferInt32[messageStackDepthAddress / Int32Array.BYTES_PER_ELEMENT];
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferInt32[
        (messageStackAddressAddress / Int32Array.BYTES_PER_ELEMENT) + i
      ];
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }

  private static wrapAsyncFunction(module: FalconModule, functionName: string, numArgs: number): (...args: any[]) => any {
    // @ts-ignore
    return module.cwrap(
      functionName,
      "number",
      Array(numArgs).fill("number"),
      { async: true }
    );
  }
}
