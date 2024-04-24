//
//  Copyright 2024 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import SwiftUI

struct ContentView: View {
    @StateObject var viewModel = ViewModel()

    let activeBlue = Color(red: 55 / 255, green: 125 / 255, blue: 1, opacity: 1)
    let dangerRed = Color(red: 1, green: 14 / 255, blue: 14 / 255, opacity: 1)
    let navyBlue = Color(red: 37 / 255, green: 24 / 255, blue: 126 / 255, opacity: 1)

    var body: some View {
        let interactionDisabled =
            !viewModel.errorMessage.isEmpty || viewModel.state == UIState.PROCESSING
            || viewModel.state == UIState.INIT
        GeometryReader { metrics in
            VStack(spacing: 10) {
                HStack {
                    Text("Start")
                        .font(.system(size: 14.0))
                        .frame(minWidth: metrics.size.width * 0.15, alignment: .center)
                    Text("End")
                        .font(.system(size: 14.0))
                        .frame(minWidth: metrics.size.width * 0.15, alignment: .center)
                    Text("Speaker Tag")
                        .font(.system(size: 14.0))
                        .frame(minWidth: metrics.size.width * 0.15, alignment: .center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 10)
                .opacity(viewModel.state == UIState.DIARIZED ? 1 : 0)
                ScrollView {
                    VStack {
                        ForEach(viewModel.segments, id: \.startSec) { segment in
                            HStack {
                                Text(String(format: "%.1fs", segment.startSec))
                                    .frame(minWidth: metrics.size.width * 0.15, alignment: .center)
                                    .foregroundColor(.white)
                                    .font(.system(size: 14.0))
                                    .padding(6)
                                Text(String(format: "%.1fs", segment.endSec))
                                    .frame(minWidth: metrics.size.width * 0.15, alignment: .center)
                                    .foregroundColor(.white)
                                    .font(.system(size: 14.0))
                                    .padding(6)
                                Text(String("\(segment.speakerTag)"))
                                    .frame(minWidth: metrics.size.width * 0.15, alignment: .center)
                                    .foregroundColor(.white)
                                    .font(.system(size: 14.0))
                                    .padding(6)
                            }
                            .background(
                                Color(red: 0, green: 229 / 255, blue: 195 / 255, opacity: 0.1)
                            )
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                }
                .background(navyBlue)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .opacity(viewModel.state == UIState.DIARIZED ? 1 : 0)

                if viewModel.state == .INIT || viewModel.state == .READY {
                    Text("Start by recording some audio to perform speaker diarization on")
                        .padding()
                        .font(.body)
                        .foregroundColor(Color.black)
                } else if viewModel.state == .PROCESSING {
                    Text("Processing audio...")
                        .padding()
                        .font(.body)
                        .foregroundColor(Color.black)
                } else if viewModel.state == .RECORDING {
                    Text(
                        String(
                            format: "Recording : %.1f / 120 (seconds)", viewModel.recordingTimeSec)
                    )
                    .padding()
                    .font(.body)
                    .foregroundColor(Color.black)
                } else if viewModel.state == .DIARIZED {
                    Text(
                        String(
                            format: "Processed %.1f(s) of audio in %.1f(s).",
                            viewModel.recordingTimeSec,
                            viewModel.diarizationTimeSec)
                    )
                    .padding()
                    .font(.body)
                    .foregroundColor(Color.black)
                } else {
                    Text(viewModel.errorMessage)
                        .padding()
                        .foregroundColor(Color.white)
                        .frame(maxWidth: .infinity)
                        .background(dangerRed)
                        .font(.body)
                        .opacity(viewModel.errorMessage.isEmpty ? 0 : 1)
                        .cornerRadius(10)
                }

                Button(action: {
                    viewModel.toggleRecording()
                },
                label: {
                    Text(viewModel.state == .RECORDING ? "STOP" : "START")
                        .padding()
                        .background(interactionDisabled ? Color.gray : activeBlue)
                        .foregroundColor(Color.white)
                        .font(.largeTitle)
                })
                .disabled(interactionDisabled)
            }
            .onReceive(
                NotificationCenter.default.publisher(
                    for: UIApplication.willEnterForegroundNotification),
                perform: { _ in
                    viewModel.initialize()
                }
            )
            .onReceive(
                NotificationCenter.default.publisher(
                    for: UIApplication.didEnterBackgroundNotification),
                perform: { _ in
                    viewModel.destroy()
                }
            )
            .padding()
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0)
            .background(Color.white)

        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
