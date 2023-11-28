#
#    Copyright 2023 Picovoice Inc.
#
#    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
#    file accompanying this source.
#
#    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
#    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations under the License.
#

import os
import sys
import unittest
from typing import *

from _falcon import *
from _util import *
from test_util import *

diarization_tests = load_test_data()


class FalconTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]
        cls._audio_directory = os.path.join(os.path.dirname(__file__), "..", "..", "resources", "audio_samples")
        cls._error_threshold = 0.05

    def _validate_metadata(self, segments: Sequence[Falcon.Segment], audio_length: float):
        for i in range(len(segments)):
            self.assertGreaterEqual(segments[i].start_sec, 0)
            self.assertLessEqual(segments[i].start_sec, segments[i].end_sec)
            if i < len(segments) - 1:
                self.assertLessEqual(segments[i].end_sec, segments[i + 1].start_sec)
            else:
                self.assertLessEqual(segments[i].end_sec, audio_length)
            self.assertTrue(segments[i].speaker_tag > 0)

    def test_invalid_access_key(self):
        with self.assertRaises(FalconInvalidArgumentError):
            Falcon(
                access_key="invalid",
                model_path=default_model_path("../../"),
                library_path=default_library_path("../../"),
            )

    def test_invalid_model_path(self):
        with self.assertRaises(FalconIOError):
            Falcon(access_key=self._access_key, model_path="invalid", library_path=default_library_path("../../"))

    def test_invalid_library_path(self):
        with self.assertRaises(FalconIOError):
            Falcon(access_key=self._access_key, model_path=default_model_path("../../"), library_path="invalid")

    def test_version(self):
        o = Falcon(
            access_key=self._access_key,
            model_path=default_model_path("../../"),
            library_path=default_library_path("../../"),
        )
        self.assertIsInstance(o.version, str)
        self.assertGreater(len(o.version), 0)

    def test_falcon_process(self):
        o = None

        try:
            o = Falcon(
                access_key=self._access_key,
                model_path=default_model_path("../../"),
                library_path=default_library_path("../../"),
            )

            pcm = read_wav_file(file_name=os.path.join(self._audio_directory, "test.wav"), sample_rate=o.sample_rate)

            segments = o.process(pcm)
            self._validate_metadata(segments, len(pcm) / o.sample_rate)
            error = calculate_error(segments, diarization_tests[0][1])
            self.assertLess(error, self._error_threshold)
        finally:
            if o is not None:
                o.delete()

    def test_falcon_process_file(self):
        o = None

        try:
            o = Falcon(
                access_key=self._access_key,
                model_path=default_model_path("../../"),
                library_path=default_library_path("../../"),
            )

            pcm = read_wav_file(file_name=os.path.join(self._audio_directory, "test.wav"), sample_rate=o.sample_rate)

            segments = o.process_file(audio_path=os.path.join(self._audio_directory, "test.wav"))
            self._validate_metadata(segments, len(pcm) / o.sample_rate)
            error = calculate_error(segments, diarization_tests[0][1])
            self.assertLess(error, self._error_threshold)
        finally:
            if o is not None:
                o.delete()

    def test_message_stack(self):
        relative_path = "../.."

        error = None
        try:
            f = Falcon(
                access_key="invalid",
                model_path=default_model_path(relative_path),
                library_path=default_library_path(relative_path),
            )
            self.assertIsNone(f)
        except FalconError as e:
            error = e.message_stack

        self.assertIsNotNone(error)
        self.assertGreater(len(error), 0)

        try:
            f = Falcon(
                access_key="invalid",
                model_path=default_model_path(relative_path),
                library_path=default_library_path(relative_path),
            )
            self.assertIsNone(f)
        except FalconError as e:
            self.assertEqual(len(error), len(e.message_stack))
            self.assertListEqual(list(error), list(e.message_stack))

    def test_process_message_stack(self):
        relative_path = "../.."

        f = Falcon(
            access_key=self._access_key,
            model_path=default_model_path(relative_path),
            library_path=default_library_path(relative_path),
        )

        pcm = read_wav_file(file_name=os.path.join(self._audio_directory, "test.wav"), sample_rate=f.sample_rate)

        address = f._handle
        f._handle = None
        try:
            res = f.process(pcm)
            self.assertEqual(res, 100)
        except FalconError as e:
            self.assertGreater(len(e.message_stack), 0)
            self.assertLess(len(e.message_stack), 8)
        finally:
            f._handle = address
            f.delete()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: %s ${ACCESS_KEY}" % sys.argv[0])
        exit(1)

    unittest.main(argv=sys.argv[:1])
