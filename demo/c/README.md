# C Demo

## Compatibility

- C99-compatible compiler

## Requirements

- [CMake](https://cmake.org/) version 3.13 or higher
- [MinGW](https://mingw-w64.org/) (**Windows Only**)

## AccessKey

Falcon requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Falcon SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

### Build Linux/MacOS

Build the demo by running this from the root of the repository:

```console
cmake -S demo/c/ -B demo/c/build
cmake --build demo/c/build
```

### Build Windows

Build the demo by running this from the root of the repository:

```console
cmake -S demo/c/ -B demo/c/build -G "MinGW Makefiles"
cmake --build demo/c/build
```

### Run

Running the demo without arguments prints the usage:

```console
usage: -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH [-d] [-v] audio_path0 audio_path1 ...
```

Run the command corresponding to your platform from the root of the repository. Replace `${ACCESS_KEY}` with yours
obtained from [Picovoice Console](https://console.picovoice.ai/) and `${AUDIO_PATH}` with the path to an audio file.
