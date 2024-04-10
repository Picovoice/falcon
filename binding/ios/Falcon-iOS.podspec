Pod::Spec.new do |s|
  s.name = 'Falcon-iOS'
  s.module_name = 'Falcon'
  s.version = '1.0.0'
  s.license = {:type => 'Apache 2.0'}
  s.summary = 'iOS SDK for Picovoice\'s Falcon speaker diarization engine.'
  s.description =
  <<-DESC
  Falcon is an on-device speaker diarization engine.

  Falcon is:
    - private, all voice processing runs locally.
    - Accurate
    - compact and computationally-Efficient
    - cross-platform:
      - Linux (x86_64)
      - macOS (x86_64, arm64)
      - Windows (x86_64)
      - Android
      - iOS
      - Raspberry Pi (3, 4)
      - NVIDIA Jetson Nano
  DESC
  s.homepage = 'https://github.com/Picovoice/falcon/tree/main/binding/ios'
  s.author = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source = { :git => "https://github.com/Picovoice/falcon.git", :tag => "Falcon-iOS-v1.0.0" }
  s.ios.deployment_target = '13.0'
  s.swift_version = '5.0'
  s.vendored_frameworks = 'lib/ios/PvFalcon.xcframework'
  s.source_files = 'binding/ios/*.{swift}'
  s.exclude_files = 'binding/ios/FalconAppTest/**'
end
