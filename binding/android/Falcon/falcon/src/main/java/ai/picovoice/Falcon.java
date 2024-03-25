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

import android.content.Context;
import android.content.res.Resources;
import android.text.TextUtils;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Android binding for Falcon Speaker Diarization engine.
 */
public class Falcon {

    private static String defaultModelPath;

    private static String _sdk = "android";


    static {
        System.loadLibrary("pv_falcon");
    }


    private long handle;

    private static final String[] VALID_EXTENSIONS = {
            "3gp",
            "flac",
            "m4a",
            "mp3",
            "mp4",
            "ogg",
            "opus",
            "vorbis",
            "wav",
            "webm"
    };

    public static void setSdk(String sdk) {
        Falcon._sdk = sdk;
    }

    /**
     * Constructor.
     *
     * @param accessKey AccessKey obtained from Picovoice Console
     * @param modelPath Absolute path to the file containing Falcon model parameters.
     * @throws FalconException if there is an error while initializing Falcon.
     */
    private Falcon(
            String accessKey,
            String modelPath) throws FalconException {
        FalconNative.setSdk(Falcon._sdk);

        handle = FalconNative.init(
                accessKey,
                modelPath);
    }

    /**
     * Releases resources acquired by Falcon.
     */
    public void delete() {
        if (handle != 0) {
            FalconNative.delete(handle);
            handle = 0;
        }
    }

    /**
     * Processes given audio data and returns diarized speaker segments.
     *
     * @param pcm A frame of audio samples. The incoming audio needs to have a sample rate
     *            equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Falcon operates on single channel audio. If you wish to process data in a different
     *            sample rate or format, consider using {@link #processFile(String)}.
     * @return FalconSegment[] object which contains the diarization results of the engine.
     * @throws FalconException if there is an error while processing the audio frame.
     */
    public FalconSegment[] process(short[] pcm) throws FalconException {
        if (handle == 0) {
            throw new FalconInvalidStateException("Attempted to call Falcon process after delete.");
        }

        if (pcm == null) {
            throw new FalconInvalidArgumentException("Passed null frame to Falcon process.");
        }

        return FalconNative.process(handle, pcm, pcm.length);
    }

    /**
     * Processes given audio data and returns diarized speaker segments.
     *
     * @param path Absolute path to the audio file. The supported formats are:
     *             `3gp (AMR)`, `FLAC`, `MP3`, `MP4/m4a (AAC)`, `Ogg`, `WAV` and `WebM`.
     * @return FalconSegment[] object which contains the diarization results of the engine.
     * @throws FalconException if there is an error while processing the audio frame.
     */
    public FalconSegment[] processFile(String path) throws FalconException {
        if (handle == 0) {
            throw new FalconInvalidStateException("Attempted to call Falcon processFile after delete.");
        }

        if (path == null || path.equals("")) {
            throw new FalconInvalidArgumentException("Passed null path to Falcon processFile.");
        }

        try {
            return FalconNative.processFile(handle, path);
        } catch (FalconInvalidArgumentException e) {
            boolean endsWithValidExt = false;
            for (String ext : VALID_EXTENSIONS) {
                if (path.endsWith(ext)) {
                    endsWithValidExt = true;
                    break;
                }
            }
            if (!endsWithValidExt) {
                throw new FalconInvalidArgumentException(
                        String.format(
                                "Specified file '%s' does not have an accepted file extension. " +
                                        "Valid extensions are: %s",
                                path,
                                TextUtils.join(", ", VALID_EXTENSIONS)));
            }
            throw e;
        }
    }

    /**
     * Getter for required audio sample rate for PCM data.
     *
     * @return Required audio sample rate for PCM data.
     */
    public int getSampleRate() {
        return FalconNative.getSampleRate();
    }

    /**
     * Getter for Falcon version.
     *
     * @return Falcon version.
     */
    public String getVersion() {
        return FalconNative.getVersion();
    }

    /**
     * Builder for creating an instance of Falcon.
     */
    public static class Builder {

        private String accessKey = null;
        private String modelPath = null;

        /**
         * Setter the AccessKey.
         *
         * @param accessKey AccessKey obtained from Picovoice Console
         */
        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        /**
         * Setter for the absolute path to the file containing Falcon model parameters.
         *
         * @param modelPath Absolute path to the file containing Falcon model parameters.
         */
        public Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        private static void extractPackageResources(Context context) throws FalconIOException {
            final Resources resources = context.getResources();

            try {
                defaultModelPath = extractResource(context,
                        resources.openRawResource(R.raw.falcon_params),
                        resources.getResourceEntryName(R.raw.falcon_params) + ".pv");
            } catch (IOException ex) {
                throw new FalconIOException(ex);
            }
        }

        private static String extractResource(
                Context context,
                InputStream srcFileStream,
                String dstFilename
        ) throws IOException {
            InputStream is = new BufferedInputStream(srcFileStream, 512);
            OutputStream os = new BufferedOutputStream(context.openFileOutput(dstFilename, Context.MODE_PRIVATE), 512);
            int r;
            while ((r = is.read()) != -1) {
                os.write(r);
            }
            os.flush();

            is.close();
            os.close();
            return new File(context.getFilesDir(), dstFilename).getAbsolutePath();
        }

        /**
         * Creates an instance of Falcon Speaker Diarization engine.
         */
        public Falcon build(Context context) throws FalconException {
            if (accessKey == null || this.accessKey.equals("")) {
                throw new FalconInvalidArgumentException("No AccessKey was provided to Falcon");
            }

            if (modelPath == null) {
                if (defaultModelPath == null) {
                    extractPackageResources(context);
                }
                modelPath = defaultModelPath;
            } else {
                File modelFile = new File(modelPath);
                String modelFilename = modelFile.getName();
                if (!modelFile.exists() && !modelFilename.equals("")) {
                    try {
                        modelPath = extractResource(context,
                                context.getAssets().open(modelPath),
                                modelFilename);
                    } catch (IOException ex) {
                        throw new FalconIOException(ex);
                    }
                }
            }

            return new Falcon(
                    accessKey,
                    modelPath);
        }
    }
}
