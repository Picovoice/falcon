/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.falcon.testapp;

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertEquals;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.platform.app.InstrumentationRegistry;

import com.microsoft.appcenter.espresso.Factory;
import com.microsoft.appcenter.espresso.ReportHelper;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

import ai.picovoice.falcon.FalconSegments;

public class BaseTest {

    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();

    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;
    String defaultModelPath;

    String accessKey;

    @After
    public void TearDown() {
        reportHelper.label("Stopping App");
    }

    @Before
    public void Setup() throws IOException {
        testContext = InstrumentationRegistry.getInstrumentation().getContext();
        appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assetManager = testContext.getAssets();
        extractAssetsRecursively("test_resources");
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();
        defaultModelPath = new File(testResourcesPath, "model_files/falcon_params.pv").getAbsolutePath();

        accessKey = appContext.getString(R.string.pvTestingAccessKey);
    }

    public static String getTestDataString() throws IOException {
        Context testContext = InstrumentationRegistry.getInstrumentation().getContext();
        AssetManager assetManager = testContext.getAssets();

        InputStream is = new BufferedInputStream(assetManager.open("test_resources/test_data.json"), 256);
        ByteArrayOutputStream result = new ByteArrayOutputStream();

        byte[] buffer = new byte[256];
        int bytesRead;
        while ((bytesRead = is.read(buffer)) != -1) {
            result.write(buffer, 0, bytesRead);
        }

        return result.toString("UTF-8");
    }

    protected static short[] readAudioFile(String audioFile) throws Exception {
        FileInputStream audioInputStream = new FileInputStream(audioFile);
        ByteArrayOutputStream audioByteBuffer = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        for (int length; (length = audioInputStream.read(buffer)) != -1; ) {
            audioByteBuffer.write(buffer, 0, length);
        }
        byte[] rawData = audioByteBuffer.toByteArray();

        short[] pcm = new short[rawData.length / 2];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);
        pcmBuff.asShortBuffer().get(pcm);
        pcm = Arrays.copyOfRange(pcm, 22, pcm.length);

        return pcm;
    }

    protected void validateMetadata(
            FalconSegments.Segment[] segments,
            FalconSegments.Segment[] expectedSegments
    ) {
        assertEquals(segments.length, expectedSegments.length);
        for (int i = 0; i < segments.length; i++) {
            assertEquals(segments[i].getStartSec(), expectedSegments[i].getStartSec(), 0.01);
            assertEquals(segments[i].getEndSec(), expectedSegments[i].getEndSec(), 0.01);
            assertEquals(segments[i].getSpeakerTag(), expectedSegments[i].getSpeakerTag());
        }
    }

    protected static float getSegmentErrorRate(
            String transcript,
            String expectedTranscript,
            boolean useCER) {
        String splitter = (useCER) ? "" : " ";
        return (float) levenshteinDistance(
                transcript.split(splitter),
                expectedTranscript.split(splitter)) / transcript.length();
    }

    private static int levenshteinDistance(String[] segments1, String[] segments2) {
        int[][] res = new int[segments1.length + 1][segments2.length + 1];
        for (int i = 0; i <= segments1.length; i++) {
            res[i][0] = i;
        }
        for (int j = 0; j <= segments2.length; j++) {
            res[0][j] = j;
        }
        for (int i = 1; i <= segments1.length; i++) {
            for (int j = 1; j <= segments2.length; j++) {
                res[i][j] = Math.min(
                        Math.min(
                                res[i - 1][j] + 1,
                                res[i][j - 1] + 1),
                        res[i - 1][j - 1] + (segments1[i - 1].equalsIgnoreCase(segments2[j - 1]) ? 0 : 1)
                );
            }
        }
        return res[segments1.length][segments2.length];
    }

    private void extractAssetsRecursively(String path) throws IOException {
        String[] list = assetManager.list(path);
        if (list.length > 0) {
            File outputFile = new File(appContext.getFilesDir(), path);
            if (!outputFile.exists()) {
                outputFile.mkdirs();
            }

            for (String file : list) {
                String filepath = path + "/" + file;
                extractAssetsRecursively(filepath);
            }
        } else {
            extractTestFile(path);
        }
    }

    private void extractTestFile(String filepath) throws IOException {

        InputStream is = new BufferedInputStream(assetManager.open(filepath), 256);
        File absPath = new File(appContext.getFilesDir(), filepath);
        OutputStream os = new BufferedOutputStream(new FileOutputStream(absPath), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
    }
}