# Falcon Speaker Diarization Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Falcon

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
pip3 install pvfalcondemo
```

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

### File Demo

Run the following in the terminal:

```console
falcon_demo_file --access_key ${ACCESS_KEY} --audio_paths ${AUDIO_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${AUDIO_PATH}` with a path to an audio file.

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
falcon_demo_mic --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console. Once running, the demo prints:

```console
>>> Press `ENTER` to start: 
```

Press `ENTER` key and wait for the following message in the terminal:

```console
>>> Recording ... Press `ENTER` to stop:
```

Now start recording and when done press `ENTER` key.