/*
    Copyright 2024 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.falcon;

class FalconNative {

    static native String getVersion();

    static native int getSampleRate();

    static native void setSdk(String sdk);

    static native long init(
            String accessKey,
            String modelPath) throws FalconException;

    static native void delete(long object);

    static native FalconSegment[] process(
            long object,
            short[] pcm,
            int numSamples) throws FalconException;

    static native FalconSegment[] processFile(
            long object,
            String path) throws FalconException;
}
