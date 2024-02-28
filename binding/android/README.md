# Falcon Binding for Android

## Falcon Speaker Diarization Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Falcon is an on-device speaker diarization engine. Falcon is:

- Private; All voice processing runs locally.
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
    - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

- Android 5.0 (SDK 21+)

## Installation

Falcon is hosted on Maven Central. To include the package in your Android project, ensure you have
included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your
app's `build.gradle`:

```groovy
dependencies {
    // ...
    implementation 'ai.picovoice:falcon-android:${LATEST_VERSION}'
}
```

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine with the Falcon Builder class by passing in the `accessKey`, `modelPath` and Android app context:

```java
import ai.picovoice.falcon.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
final String modelPath = "${MODEL_FILE_PATH}"; // path relative to the assets folder or absolute path to file on device
try {
    Falcon falcon = new Falcon.Builder()
        .setAccessKey(accessKey)
        .setModelPath(modelPath)
        .build(appContext);
} catch (FalconException ex) { }
```

Perform diarization on an audio file by providing the absolute path to the file:

```java
File audioFile = new File("${AUDIO_FILE_PATH}");
FalconSegments segments = falcon.processFile(audioFile.getAbsolutePath());
```

Supported audio file formats are `3gp (AMR)`, `FLAC`, `MP3`, `MP4/m4a (AAC)`, `Ogg`, `WAV` and `WebM`.

Perform diarization on raw audio data (sample rate of 16 kHz, 16-bit linearly encoded and 1 channel):
```java
short[] getAudioData() {
    // ...
}
FalconSegments segments = falcon.process(getAudioData());
```

When done, release resources explicitly:

```java
falcon.delete();
```

### Language Model

Add the Falcon model file to your Android application by:

1. Either create a model in [Picovoice Console](https://console.picovoice.ai/) or use one of the default language models found in [lib/common](../../lib/common).
2. Add the model as a bundled resource by placing it under the assets directory of your Android project (`src/main/assets/`).

### Word Metadata

Along with the segments, Falcon returns metadata for each transcribed word. Available metadata items are:

- **Start Time:** Indicates when the word started in the transcribed audio. Value is in seconds.
- **End Time:** Indicates when the word ended in the transcribed audio. Value is in seconds.
- **Speaker Tag:** A non-negative integer identifying unique speakers.

## Demo App

For example usage, refer to our [Android demo application](../../demo/android).
