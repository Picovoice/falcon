# Falcon

[![GitHub release](https://img.shields.io/github/v/tag/Picovoice/falcon.svg)](https://github.com/Picovoice/falcon/releases)
[![GitHub](https://img.shields.io/github/license/Picovoice/falcon)](https://github.com/Picovoice/falcon/)

[![Maven Central](https://img.shields.io/maven-central/v/ai.picovoice/falcon-android?label=maven-central%20%5Bandroid%5D)](https://repo1.maven.org/maven2/ai/picovoice/falcon-android/)
[![CocoaPods](https://img.shields.io/cocoapods/v/Falcon-iOS)](https://cocoapods.org/pods/Falcon-iOS)<!-- markdown-link-check-disable-line -->
[![npm](https://img.shields.io/npm/v/@picovoice/falcon-web?label=npm%20%5Bweb%5D)](https://www.npmjs.com/package/@picovoice/falcon-web)
[![PyPI](https://img.shields.io/pypi/v/pvfalcon)](https://pypi.org/project/pvfalcon/)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

[![Twitter URL](https://img.shields.io/twitter/url?label=%40AiPicovoice&style=social&url=https%3A%2F%2Ftwitter.com%2FAiPicovoice)](https://twitter.com/AiPicovoice)<!-- markdown-link-check-disable-line -->
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UCAdi9sTCXLosG1XeqDwLx7w?label=YouTube&style=social)](https://www.youtube.com/channel/UCAdi9sTCXLosG1XeqDwLx7w)

Falcon is an on-device speaker diarization engine. Falcon is:

- Private; All voice processing runs locally.
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge

## Table of Contents

- [Falcon](#falcon)
  - [Table of Contents](#table-of-contents)
  - [What is Speaker Diarization?](#what-is-speaker-diarization)
  - [AccessKey](#accesskey)
  - [Demos](#demos)
    - [Python Demo](#python-demo)
    - [C Demo](#c-demo)
    - [Web Demo](#web-demo)
    - [iOS Demo](#ios-demo)
    - [Android Demo](#android-demo)
  - [SDKs](#sdks)
    - [Python](#python)
    - [C](#c)
    - [Web](#web)
    - [iOS](#iOS)
    - [Android](#android)
  - [Releases](#releases)
  - [FAQ](#faq)

## What is Speaker Diarization?

Speaker diarization, a fundamental step in automatic speech recognition and audio processing, focuses on identifying and
separating distinct speakers within an audio recording. Its objective is to divide the audio into segments while
precisely identifying the speakers and their respective speaking intervals.

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Falcon. Anyone who is
using Picovoice needs to have a valid AccessKey. You must keep your AccessKey secret. You would need internet
connectivity to validate your AccessKey with Picovoice license servers even though the speaker recognition is running
100% offline.

AccessKey also verifies that your usage is within the limits of your account. Everyone who signs up for
[Picovoice Console](https://console.picovoice.ai/) receives the `Free Tier` usage rights described
[here](https://picovoice.ai/pricing/). If you wish to increase your limits, you can purchase a subscription plan.

## Demos

### Python Demo

Install the demo package:

```console
pip3 install pvfalcondemo
```

Run the following in the terminal:

```console
falcon_demo_file --access_key ${ACCESS_KEY} --audio_paths ${AUDIO_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

For more information about Python demos go to [demo/python](./demo/python).

### C Demo

Build the demo:

```console
cmake -S demo/c/ -B demo/c/build && cmake --build demo/c/build
```

Run the demo:

```console
./demo/c/build/falcon_demo -a ${ACCESS_KEY} -l ${LIBRARY_PATH} -m ${MODEL_PATH} ${AUDIO_PATH}
```

### Web Demo

From [demo/web](demo/web) run the following in the terminal:

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

Open `http://localhost:5000` in your browser to try the demo.

### iOS Demo

To run the demo, go to [demo/ios/FalconDemo](./demo/ios/FalconDemo) and run:

```console
pod install
```

Replace `let accessKey = "${YOUR_ACCESS_KEY_HERE}"` in the file [ViewModel.swift](./demo/ios/FalconDemo/FalconDemo/ViewModel.swift) with your `AccessKey`.

Then, using [Xcode](https://developer.apple.com/xcode/), open the generated `FalconDemo.xcworkspace` and run the application.

### Android Demo

Using Android Studio, open [demo/android/FalconDemo](./demo/android/FalconDemo) as an Android project and then run the application.

Replace `"${YOUR_ACCESS_KEY_HERE}"` in the file [MainActivity.java](./demo/android/FalconDemo/falcon-demo-app/src/main/java/ai/picovoice/falcondemo/MainActivity.java) with your `AccessKey`.

## SDKs

### Python

Install the Python SDK:

```console
pip3 install pvfalcon
```

Create an instance of the engine and perform speaker diarization on an audio file:

```python
import pvfalcon

falcon = pvfalcon.create(access_key='${ACCESS_KEY}')

print(falcon.process_file('${AUDIO_PATH}'))
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/) and
`${AUDIO_PATH}` to path an audio file.

Finally, when done be sure to explicitly release the resources:

```python
falcon.delete()
```

### C

Create an instance of the engine and perform speaker diarization on an audio file:

```c
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include "pv_falcon.h"

pv_falcon_t *falcon = NULL;
pv_status_t status = pv_falcon_init("${ACCESS_KEY}", "${MODEL_PATH}", &falcon);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}

int32_t num_segments = 0;
pv_segment_t *segments = NULL;
status = pv_falcon_process_file(falcon, "${AUDIO_PATH}", &num_segments, &segments);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}

for (int32_t i = 0; i < num_segments; i++) {
    pv_segment_t *segment = &segments[i];
    fprintf(
            stdout,
            "Speaker: %d -> Start: %5.2f, End: %5.2f\n",
            segment->speaker_tag,
            segment->start_sec,
            segment->end_sec);
}

pv_falcon_segments_delete(segments);
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console, `${MODEL_PATH}` to path to
[default model file](./lib/common/falcon_params.pv) (or your custom one), and `${AUDIO_PATH}` to path an audio file.

Finally, when done be sure to release resources acquired:

```c
pv_falcon_delete(falcon);
```

### Web

Install the web SDK using yarn:

```console
yarn add @picovoice/falcon-web
```

or using npm:

```console
npm install --save @picovoice/falcon-web
```

Create an instance of the engine using `FalconWorker` and diarize an audio file:

```typescript
import { Falcon } from '@picovoice/falcon-web';
import falconParams from '${PATH_TO_BASE64_FALCON_PARAMS}';

function getAudioData(): Int16Array {
  // ... function to get audio data
  return new Int16Array();
}

const falcon = await FalconWorker.create('${ACCESS_KEY}', {
  base64: falconParams,
});

const { segments } = await falcon.process(getAudioData());
console.log(segments);
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). Finally, when done release the resources using `falcon.release()`.

### iOS

<!-- markdown-link-check-disable -->

The Falcon iOS binding is available via [CocoaPods](https://cocoapods.org/pods/Falcon-iOS). To import it into your iOS project, add the following line to your Podfile and run `pod install`:

<!-- markdown-link-check-enable -->

```ruby
pod 'Falcon-iOS'
```

Create an instance of the engine and perform speaker diarization on an audio_file:

```swift
import Falcon

let falcon = Falcon(accessKey: "${ACCESS_KEY}")

do {
    let audioPath = Bundle(for: type(of: self)).path(forResource: "${AUDIO_FILE_NAME}", ofType: "${AUDIO_FILE_EXTENSION}")
    let segments = falcon.process(audioPath)
} catch { }
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console, `${AUDIO_FILE_NAME}` with the name of the audio file and `${AUDIO_FILE_EXTENSION}` with the extension of the audio file.

### Android

To include the Falcon package in your Android project, ensure you have included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your app's `build.gradle`:

```groovy
dependencies {
    implementation 'ai.picovoice:falcon-android:${LATEST_VERSION}'
}
```

Create an instance of the engine and perform speaker diarization on an audio file:

```java
import ai.picovoice.falcon.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
try {
    Falcon falcon = new Falcon.Builder()
        .setAccessKey(accessKey)
        .build(appContext);

        File audioFile = new File("${AUDIO_FILE_PATH}");
        FalconSegment[] segments = falcon.processFile(audioFile.getAbsolutePath());

} catch (FalconException ex) { }
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console, and `${AUDIO_FILE_PATH}` with the path to the audio file.

Finally, when done make sure to explicitly release the resources:

```java
falcon.delete()
```

For more details, see the [Android SDK](./binding/android/README.md).

## Releases

### v1.0.0 — November 28th, 2023

- Initial release.

## FAQ

You can find the FAQ [here](https://picovoice.ai/docs/faq/general/).
