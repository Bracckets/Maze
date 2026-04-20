// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Pollex",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(name: "Pollex", targets: ["Pollex"]),
        .library(name: "UXTracker", targets: ["UXTracker"])
    ],
    targets: [
        .target(
            name: "Pollex",
            resources: [
                .process("Resources")
            ]
        ),
        .target(
            name: "UXTracker",
            dependencies: ["Pollex"]
        )
    ]
)
