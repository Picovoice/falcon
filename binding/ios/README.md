# Falcon Binding for iOS

## Falcon Speaker Diarization Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Falcon is an on-device speaker diarization engine. Falcon is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/speaker-diarization/#accuracy)
- [Compact and Computationally-Efficient](https://picovoice.ai/docs/benchmark/speaker-diarization/#resource-utilization)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4) and NVIDIA Jetson Nano

## Installation

<!-- markdown-link-check-disable -->
The Falcon iOS binding is available via [CocoaPods](https://cocoapods.org/pods/Falcon-iOS). To import it into your iOS project, add the following line to your Podfile:
<!-- markdown-link-check-enable -->
```ruby
pod 'Falcon-iOS'
```

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine:

```swift
import Falcon

let accessKey = "${ACCESS_KEY}" // AccessKey obtained from https://console.picovoice.ai/access_key
let falcon = Falcon(accessKey: accessKey)
```

Perform diarization on an audio file either by passing the absolute path or an url to the file:

```swift

do {
    let audioPath = Bundle(for: type(of: self)).path(forResource: "${AUDIO_FILE_NAME}", ofType: "${AUDIO_FILE_EXTENSION}")
    var segments = falcon.process_file(audioPath)
    print(segments)

    let audioURL = Bundle(for: type(of: self)).url(forResource: "${AUDIO_FILE_NAME}", withExtension: "${AUDIO_FILE_EXTENSION}")
    segments = falcon.process_file(audioURL)
    print(segments)
} catch let error as FalconError {
    // handle error
} catch { }
```

The return value `segments` represents an array of segments, each with the following metadata items:

- **Start Time:** Indicates when the segment started in the given audio. Value is in seconds.
- **End Time:** Indicates when the segment ended in the given audio. Value is in seconds.
- **Speaker Tag:** A non-negative integer identifying unique speakers.

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/), `${AUDIO_FILE_NAME}` with the name of the audio file and `${AUDIO_FILE_EXTENSION}` with the extension of the audio file. Finally, when done be sure to explicitly release the resources using `falcon.delete()`.

## Running Unit Tests

Copy your `AccessKey` into the `accessKey` variable in [`FalconAppTestUITests.swift`](FalconAppTest/FalconAppTestUITests/FalconAppTestUITests.swift). Open `FalconAppTest.xcworkspace` with XCode and run the tests with `Product > Test`.

## Demo App

For example usage refer to our [iOS demo application](../../demo/ios).
