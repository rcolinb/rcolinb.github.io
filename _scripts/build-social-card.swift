// Render the site's typographic sharing image with macOS system fonts.
// From the repository root: swift _scripts/build-social-card.swift
import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

let width = 1200
let height = 630
let output = CommandLine.arguments.dropFirst().first ?? "social-card.jpg"
let context = CGContext(
    data: nil, width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: width * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
)!

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat) -> CGColor {
    CGColor(srgbRed: red / 255, green: green / 255, blue: blue / 255, alpha: 1)
}
context.setFillColor(color(253, 253, 251))
context.fill(CGRect(x: 0, y: 0, width: width, height: height))

func centered(_ text: String, fontName: String, size: CGFloat, color: CGColor, top: CGFloat) {
    let font = CTFontCreateWithName(fontName as CFString, size, nil)
    let attributes: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attributes))
    var ascent: CGFloat = 0
    let textWidth = CTLineGetTypographicBounds(line, &ascent, nil, nil)
    context.textMatrix = .identity
    context.textPosition = CGPoint(x: (CGFloat(width) - textWidth) / 2, y: CGFloat(height) - top - ascent)
    CTLineDraw(line, context)
}

// The rules echo the website's running head and generous page margins.
context.setFillColor(color(222, 223, 216))
context.fill(CGRect(x: 96, y: 533, width: 1008, height: 1))
context.fill(CGRect(x: 96, y: 96, width: 1008, height: 1))

centered("R. Colin Blenis", fontName: "Georgia", size: 68, color: color(37, 39, 36), top: 219)
centered("Nursing scholarship & writing", fontName: "Georgia-Italic", size: 29, color: color(100, 102, 95), top: 321)
centered("rcblenis.com", fontName: "Helvetica", size: 21, color: color(100, 102, 95), top: 465)

let image = context.makeImage()!
let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: output) as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.93] as CFDictionary)
guard CGImageDestinationFinalize(destination) else { fatalError("Could not write the sharing image.") }
print("Wrote \(output) (\(width) × \(height)).")
