/*
  Copyright 2024 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { PvModel } from '@picovoice/web-utils';

export enum PvStatus {
  SUCCESS = 10000,
  OUT_OF_MEMORY,
  IO_ERROR,
  INVALID_ARGUMENT,
  STOP_ITERATION,
  KEY_ERROR,
  INVALID_STATE,
  RUNTIME_ERROR,
  ACTIVATION_ERROR,
  ACTIVATION_LIMIT_REACHED,
  ACTIVATION_THROTTLED,
  ACTIVATION_REFUSED,
}

/**
 * FalconModel types
 */
export type FalconModel = PvModel;

export type FalconSegment = {
  /** Start of word in seconds. */
  startSec: number;
  /** End of word in seconds. */
  endSec: number;
  /** The speaker tag is `-1` if diarization is not enabled during initialization;
   * otherwise, it's a non-negative integer identifying unique speakers, with `0` reserved for
   * unknown speakers. */
  speakerTag: number;
};

export type FalconSegments = {
  segments: FalconSegment[];
};

export type FalconWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  modelPath: string;
  wasm: string;
  wasmSimd: string;
  sdk: string;
};

export type FalconWorkerProcessRequest = {
  command: 'process';
  inputFrame: Int16Array;
  transfer: boolean;
};

export type FalconWorkerReleaseRequest = {
  command: 'release';
};

export type FalconWorkerRequest =
  | FalconWorkerInitRequest
  | FalconWorkerProcessRequest
  | FalconWorkerReleaseRequest;

export type FalconWorkerFailureResponse = {
  command: 'failed' | 'error';
  status: PvStatus;
  shortMessage: string;
  messageStack: string[];
};

export type FalconWorkerInitResponse =
  | FalconWorkerFailureResponse
  | {
      command: 'ok';
      sampleRate: number;
      version: string;
    };

export type FalconWorkerProcessResponse =
  | FalconWorkerFailureResponse
  | {
      command: 'ok';
      result: FalconSegments;
      inputFrame?: Int16Array;
    };

export type FalconWorkerReleaseResponse =
  | FalconWorkerFailureResponse
  | {
      command: 'ok';
    };

export type FalconWorkerResponse =
  | FalconWorkerInitResponse
  | FalconWorkerProcessResponse
  | FalconWorkerReleaseResponse;
