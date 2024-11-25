Pod::Spec.new do |s|
  s.name = 'Falcon-iOS'
  s.module_name = 'Falcon'
  s.version = '1.0.1'
  s.license = {:type => 'Apache 2.0'}
  s.summary = 'iOS SDK for Picovoice\'s Falcon speaker diarization engine.'
  s.description =
  <<-DESC
  Falcon is an on-device speaker diarization engine that identifies speakers
  in an audio stream by finding speaker change points and grouping speech segments
  based on speaker voice characteristics.
  DESC
  s.homepage = 'https://github.com/Picovoice/falcon/tree/main/binding/ios'
  s.author = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source = { :git => "https://github.com/Picovoice/falcon.git", :tag => s.version.to_s }
  s.ios.deployment_target = '13.0'
  s.swift_version = '5.0'
  s.vendored_frameworks = 'lib/ios/PvFalcon.xcframework'
  s.resources = 'lib/common/falcon_params.pv'
  s.source_files = 'binding/ios/*.{swift}'
  s.exclude_files = 'binding/ios/FalconTestApp/**'
end
