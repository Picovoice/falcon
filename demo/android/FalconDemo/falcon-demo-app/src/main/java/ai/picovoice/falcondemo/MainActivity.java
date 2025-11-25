/*
    Copyright 2024 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.falcondemo;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Timer;
import java.util.TimerTask;

import ai.picovoice.android.voiceprocessor.VoiceProcessor;
import ai.picovoice.android.voiceprocessor.VoiceProcessorException;
import ai.picovoice.falcon.Falcon;
import ai.picovoice.falcon.FalconActivationException;
import ai.picovoice.falcon.FalconActivationLimitException;
import ai.picovoice.falcon.FalconActivationRefusedException;
import ai.picovoice.falcon.FalconActivationThrottledException;
import ai.picovoice.falcon.FalconException;
import ai.picovoice.falcon.FalconInvalidArgumentException;
import ai.picovoice.falcon.FalconSegments;
import ai.picovoice.falcon.FalconSegments.Segment;

public class MainActivity extends AppCompatActivity {
    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}";
    private static final int MAX_RECORDING_SEC = 120;
    private static final int FRAME_LENGTH = 512;

    private final VoiceProcessor voiceProcessor = VoiceProcessor.getInstance();
    private final ArrayList<Short> pcmData = new ArrayList<>();

    private Timer recordingTimer;
    private double recordingTimeSec = 0;

    private Falcon falcon;

    private void setUIState(UIState state) {
        runOnUiThread(() -> {
            TextView errorText = findViewById(R.id.errorTextView);
            TextView recordingTextView = findViewById(R.id.recordingTextView);
            ToggleButton recordButton = findViewById(R.id.recordButton);
            LinearLayout resultsLayout = findViewById(R.id.resultsLayout);

            switch (state) {
                case RECORDING:
                    errorText.setVisibility(View.INVISIBLE);
                    resultsLayout.setVisibility(View.INVISIBLE);
                    recordButton.setEnabled(true);
                    break;
                case DIARIZING:
                    errorText.setVisibility(View.INVISIBLE);
                    resultsLayout.setVisibility(View.INVISIBLE);
                    recordingTextView.setText("Diarizing audio...");
                    recordButton.setEnabled(false);
                    break;
                case RESULTS:
                    errorText.setVisibility(View.INVISIBLE);
                    resultsLayout.setVisibility(View.VISIBLE);
                    recordButton.setEnabled(true);
                    break;
                case ERROR:
                    resultsLayout.setVisibility(View.INVISIBLE);
                    recordButton.setEnabled(false);
                    break;
                default:
                    break;
            }
        });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.falcon_demo);

        try {
            falcon = new Falcon.Builder()
                    .setAccessKey(ACCESS_KEY)
                    .build(getApplicationContext());
        } catch (FalconInvalidArgumentException e) {
            displayError(e.getMessage());
        } catch (FalconActivationException e) {
            displayError("AccessKey activation error");
        } catch (FalconActivationLimitException e) {
            displayError("AccessKey reached its device limit");
        } catch (FalconActivationRefusedException e) {
            displayError("AccessKey refused");
        } catch (FalconActivationThrottledException e) {
            displayError("AccessKey has been throttled");
        } catch (FalconException e) {
            displayError("Failed to initialize Falcon " + e.getMessage());
        }

        voiceProcessor.addFrameListener(frame -> {
            for (short sample : frame) {
                pcmData.add(sample);
            }
        });

        voiceProcessor.addErrorListener(error -> {
            runOnUiThread(() -> displayError(error.toString()));
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        falcon.delete();
    }

    private void displayError(String message) {
        setUIState(UIState.ERROR);

        TextView errorText = findViewById(R.id.errorTextView);
        errorText.setText(message);
        errorText.setVisibility(View.VISIBLE);

        ToggleButton recordButton = findViewById(R.id.recordButton);
        recordButton.setEnabled(false);
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    private void startRecording() {
        setUIState(UIState.RECORDING);

        pcmData.clear();
        try {
            voiceProcessor.start(FRAME_LENGTH, falcon.getSampleRate());
        } catch (VoiceProcessorException e) {
            displayError(e.toString());
            return;
        }

        recordingTimeSec = 0;
        TextView timerValue = findViewById(R.id.recordingTextView);
        recordingTimer = new Timer();
        recordingTimer.scheduleAtFixedRate(new TimerTask() {
            @SuppressLint("DefaultLocale")
            @Override
            public void run() {
                recordingTimeSec += 0.1;
                runOnUiThread(() -> {
                    timerValue.setText(String.format(
                            "Recording : %.1f / %d (seconds)",
                            recordingTimeSec,
                            MAX_RECORDING_SEC));
                    if (recordingTimeSec >= MAX_RECORDING_SEC) {
                        ToggleButton recordButton = findViewById(R.id.recordButton);
                        recordButton.setChecked(false);
                        stopRecording();
                    }
                });
            }
        }, 100, 100);
    }

    @SuppressLint("DefaultLocale")
    private void stopRecording() {
        if (recordingTimer != null) {
            recordingTimer.cancel();
            recordingTimer = null;
        }

        try {
            voiceProcessor.stop();
        } catch (VoiceProcessorException e) {
            displayError(e.toString());
        }

        setUIState(UIState.DIARIZING);
        short[] pcmDataArray = new short[pcmData.size()];
        for (int i = 0; i < pcmData.size(); i++) {
            pcmDataArray[i] = pcmData.get(i);
        }

        new Thread(() -> {
            try {
                long diarizationStart = System.currentTimeMillis();
                FalconSegments segments = falcon.process(pcmDataArray);
                long diarizationEnd = System.currentTimeMillis();

                float diarizationTime = (diarizationEnd - diarizationStart) / 1000f;

                runOnUiThread(() -> {
                    setUIState(UIState.RESULTS);

                    TextView recordingTextView = findViewById(R.id.recordingTextView);
                    recordingTextView.setText(String.format(
                            "Diarized %.1f(s) of audio in %.1f(s).",
                            pcmDataArray.length / (float) falcon.getSampleRate(),
                            diarizationTime));

                    RecyclerView resultsView = findViewById(R.id.resultsView);
                    LinearLayoutManager linearLayoutManager = new LinearLayoutManager(getApplicationContext());
                    resultsView.setLayoutManager(linearLayoutManager);

                    ResultsViewAdaptor searchResultsViewAdaptor = new ResultsViewAdaptor(
                            getApplicationContext(),
                            Arrays.asList(segments.getSegmentArray()));
                    resultsView.setAdapter(searchResultsViewAdaptor);
                });
            } catch (FalconException e) {
                runOnUiThread(() -> displayError("Diarization failed\n" + e));
            }
        }).start();
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton recordButton = findViewById(R.id.recordButton);
            recordButton.setChecked(false);
            displayError("Microphone permission is required for this demo");
        } else {
            startRecording();
        }
    }

    public void onRecordClick(View view) {
        ToggleButton recordButton = findViewById(R.id.recordButton);

        if (falcon == null) {
            displayError("Falcon is not initialized");
            recordButton.setChecked(false);
            return;
        }

        if (recordButton.isChecked()) {
            if (voiceProcessor.hasRecordAudioPermission(this)) {
                startRecording();
            } else {
                requestRecordPermission();
            }
        } else {
            stopRecording();
        }
    }

    private enum UIState {
        RECORDING,
        DIARIZING,
        RESULTS,
        ERROR
    }

    private static class ResultsViewAdaptor extends RecyclerView.Adapter<ResultsViewAdaptor.ViewHolder> {
        private final List<Segment> data;
        private final LayoutInflater inflater;

        ResultsViewAdaptor(Context context, List<Segment> data) {
            this.inflater = LayoutInflater.from(context);
            this.data = data;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = inflater.inflate(R.layout.recyclerview_row, parent, false);
            return new ViewHolder(view);
        }

        @SuppressLint("DefaultLocale")
        @Override
        public void onBindViewHolder(ViewHolder holder, int position) {
            Segment segment = data.get(position);
            holder.speakerTag.setText(String.format("%d", segment.getSpeakerTag()));
            holder.startSec.setText(String.format("%.2fs", segment.getStartSec()));
            holder.endSec.setText(String.format("%.2fs", segment.getEndSec()));
        }

        @Override
        public int getItemCount() {
            return data.size();
        }

        public static class ViewHolder extends RecyclerView.ViewHolder {
            TextView speakerTag;
            TextView startSec;
            TextView endSec;

            ViewHolder(View itemView) {
                super(itemView);
                speakerTag = itemView.findViewById(R.id.speakerTag);
                startSec = itemView.findViewById(R.id.startSec);
                endSec = itemView.findViewById(R.id.endSec);
            }
        }
    }
}
