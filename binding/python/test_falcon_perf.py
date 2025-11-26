#
#    Copyright 2023-2025 Picovoice Inc.
#
#    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
#    file accompanying this source.
#
#    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
#    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations under the License.
#

import argparse
import os
import sys
import unittest
from parameterized import parameterized
from time import perf_counter

from _falcon import Falcon
from _util import default_library_path, default_model_path


class FalconPerformanceTestCase(unittest.TestCase):
    TEST_PATH = os.path.join(os.path.dirname(__file__), "../../resources/audio_samples/test.wav")

    access_key: str
    device: str
    num_test_iterations: int
    performance_threshold_sec: float

    def test_performance_proc(self):
        falcon = Falcon(
            access_key=self.access_key,
            model_path=default_model_path("../.."),
            device=self.device,
            library_path=default_library_path("../.."),
        )

        perf_results = list()
        for i in range(self.num_test_iterations):
            start = perf_counter()
            falcon.process_file(self.TEST_PATH)
            proc_time = perf_counter() - start

            if i > 0:
                perf_results.append(proc_time)

        falcon.delete()

        avg_perf = sum(perf_results) / self.num_test_iterations
        print("Average proc performance: %s" % avg_perf)
        self.assertLess(avg_perf, self.performance_threshold_sec)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--access-key", required=True)
    parser.add_argument("--device", required=True)
    parser.add_argument("--num-test-iterations", type=int, required=True)
    parser.add_argument("--performance-threshold-sec", type=float, required=True)
    args = parser.parse_args()

    FalconPerformanceTestCase.access_key = args.access_key
    FalconPerformanceTestCase.device = args.device
    FalconPerformanceTestCase.num_test_iterations = args.num_test_iterations
    FalconPerformanceTestCase.performance_threshold_sec = args.performance_threshold_sec

    unittest.main(argv=sys.argv[:1])
