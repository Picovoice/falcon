#
# Copyright 2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import json
import os
import struct
import wave
from typing import *

from _falcon import *


def load_test_data() -> List[Tuple[str, List[Falcon.Segment]]]:
    data_file_path = os.path.join(os.path.dirname(__file__), "../../resources/.test/test_data.json")
    with open(data_file_path, encoding="utf8") as data_file:
        json_test_data = data_file.read()
    test_data = json.loads(json_test_data)['tests']

    diarization_tests = [
        (
            t['audio_file'],
            [
                Falcon.Segment(
                    start_sec=x['start_sec'],
                    end_sec=x['end_sec'],
                    speaker_tag=x['speaker_tag'])
                for x in t['segments']
            ]
        )
        for t in test_data['diarization_tests']
    ]

    return diarization_tests


def read_wav_file(file_name: str, sample_rate: int) -> Tuple:
    wav_file = wave.open(file_name, mode="rb")
    channels = wav_file.getnchannels()
    num_frames = wav_file.getnframes()

    if wav_file.getframerate() != sample_rate:
        raise ValueError("Audio file should have a sample rate of %d, got %d" % (sample_rate, wav_file.getframerate()))

    samples = wav_file.readframes(num_frames)
    wav_file.close()

    frames = struct.unpack("h" * num_frames * channels, samples)

    if channels == 2:
        print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")

    return frames[::channels]


def calculate_error(segments: Sequence[Falcon.Segment], expected_segments: Sequence[Falcon.Segment]) -> float:
    error_sec = 0.0
    expected_segment_idx = 0
    for segment in segments:
        expected_segment = expected_segments[expected_segment_idx]
        if segment.speaker_tag != expected_segment.speaker_tag:
            error_sec += abs(segment.end_sec - segment.start_sec)
        else:
            error_sec += abs(expected_segment.end_sec - segment.end_sec)
            error_sec += abs(expected_segment.start_sec - segment.start_sec)
            expected_segment_idx += 1

    length_sec = expected_segments[-1].end_sec

    return error_sec / length_sec


__all__ = [
    'load_test_data',
    'read_wav_file',
    'calculate_error'
]
