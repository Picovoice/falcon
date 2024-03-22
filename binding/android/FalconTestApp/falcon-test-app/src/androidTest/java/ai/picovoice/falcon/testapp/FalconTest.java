/*
    Copyright 2024 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.falcon.testapp;

import static org.junit.Assert.*;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;
import org.junit.experimental.runners.Enclosed;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import ai.picovoice.falcon.Falcon;
import ai.picovoice.falcon.FalconException;
import ai.picovoice.falcon.FalconSegment;


@RunWith(Enclosed.class)
public class FalconTest {

    public static class StandardTests extends BaseTest {

        @Test
        public void testInitFailWithInvalidAccessKey() {
            boolean didFail = false;
            try {
                new Falcon.Builder()
                        .setAccessKey("")
                        .build(appContext);
            } catch (FalconException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithMissingAccessKey() {
            boolean didFail = false;
            try {
                new Falcon.Builder()
                        .build(appContext);
            } catch (FalconException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithInvalidModelPath() {
            boolean didFail = false;
            File modelPath = new File(testResourcesPath, "bad_path/bad_path.pv");
            try {
                new Falcon.Builder()
                        .setAccessKey(accessKey)
                        .setModelPath(modelPath.getAbsolutePath())
                        .build(appContext);
            } catch (FalconException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void getVersion() throws FalconException {
            Falcon falcon = new Falcon.Builder()
                    .setAccessKey(accessKey)
                    .build(appContext);

            assertTrue(falcon.getVersion() != null && !falcon.getVersion().equals(""));

            falcon.delete();
        }

        @Test
        public void getSampleRate() throws FalconException {
            Falcon falcon = new Falcon.Builder()
                    .setAccessKey(accessKey)
                    .build(appContext);

            assertTrue(falcon.getSampleRate() > 0);

            falcon.delete();
        }

        @Test
        public void testErrorStack() {
            String[] error = {};
            try {
                new Falcon.Builder()
                        .setAccessKey("invalid")
                        .build(appContext);
            } catch (FalconException e) {
                error = e.getMessageStack();
            }

            assertTrue(0 < error.length);
            assertTrue(error.length <= 8);

            try {
                new Falcon.Builder()
                        .setAccessKey("invalid")
                        .build(appContext);
            } catch (FalconException e) {
                for (int i = 0; i < error.length; i++) {
                    assertEquals(e.getMessageStack()[i], error[i]);
                }
            }
        }
    }

    @RunWith(Parameterized.class)
    public static class DiarizationTests extends BaseTest {
        @Parameterized.Parameter(value = 0)
        public String testAudioFile;

        @Parameterized.Parameter(value = 1)
        public FalconSegment[] expectedSegments;

        @Parameterized.Parameters(name = "{0}")
        public static Collection<Object[]> initParameters() throws IOException {
            String testDataJsonString = getTestDataString();

            JsonParser parser = new JsonParser();
            JsonObject testDataJson = parser.parse(testDataJsonString).getAsJsonObject();
            JsonArray diarizationTests = testDataJson
                    .getAsJsonObject("tests")
                    .getAsJsonArray("diarization_tests");

            List<Object[]> parameters = new ArrayList<>();
            for (int i = 0; i < diarizationTests.size(); i++) {
                JsonObject testData = diarizationTests.get(i).getAsJsonObject();

                String audioFile = testData.get("audio_file").getAsString();
                JsonArray segments = testData.get("segments").getAsJsonArray();

                String testAudioFile = String.format("audio_samples/%s", audioFile);

                FalconSegment[] paramSegments = new FalconSegment[segments.size()];
                for (int j = 0; j < segments.size(); j++) {
                    JsonObject segmentObject = segments.get(j).getAsJsonObject();

                    float startSec = segmentObject.get("start_sec").getAsFloat();
                    float endSec = segmentObject.get("end_sec").getAsFloat();
                    int speakerTag = segmentObject.get("speaker_tag").getAsInt();

                    paramSegments[j] = new FalconSegment(
                            startSec,
                            endSec,
                            speakerTag
                    );
                }

                parameters.add(new Object[]{
                        testAudioFile,
                        paramSegments
                });
            }

            return parameters;
        }

        @Test
        public void testDiarization() throws Exception {
            Falcon falcon = new Falcon.Builder()
                    .setAccessKey(accessKey)
                    .build(appContext);

            File audioFile = new File(testResourcesPath, testAudioFile);
            short[] pcm = readAudioFile(audioFile.getAbsolutePath());

            FalconSegment[] result = falcon.process(pcm);

            assertEquals(result.length, expectedSegments.length);
            for (int i = 0; i < result.length; i++) {
                validateMetadata(result, expectedSegments);
            }
            falcon.delete();
        }
    }
}
