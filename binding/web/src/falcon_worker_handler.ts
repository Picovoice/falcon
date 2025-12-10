/*
  Copyright 2024-2025 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Falcon } from './falcon';
import {
  FalconWorkerInitRequest,
  FalconWorkerProcessRequest,
  FalconWorkerRequest,
  PvStatus,
} from './types';
import { FalconError } from './falcon_errors';

let falcon: Falcon | null = null;

const initRequest = async (request: FalconWorkerInitRequest): Promise<any> => {
  if (falcon !== null) {
    return {
      command: 'error',
      status: PvStatus.INVALID_STATE,
      shortMessage: 'Falcon already initialized',
    };
  }
  try {
    Falcon.setWasmSimd(request.wasmSimd);
    Falcon.setWasmSimdLib(request.wasmSimdLib);
    Falcon.setWasmPThread(request.wasmPThread);
    Falcon.setWasmPThreadLib(request.wasmPThreadLib);
    Falcon.setSdk(request.sdk);
    falcon = await Falcon._init(request.accessKey, request.modelPath, request.device);
    return {
      command: 'ok',
      version: falcon.version,
      sampleRate: falcon.sampleRate,
    };
  } catch (e: any) {
    if (e instanceof FalconError) {
      return {
        command: 'error',
        status: e.status,
        shortMessage: e.shortMessage,
        messageStack: e.messageStack,
      };
    }
    return {
      command: 'error',
      status: PvStatus.RUNTIME_ERROR,
      shortMessage: e.message,
    };
  }
};

const processRequest = async (
  request: FalconWorkerProcessRequest
): Promise<any> => {
  if (falcon === null) {
    return {
      command: 'error',
      status: PvStatus.INVALID_STATE,
      shortMessage: 'Falcon not initialized',
      inputFrame: request.inputFrame,
    };
  }
  try {
    return {
      command: 'ok',
      result: await falcon.process(request.inputFrame),
      inputFrame: request.transfer ? request.inputFrame : undefined,
    };
  } catch (e: any) {
    if (e instanceof FalconError) {
      return {
        command: 'error',
        status: e.status,
        shortMessage: e.shortMessage,
        messageStack: e.messageStack,
      };
    }
    return {
      command: 'error',
      status: PvStatus.RUNTIME_ERROR,
      shortMessage: e.message,
    };
  }
};

const releaseRequest = async (): Promise<any> => {
  if (falcon !== null) {
    await falcon.release();
    falcon = null;
    close();
  }
  return {
    command: 'ok',
  };
};

/**
 * Falcon worker handler.
 */
self.onmessage = async function (
  event: MessageEvent<FalconWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      self.postMessage(await initRequest(event.data));
      break;
    case 'process':
      self.postMessage(
        await processRequest(event.data),
        event.data.transfer ? [event.data.inputFrame.buffer] : []
      );
      break;
    case 'release':
      self.postMessage(await releaseRequest());
      break;
    default:
      self.postMessage({
        command: 'failed',
        status: PvStatus.RUNTIME_ERROR,
        // @ts-ignore
        shortMessage: `Unrecognized command: ${event.data.command}`,
      });
  }
};
