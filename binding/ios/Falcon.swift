//
//  Copyright 2024 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation
import PvFalcon

public struct FalconSegment {

    /// Start of segment in seconds.
    public let startSec: Float

    /// End of segment in seconds.
    public let endSec: Float

    /// The speaker tag is a non-negative integer identifying unique speakers.
    public let speakerTag: Int

    /// Constructor.
    ///
    /// - Parameters:
    ///   - startSec: Start of segment in seconds.
    ///   - endSec: End of segment in seconds.
    ///   - speakerTag: The speaker tag is a non-negative integer identifying unique speakers.
    public init(
        startSec: Float,
        endSec: Float,
        speakerTag: Int) {
        self.startSec = startSec
        self.endSec = endSec
        self.speakerTag = speakerTag
    }
}

/// iOS binding for Falcon speaker diarization engine. Provides a Swift interface to the Falcon library.
public class Falcon {
    private static let supportedAudioTypes: Set = [
        "3gp",
        "flac",
        "m4a",
        "mp3",
        "mp4",
        "ogg",
        "opus",
        "vorbis",
        "wav",
        "webm"
    ]

    private var handle: OpaquePointer?

    public static let sampleRate = UInt32(pv_sample_rate())
    public static let version = String(cString: pv_falcon_version())
    private static var sdk = "ios"

    public static func setSdk(sdk: String) {
        self.sdk = sdk
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: The AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - modelPath: Absolute path to file containing model parameters.
    /// - Throws: FalconError
    public init(accessKey: String, modelPath: String? = nil) throws {

        if accessKey.count == 0 {
            throw FalconInvalidArgumentError("AccessKey is required for Falcon initialization")
        }

        var modelPathArg = modelPath

        if modelPath == nil {

#if SWIFT_PACKAGE

            if let bundleURL = Bundle.module.url(forResource: "falcon_params", withExtension: "pv") {
                modelPathArg = bundleURL.path
            } else {
                throw FalconIOError("Could not retrieve default model from the package bundle")
            }

            let bundle = Bundle(for: type(of: self))

#else

            modelPathArg = bundle.path(forResource: "falcon_params", ofType: "pv")
            if modelPathArg == nil {
                throw FalconIOError("Could not retrieve default model from app bundle")
            }

#endif

        }

        if !FileManager().fileExists(atPath: modelPathArg!) {
            modelPathArg = try self.getResourcePath(modelPathArg!)
        }

        pv_set_sdk(Falcon.sdk)

        let status = pv_falcon_init(
                accessKey,
                modelPathArg,
                &handle)

        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToFalconError(status, "Falcon init failed", messageStack)
        }
    }

    deinit {
        self.delete()
    }

    /// Releases native resources that were allocated to Falcon
    public func delete() {
        if handle != nil {
            pv_falcon_delete(handle)
            handle = nil
        }
    }

    /// Processes the given audio data and returns the speaker segments.
    ///
    /// - Parameters:
    ///   - pcm: An array of 16-bit pcm samples. The audio needs to have a sample rate equal to `.sample_rate`
    ///          and be 16-bit linearly-encoded. This function operates on single-channel audio.
    ///          If you wish to process data in a different sample rate or format consider using `.process_file`.
    /// - Throws: FalconError
    /// - Returns: Sequence of speaker segments with their associated metadata.
    public func process(_ pcm: [Int16]) throws -> ([FalconSegment]) {
        if handle == nil {
            throw FalconInvalidStateError("Falcon must be initialized before processing")
        }

        if pcm.count == 0 {
            throw FalconInvalidArgumentError("Audio data must not be empty")
        }

        var numSegments: Int32 = 0
        var cSegments: UnsafeMutablePointer<pv_segment_t>?
        let status = pv_falcon_process(
                self.handle,
                pcm,
                Int32(pcm.count),
                &numSegments,
                &cSegments)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToFalconError(status, "Falcon process failed", messageStack)
        }

        var segments = [FalconSegment]()
        if numSegments > 0 {
            for cSegment in UnsafeBufferPointer(start: cSegments, count: Int(numSegments)) {
                let segment = FalconSegment(
                        startSec: Float(cSegment.start_sec),
                        endSec: Float(cSegment.end_sec),
                        speakerTag: Int(cSegment.speaker_tag)
                )
                segments.append(segment)
            }
            pv_falcon_segments_delete(cSegments)
        }

