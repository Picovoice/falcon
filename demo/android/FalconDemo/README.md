# Falcon Demo

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Setup

Replace `"${YOUR_ACCESS_KEY_HERE}"` inside [MainActivity.java](falcon-demo-app/src/main/java/ai/picovoice/falcondemo/MainActivity.java)
with your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/).

1. Open the project in Android Studio
2. Build and run on an installed simulator or a connected Android device

## Usage

1. Press the record button.
2. Start talking. Record some phrases or whatever audio you would like perform diarization on.
3. Press stop. Wait for the info box to display "Diarized...". This may take a few seconds.
4. The diarized segments will appear in the textbox above.

## Running the Instrumented Unit Tests

Ensure you have an Android device connected or simulator running. Then run the following from the terminal:

```console
cd demo/android/FalconDemo
./gradlew connectedAndroidTest -PpvTestingAccessKey="YOUR_ACCESS_KEY_HERE"
```
