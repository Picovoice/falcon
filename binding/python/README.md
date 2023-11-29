# Falcon Binding for Python

## Falcon Speaker Diarization Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Falcon is an on-device speaker diarization engine. Falcon is:

- Private; All voice processing runs locally.
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Raspberry Pi (4, 3) and NVIDIA Jetson Nano

## Compatibility

- Python 3.7+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (4, 3), and NVIDIA Jetson Nano.

## Installation

```console
pip3 install pvfalcon
```

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### Usage

Create an instance of the engine and perform speaker diarization on an audio file:

```python
import pvfalcon

handle = pvfalcon.create(access_key='${ACCESS_KEY}')

segments = handle.process_file('${AUDIO_PATH}')
for segment in segments:
    print("{speaker tag=%d - start_sec=%.2f end_sec=%.2f}" 
          % (segment.speaker_tag, segment.start_sec, segment.end_sec))
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/) and
`${AUDIO_PATH}` to the path an audio file. Finally, when done be sure to explicitly release the resources using
`handle.delete()`.

## Demos

[pvfalcondemo](https://pypi.org/project/pvfalcondemo/) provides command-line utilities for processing audio using
Falcon.
