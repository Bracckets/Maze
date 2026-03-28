// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "UXTracker",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(name: "UXTracker", targets: ["UXTracker"])
    ],
    targets: [
        .target(name: "UXTracker")
    ]
)