        return segments
    }

    /// Processes a given audio file and returns the speaker segments.
    ///
    /// - Parameters:
    ///   - audioPath: Absolute path to the audio file. The supported formats are:
    ///                `3gp (AMR)`, `FLAC`, `MP3`, `MP4/m4a (AAC)`, `Ogg`, `WAV` and `WebM`.
    /// - Throws: FalconError
    /// - Returns: Sequence of speaker segments with their associated metadata.
    public func processFile(_ audioPath: String) throws -> ([FalconSegment]) {
        if handle == nil {
            throw FalconInvalidStateError("Falcon must be initialized before processing")
        }

        var audioPathArg = audioPath
        if !FileManager().fileExists(atPath: audioPathArg) {
            audioPathArg = try getResourcePath(audioPathArg)
        }

        var numSegments: Int32 = 0
        var cSegments: UnsafeMutablePointer<pv_segment_t>?
        let status = pv_falcon_process_file(
                self.handle,
                audioPathArg,
                &numSegments,
                &cSegments)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToFalconError(status, "Falcon process file failed", messageStack)
        }

        var segments = [FalconSegment]()
        if numSegments > 0 {
            for cSegment in UnsafeBufferPointer(start: cSegments, count: Int(numSegments)) {
                let segment = FalconSegment(
                        startSec: Float(cSegment.start_sec),
                        endSec: Float(cSegment.end_sec),
                        speakerTag: Int(cSegment.speaker_tag)
                )
                segments.append(segment)
            }
            pv_falcon_segments_delete(cSegments)
        }

        return segments
    }

    /// Processes a given audio file and returns the speaker segments.
    ///
    /// - Parameters:
    ///   - audioURL: URL to the audio file. The supported formats are:
    ///              `3gp (AMR)`, `FLAC`, `MP3`, `MP4/m4a (AAC)`, `Ogg`, `WAV` and `WebM`.
    /// - Throws: FalconError
    /// - Returns: Sequence of speaker segments with their associated metadata.
    public func processFile(_ audioURL: URL) throws -> ([FalconSegment]) {
        if handle == nil {
            throw FalconInvalidStateError("Falcon must be initialized before processing")
        }

        return try self.processFile(audioURL.path)
    }

    /// Given a path, return the full path to the resource.
    ///
    /// - Parameters:
    ///   - filePath: relative path of a file in the bundle.
    /// - Throws: FalconIOError
    /// - Returns: The full path of the resource.
    private func getResourcePath(_ filePath: String) throws -> String {
        if let resourcePath = Bundle(for: type(of: self)).resourceURL?.appendingPathComponent(filePath).path {
            if FileManager.default.fileExists(atPath: resourcePath) {
                return resourcePath
            }
        }

        throw FalconIOError("Could not find file at path '\(filePath)'. " +
                "If this is a packaged asset, ensure you have added it to your xcode project.")
    }

    private func pvStatusToFalconError(
        _ status: pv_status_t,
        _ message: String,
        _ messageStack: [String] = []) -> FalconError {
        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            return FalconMemoryError(message, messageStack)
        case PV_STATUS_IO_ERROR:
            return FalconIOError(message, messageStack)
        case PV_STATUS_INVALID_ARGUMENT:
            return FalconInvalidArgumentError(message, messageStack)
        case PV_STATUS_STOP_ITERATION:
            return FalconStopIterationError(message, messageStack)
        case PV_STATUS_KEY_ERROR:
            return FalconKeyError(message, messageStack)
        case PV_STATUS_INVALID_STATE:
            return FalconInvalidStateError(message, messageStack)
        case PV_STATUS_RUNTIME_ERROR:
            return FalconRuntimeError(message, messageStack)
        case PV_STATUS_ACTIVATION_ERROR:
            return FalconActivationError(message, messageStack)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            return FalconActivationLimitError(message, messageStack)
        case PV_STATUS_ACTIVATION_THROTTLED:
            return FalconActivationThrottledError(message, messageStack)
        case PV_STATUS_ACTIVATION_REFUSED:
            return FalconActivationRefusedError(message, messageStack)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
            return FalconError("\(pvStatusString): \(message)", messageStack)
        }
    }

    private func getMessageStack() throws -> [String] {
        var messageStackRef: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var messageStackDepth: Int32 = 0
        let status = pv_get_error_stack(&messageStackRef, &messageStackDepth)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToFalconError(status, "Unable to get Falcon error state")
        }

        var messageStack: [String] = []
        for i in 0..<messageStackDepth {
            messageStack.append(String(cString: messageStackRef!.advanced(by: Int(i)).pointee!))
        }

        pv_free_error_stack(messageStackRef)

        return messageStack
    }
}
