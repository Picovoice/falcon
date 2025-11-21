#
# Copyright 2023-2025 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import os.path
import subprocess
import sys
import unittest
from parameterized import parameterized


def get_test_devices(device):
    result = list()

    if device == "cpu":
        max_threads = os.cpu_count() // 2
        i = 1

        while i <= max_threads:
            result.append(f"cpu:{i}")
            i *= 2
    else:
        result.append(device)

    return result


def get_lib_ext(platform):
    if platform == "windows":
        return "dll"
    elif platform == "mac":
        return "dylib"
    else:
        return "so"


devices = get_test_devices(sys.argv[3])


class FalconCTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]
        cls._platform = sys.argv[2]
        cls._arch = "" if len(sys.argv) != 5 else sys.argv[4]
        cls._root_dir = os.path.join(os.path.dirname(__file__), "../../..")

    def _get_library_file(self):
        return os.path.join(
            self._root_dir,
            "lib",
            self._platform,
            self._arch,
            "libpv_falcon." + get_lib_ext(self._platform)
        )

    @parameterized.expand(devices)
    def test_falcon(self, device):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/falcon_demo"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-m", os.path.join(self._root_dir, 'lib/common/falcon_params.pv'),
            "-y", device,
            os.path.join(self._root_dir, 'resources/audio_samples/test.wav'),
        ]
        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        print(stdout, stderr)
        self.assertEqual(process.poll(), 0)
        self.assertEqual(stderr.decode('utf-8'), '')


if __name__ == '__main__':
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print("usage: test_falcon_c.py ${AccessKey} ${Platform} ${Device} [${Arch}]")
        exit(1)
    unittest.main(argv=sys.argv[:1], verbosity=2)
