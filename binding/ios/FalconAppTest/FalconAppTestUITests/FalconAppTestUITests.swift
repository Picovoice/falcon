//
//  Copyright 2024 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import XCTest
import Falcon

extension String {
    subscript(index: Int) -> Character {
        return self[self.index(self.startIndex, offsetBy: index)]
    }
}

struct TestData: Decodable {
    var tests: Tests
}

struct Tests: Decodable {
    var diarization_tests: [DiarizationTest]
}

struct DiarizationTest: Decodable {
    var audio_file: String
    var segments: [DiarizationTestSegment]
}

struct DiarizationTestSegment: Decodable {
    var start_sec: Float
    var end_sec: Float
    var speaker_tag: Int
}

class FalconAppTestUITests: XCTestCase {
    let accessKey: String = ""

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func validateMetadata(segments: [FalconSegment], expectedSegments: [DiarizationTestSegment]) {
        XCTAssert(segments.count == expectedSegments.count)
        for i in 0..<segments.count {
            XCTAssert(abs(segments[i].startSec - expectedSegments[i].start_sec) < 0.01)
            XCTAssert(abs(segments[i].endSec - expectedSegments[i].end_sec) < 0.01)
            XCTAssert(segments[i].speakerTag == expectedSegments[i].speaker_tag)
        }
    }

    func runTestProcess(
            expectedSegments: [DiarizationTestSegment],
            testAudio: String) throws {
        let bundle = Bundle(for: type(of: self))
        let audioFileURL: URL = bundle.url(
                forResource: testAudio,
                withExtension: "",
                subdirectory: "test_resources/audio_samples")!

        do {
            let falcon = try? Falcon(accessKey: accessKey)
            
            let data = try Data(contentsOf: audioFileURL)
            var pcmBuffer = [Int16](repeating: 0, count: ((data.count - 44) / MemoryLayout<Int16>.size))
            _ = pcmBuffer.withUnsafeMutableBytes {
                data.copyBytes(to: $0, from: 44..<data.count)
            }

            let falconSegments = try falcon!.process(pcmBuffer)
            falcon!.delete()

            validateMetadata(
                segments: falconSegments,
                expectedSegments: expectedSegments)
        } catch {
            NSLog("\(error.localizedDescription)")
        }
    }

    func runTestProcessFile(
            expectedSegments: [DiarizationTestSegment],
            testAudio: String) throws {
        let bundle = Bundle(for: type(of: self))

        let falcon = try? Falcon(accessKey: accessKey)

        let audioFilePath: String = bundle.path(
                forResource: testAudio,
                ofType: "",
                inDirectory: "test_resources/audio_samples")!
        let falconSegments = try falcon!.processFile(audioFilePath)
        falcon!.delete()

        validateMetadata(
            segments: falconSegments,
            expectedSegments: expectedSegments)
    }

    func runTestProcessURL(
            expectedSegments: [DiarizationTestSegment],
            testAudio: String) throws {
        let bundle = Bundle(for: type(of: self))
        let audioFileURL: URL = bundle.url(
                forResource: testAudio,
                withExtension: "",
                subdirectory: "test_resources/audio_samples")!

        let falcon = try? Falcon(accessKey: accessKey)

        let falconSegments = try falcon!.processFile(audioFileURL)
        falcon!.delete()

        validateMetadata(
            segments: falconSegments,
            expectedSegments: expectedSegments)
    }

    func testProcess() throws {
        let bundle = Bundle(for: type(of: self))
        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!
        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.diarization_tests {
            try XCTContext.runActivity(named: "testCase") { _ in
                try runTestProcess(
                        expectedSegments: testCase.segments,
                        testAudio: testCase.audio_file)
            }
        }
    }

    func testProcessFile() throws {
        let bundle = Bundle(for: type(of: self))
        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!
        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.diarization_tests {
            try XCTContext.runActivity(named: "testCase") { _ in
                try runTestProcessFile(
                        expectedSegments: testCase.segments,
                        testAudio: testCase.audio_file)
            }
        }
    }

    func testProcessURL() throws {
        let bundle = Bundle(for: type(of: self))
        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!
        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.diarization_tests {
            try XCTContext.runActivity(named: "testCase") { _ in
                try runTestProcessURL(
                        expectedSegments: testCase.segments,
                        testAudio: testCase.audio_file)
            }
        }
    }

    // func testDiarizationMultipleSpeakers() throws {
    //     let bundle = Bundle(for: type(of: self))
    //     let testDataJsonUrl = bundle.url(
    //         forResource: "test_data",
    //         withExtension: "json",
    //         subdirectory: "test_resources")!
    //     let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
    //     let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

    //     for testCase in testData.tests.diarization_tests {
    //         try XCTContext.runActivity(named: "testCase") { _ in
    //             let falcon = try? Falcon(accessKey: accessKey)

    //             let audioFilePath: String = bundle.path(
    //                 forResource: testCase.audio_file,
    //                 ofType: "",
    //                 inDirectory: "test_resources/audio_samples")!
    //             let segments = try falcon!.processFile(audioFilePath)
    //             falcon!.delete()

    //             XCTAssert(segments.count == testCase.segments.count)
    //             for i in 0..<segments.count {
    //                 XCTAssert(segments[i].startSec == testCase.segments[i].start_sec)
    //                 XCTAssert(segments[i].endSec == testCase.segments[i].end_sec)
    //                 XCTAssert(segments[i].speakerTag == testCase.segments[i].speaker_tag)
    //             }
    //         }
    //     }
    // }

    func testVersion() throws {
        XCTAssertGreaterThan(Falcon.version, "")
    }

    func testSampleRate() throws {
        XCTAssertGreaterThan(Falcon.sampleRate, 0)
    }

    func testMessageStack() throws {
        let bundle = Bundle(for: type(of: self))

        var first_error: String = ""
        do {
            let falcon = try Falcon.init(accessKey: "invalid")
            XCTAssertNil(falcon)
        } catch {
            first_error = "\(error.localizedDescription)"
            XCTAssert(first_error.count < 1024)
        }

        do {
            let falcon = try Falcon.init(accessKey: "invalid")
            XCTAssertNil(falcon)
        } catch {
            XCTAssert("\(error.localizedDescription)".count == first_error.count)
        }
    }

    func testProcessMessageStack() throws {
        let bundle = Bundle(for: type(of: self))

        let falcon = try Falcon.init(accessKey: accessKey)
        falcon.delete()

        var testPcm: [Int16] = []
        testPcm.reserveCapacity(512)

        do {
            let result = try falcon.process(testPcm)
            XCTAssertNil(result)
        } catch {
            XCTAssert("\(error.localizedDescription)".count > 0)
        }
    }
}
