// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Maze",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(name: "Maze", targets: ["Maze"]),
        .library(name: "UXTracker", targets: ["UXTracker"])
    ],
    targets: [
        .target(
            name: "Maze",
            resources: [
                .process("Resources")
            ]
        ),
        .target(
            name: "UXTracker",
            dependencies: ["Maze"]
        )
    ]
)
