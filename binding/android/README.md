# Falcon Binding for Android

## Falcon Speaker Diarization Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Falcon is an on-device speaker diarization engine. Falcon is:

- Private; All voice processing runs locally.
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
    - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

- Android 5.0+ (SDK 21+)

## Installation

Falcon can be found on Maven Central. To include the package in your Android project, ensure you have
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
Signup or login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Permissions

To enable AccessKey validation and recording with your Android device's microphone, you must add the following line to your `AndroidManifest.xml` file:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Usage

Create an instance of the engine with the Falcon Builder class by passing in the `accessKey` and Android app context:

```java
import ai.picovoice.falcon.*;

final String accessKey = "${ACCESS_KEY}";

try {
    Falcon falcon = new Falcon.Builder()
        .setAccessKey(accessKey)
        .build(appContext);
} catch (FalconException ex) { }
```

Perform diarization on an audio file by providing the absolute path to the file:

```java
File audioFile = new File("${AUDIO_FILE_PATH}");
FalconSegments segments = falcon.processFile(audioFile.getAbsolutePath());
```

Perform diarization on raw audio data (sample rate of 16 kHz, 16-bit linearly encoded and 1 channel):

```java
short[] getAudioData() {
    // ...
}
FalconSegments segments = falcon.process(getAudioData());
```

The return value `segments` represents an array of segments, each with the following metadata items:

- **Start Time:** Indicates when the segment started in the audio. Value is in seconds.
- **End Time:** Indicates when the segment ended in the audio. Value is in seconds.
- **Speaker Tag:** A non-negative integer identifying unique speakers.

When done, release resources explicitly:

```java
falcon.delete();
```

## Demo App

For example usage, refer to our [Android demo application](../../demo/android).
