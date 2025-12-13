// swift-tools-version:5.7
import PackageDescription
let package = Package(
    name: "Falcon-iOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "Falcon",
            targets: ["Falcon"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "PvFalcon",
            path: "lib/ios/PvFalcon.xcframework"
        ),
        .target(
            name: "Falcon",
            dependencies: ["PvFalcon"],
            path: ".",
            exclude: [
                "binding/ios/FalconAppTest",
                "demo"
            ],
            sources: [
                "binding/ios/Falcon.swift",
                "binding/ios/FalconErrors.swift"
            ],
            resources: [
               .copy("lib/common/falcon_params.pv")
            ]
        )
    ]
)
