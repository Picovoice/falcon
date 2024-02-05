# Falcon

[![GitHub release](https://img.shields.io/github/v/tag/Picovoice/falcon.svg)](https://github.com/Picovoice/falcon/releases)
[![GitHub](https://img.shields.io/github/license/Picovoice/falcon)](https://github.com/Picovoice/falcon/)

[![PyPI](https://img.shields.io/pypi/v/pvfalcon)](https://pypi.org/project/pvfalcon/)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

<!-- markdown-link-check-disable -->
[![Twitter URL](https://img.shields.io/twitter/url?label=%40AiPicovoice&style=social&url=https%3A%2F%2Ftwitter.com%2FAiPicovoice)](https://twitter.com/AiPicovoice)
<!-- markdown-link-check-enable -->
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UCAdi9sTCXLosG1XeqDwLx7w?label=YouTube&style=social)](https://www.youtube.com/channel/UCAdi9sTCXLosG1XeqDwLx7w)

Falcon is an on-device speaker diarization engine. Falcon is:

- Private; All voice processing runs locally.
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
    - Raspberry Pi (5, 4, 3) and NVIDIA Jetson Nano
    - Chrome, Safari, Firefox, and Edge

## Table of Contents

- [Falcon](#falcon)
  - [Table of Contents](#table-of-contents)
  - [What is Speaker Diarization?](#what-is-speaker-diarization)
  - [AccessKey](#accesskey)
  - [Demos](#demos)
    - [Python Demos](#python-demos)
    - [C Demos](#c-demos)
    - [Web Demos](#web-demos)
  - [SDKs](#sdks)
    - [Python](#python)
    - [C](#c)
    - [Web](#web)
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

### Python Demos

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

### C Demos

Build the demo:

```console
cmake -S demo/c/ -B demo/c/build && cmake --build demo/c/build
```

Run the demo:

```console
./demo/c/build/falcon_demo -a ${ACCESS_KEY} -l ${LIBRARY_PATH} -m ${MODEL_PATH} ${AUDIO_PATH}
```

### Web Demos

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
import { Falcon } from "@picovoice/falcon-web";
import falconParams from "${PATH_TO_BASE64_FALCON_PARAMS}";

function getAudioData(): Int16Array {
  // ... function to get audio data
  return new Int16Array();
}

const falcon = await FalconWorker.create(
  "${ACCESS_KEY}",
  { base64: falconParams }
);

const { segments } = await falcon.process(getAudioData());
console.log(segments);
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). Finally, when done release the resources using `falcon.release()`.

## Releases

### v1.0.0 — November 28th, 2023

- Initial release.

## FAQ

You can find the FAQ [here](https://picovoice.ai/docs/faq/general/).
