# Falcon Binding for Web

## Falcon Speaker Diarization Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Falcon is an on-device speaker diarization engine. Falcon is:

- Private; All voice processing runs locally.
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64, arm64)
  - Raspberry Pi (3, 4, 5)
  - Chrome, Safari, Firefox, and Edge

## Compatibility

- Chrome / Edge
- Firefox
- Safari

## Requirements

The Falcon Web Binding uses [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

Include the following headers in the response to enable the use of `SharedArrayBuffers`:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Refer to our [Web demo](../../demo/web) for an example on creating a server with the corresponding response headers.

Browsers that don't support `SharedArrayBuffers` or applications that don't include the required headers will fall back to using standard `ArrayBuffers`. This will disable multithreaded processing.

### Restrictions

IndexedDB is required to use `Falcon` in a worker thread. Browsers without IndexedDB support
(i.e. Firefox Incognito Mode) should use `Falcon` in the main thread.

Multi-threading is only enabled for `Falcon` when using on a web worker.

## Installation

Using `yarn`:

```console
yarn add @picovoice/falcon-web
```

or using `npm`:

```console
npm install --save @picovoice/falcon-web
```

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

For the web packages, there are two methods to initialize Falcon.

### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches the model file from the public directory and feeds it to Falcon. Copy the model file into the public directory:

```console
cp ${FALCON_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

### Base64

**NOTE**: This method works without hosting a server, but increases the size of the model file roughly by 33%.

This method uses a base64 string of the model file and feeds it to Falcon. Use the built-in script `pvbase64` to
base64 your model file:

```console
npx pvbase64 -i ${FALCON_MODEL_FILE} -o ${OUTPUT_DIRECTORY}/${MODEL_NAME}.js
```

The output will be a js file which you can import into any file of your project. For detailed information about `pvbase64`,
run:

```console
npx pvbase64 -h
```

### Language Model

Falcon saves and caches your model file in IndexedDB to be used by WebAssembly. Use a different `customWritePath` variable
to hold multiple models and set the `forceWrite` value to true to force re-save a model file.

Either `base64` or `publicPath` must be set to instantiate Falcon. If both are set, Falcon will use the `base64` model.

```typescript
const falconModel = {
  publicPath: ${MODEL_RELATIVE_PATH},
  // or
  base64: ${MODEL_BASE64_STRING},

  // Optionals
  customWritePath: "falcon_model",
  forceWrite: false,
  version: 1,
}
```

### Initialize Falcon

Create an instance of `Falcon` in the main thread:

```typescript
const falcon = await Falcon.create(
  "${ACCESS_KEY}",
  falconModel
);
```

Or create an instance of `Falcon` in a worker thread:

```typescript
const falcon = await FalconWorker.create(
  "${ACCESS_KEY}",
  falconModel
);
```

### Process Audio Frames

The process result is an object with:
- `segments`: A list of objects containing a `startSec`, `endSec`, and `speakerTag`.
  - `startSec`: Indicates when the segment started. Value is in seconds.
  - `endSec`: Indicates when the segment ended. Value is in seconds.
  - `speakerTag`: A non-negative integer identifying unique speakers, with `0` reserved for unknown speakers.

```typescript
function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

const result = await falcon.process(getAudioData());
console.log(result.segments);
```

For processing using worker, you may consider transferring the buffer instead for performance:

```typescript
let pcm = new Int16Array();
const result = await falcon.process(pcm, {
  transfer: true,
  transferCallback: (data) => { pcm = data }
});
console.log(result.segments);
```

### Clean Up

Clean up used resources by `Falcon` or `FalconWorker`:

```typescript
await falcon.release();
```

Terminate `FalconWorker` instance:

```typescript
await falcon.terminate();
```

## Demo

For example usage refer to our [Web demo application](https://github.com/Picovoice/falcon/tree/main/demo/web).
