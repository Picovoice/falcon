//
//  Copyright 2024 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation
import XCTest

import Falcon

class PerformanceTest: XCTestCase {
    let accessKey: String = ""
    let iterationString: String = "1"
    let initThresholdString: String = "1"
    let procThresholdString: String = "1"

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func testInitPerformance() throws {
        try XCTSkipIf(initThresholdString == "{INIT_PERFORMANCE_THRESHOLD_SEC}")

        let numTestIterations = Int(iterationString) ?? 30
        let initPerformanceThresholdSec = Double(initThresholdString)
        try XCTSkipIf(initPerformanceThresholdSec == nil)

        let bundle = Bundle(for: type(of: self))

        var results: [Double] = []
        for i in 0...numTestIterations {
            var totalNSec = 0.0

            let before = CFAbsoluteTimeGetCurrent()
            let falcon = try? Falcon(accessKey: accessKey)
            let after = CFAbsoluteTimeGetCurrent()
            totalNSec += (after - before)

            // throw away first run to account for cold start
            if i > 0 {
                results.append(totalNSec)
            }
            falcon?.delete()
        }

        let avgNSec = results.reduce(0.0, +) / Double(numTestIterations)
        let avgSec = Double(round(avgNSec * 1000) / 1000)
        XCTAssertLessThanOrEqual(avgSec, initPerformanceThresholdSec!)
    }

    func testProcessPerformance() throws {
        try XCTSkipIf(procThresholdString == "{PROC_PERFORMANCE_THRESHOLD_SEC}")

        let numTestIterations = Int(iterationString) ?? 30
        let procPerformanceThresholdSec = Double(procThresholdString)
        try XCTSkipIf(procPerformanceThresholdSec == nil)

        let bundle = Bundle(for: type(of: self))
        let falcon = try? Falcon(accessKey: accessKey)

        let filePath: String = bundle.path(forResource: "test", ofType: "wav")!

        var results: [Double] = []
        for i in 0...numTestIterations {
            var totalNSec = 0.0

            let before = CFAbsoluteTimeGetCurrent()
            try falcon?.processFile(filePath)
            let after = CFAbsoluteTimeGetCurrent()
            totalNSec += (after - before)

            // throw away first run to account for cold start
            if i > 0 {
                results.append(totalNSec)
            }
        }
        falcon?.delete()

        let avgNSec = results.reduce(0.0, +) / Double(numTestIterations)
        let avgSec = Double(round(avgNSec * 1000) / 1000)
        XCTAssertLessThanOrEqual(avgSec, procPerformanceThresholdSec!)
    }
}