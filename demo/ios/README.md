# Falcon iOS Demo

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Setup

1. Before building the demo app, run the following from this directory to install the Falcon CocoaPod and other dependencies:
```console
pod install
```

2. Replace `"YOUR_ACCESS_KEY_HERE"` inside [`ViewModel.swift`](FalconDemo/FalconDemo/ViewModel.swift) with
your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/).

## Usage

Open the FalconDemo Xcode project (.xcworkspace) and build. Launch the demo on a simulator or a physical iOS device.
