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

import argparse

from pvfalcon import create, FalconActivationLimitError
from tabulate import tabulate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--access_key',
        help='AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)',
        required=True)
    parser.add_argument(
        '--library_path',
        help='Absolute path to dynamic library. Default: using the library provided by `pvfalcon`')
    parser.add_argument(
        '--model_path',
        help='Absolute path to Falcon model. Default: using the model provided by `pvfalcon`')
    parser.add_argument(
        '--wav_paths',
        nargs='+',
        required=True,
        metavar='PATH',
        help='Absolute paths to `.wav` files')
    args = parser.parse_args()

    falcon = create(
        access_key=args.access_key,
        model_path=args.model_path,
        library_path=args.library_path)

    try:
        for wav_path in args.wav_paths:
            segments = falcon.process_file(wav_path)
            print(tabulate(segments, headers=['start_sec', 'end_sec', 'speaker_tag'], floatfmt='.2f'))
    except FalconActivationLimitError:
        print('AccessKey has reached its processing limit.')


if __name__ == '__main__':
    main()
