//
//  Copyright 2024 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import Foundation
import Falcon

enum UIState {
    case INIT
    case READY
    case RECORDING
    case PROCESSING
    case DIARIZED
    case ERROR
}

class ViewModel: ObservableObject {
    private let ACCESS_KEY = "{YOUR_ACCESS_KEY_HERE}" // Obtained from Picovoice Console (https://console.picovoice.ai)

    private var falcon: Falcon!

    private var recordingTimer = Timer()
    private var audioRecorder: AVAudioRecorder!
    private var isListening = false
    private let MAX_RECORDING_LENGTH_SEC = 120.0

    @Published var errorMessage = ""
    @Published var state = UIState.INIT
    @Published var segments: [FalconSegment] = []
    @Published var recordingTimeSec = 0.0
    @Published var diarizationTimeSec = 0.0

    init() {
        initialize()
    }

    public func initialize() {
        state = UIState.INIT
        do {
            try falcon = Falcon(accessKey: ACCESS_KEY)
            state = UIState.READY
        } catch let error as FalconInvalidArgumentError {
            errorMessage = "\(error.localizedDescription)\nEnsure your AccessKey '\(ACCESS_KEY)' is valid."
        } catch is FalconActivationError {
            errorMessage = "ACCESS_KEY activation error"
        } catch is FalconActivationRefusedError {
            errorMessage = "ACCESS_KEY activation refused"
        } catch is FalconActivationLimitError {
            errorMessage = "ACCESS_KEY reached its limit"
        } catch is FalconActivationThrottledError {
            errorMessage = "ACCESS_KEY is throttled"
        } catch {
            errorMessage = "\(error)"
        }
    }

    public func destroy() {
        if isListening {
            try? stop()
            recordingTimer.invalidate()
        }
        falcon.delete()
    }

    public func toggleRecording() {
        if isListening {
            toggleRecordingOff()
        } else {
            toggleRecordingOn()
        }
    }

    public func toggleRecordingOff() {
        recordingTimer.invalidate()
        state = UIState.PROCESSING

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.01) {
            do {
                try self.stop()
                self.state = UIState.DIARIZED
            } catch {
                self.errorMessage = "\(error.localizedDescription)"
                self.state = UIState.ERROR
            }
        }
    }

    public func toggleRecordingOn() {
        recordingTimeSec = 0
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            self.recordingTimeSec += 0.1
            if self.recordingTimeSec >= self.MAX_RECORDING_LENGTH_SEC {
                self.toggleRecordingOff()
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.01) {
            do {
                try self.start()
                self.state = UIState.RECORDING
            } catch {
                self.errorMessage = "\(error.localizedDescription)"
                self.state = UIState.ERROR
            }
        }
    }

    public func start() throws {
        guard !isListening else {
            return
        }

        let audioSession = AVAudioSession.sharedInstance()
        if audioSession.recordPermission == .denied {
            errorMessage = "Recording permission is required for this demo"
            state = UIState.ERROR
            return
        }

        try audioSession.setActive(true)
        try audioSession.setCategory(AVAudioSession.Category.playAndRecord,
                options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth])

        let documentPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let audioFilename = documentPath.appendingPathComponent("FalconDemo.wav")

        var formatDescription = AudioStreamBasicDescription(
                mSampleRate: Float64(Falcon.sampleRate),
                mFormatID: kAudioFormatLinearPCM,
                mFormatFlags: kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked,
                mBytesPerPacket: 2,
                mFramesPerPacket: 1,
                mBytesPerFrame: 2,
                mChannelsPerFrame: 1,
                mBitsPerChannel: 16,
                mReserved: 0)
        let format = AVAudioFormat(streamDescription: &formatDescription)!

        audioRecorder = try AVAudioRecorder(url: audioFilename, format: format)
        audioRecorder.record()
        isListening = true
    }

    public func stop() throws {
        guard isListening else {
            return
        }

        audioRecorder.stop()
        isListening = false

        let fileManager = FileManager.default
        let documentDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let directoryContents = try fileManager.contentsOfDirectory(
                at: documentDirectory,
                includingPropertiesForKeys: nil)

        let path = directoryContents[0].path

        let begin = clock()
        let falconSegments = try falcon.processFile(path)
        segments = falconSegments
        diarizationTimeSec = Double(clock() - begin) / Double(CLOCKS_PER_SEC)
    }

}
