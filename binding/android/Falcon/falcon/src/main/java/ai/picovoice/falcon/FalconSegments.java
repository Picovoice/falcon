/*
    Copyright 2024-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.falcon;

/**
 * FalconSegments Class.
 */
public class FalconSegments {

    private final Segment[] segmentArray;

    /**
     * Constructor.
     *
     * @param segmentArray Diarized segments and their associated metadata.
     */
    public FalconSegments(Segment[] segmentArray) {
        this.segmentArray = segmentArray;
    }

    /**
     * Getter for diarized segments and their associated metadata.
     *
     * @return Diarized segments and their associated metadata.
     */
    public Segment[] getSegmentArray() {
        return segmentArray;
    }

    /**
     * FalconSegments.Segment class
     */
    public static class Segment {
        private final float startSec;
        private final float endSec;
        private final int speakerTag;

        /**
         * Constructor.
         *
         * @param startSec   Start of segment in seconds.
         * @param endSec     End of segment in seconds.
         * @param speakerTag A non-negative integer that identifies unique speakers.
         */
        public Segment(
                float startSec,
                float endSec,
                int speakerTag
        ) {
            this.startSec = startSec;
            this.endSec = endSec;
            this.speakerTag = speakerTag;
        }

        /**
         * Getter for the start of segment in seconds.
         *
         * @return Start of segment in seconds.
         */
        public float getStartSec() {
            return startSec;
        }

        /**
         * Getter for the end of segment in seconds.
         *
         * @return End of segment in seconds.
         */
        public float getEndSec() {
            return endSec;
        }

        /**
         * Getter for the speaker tag.
         *
         * @return Speaker tag.
         */
        public int getSpeakerTag() {
            return speakerTag;
        }
    }
}
