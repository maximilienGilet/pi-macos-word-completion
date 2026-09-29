import AppKit
import Foundation

struct CompletionRequest: Decodable {
    let text: String
    let start: Int
    let length: Int
}

let checker = NSSpellChecker.shared
checker.automaticallyIdentifiesLanguages = true

while let line = readLine() {
    var suggestions: [String] = []
    if let request = try? JSONDecoder().decode(CompletionRequest.self, from: Data(line.utf8)) {
        let text = request.text as NSString
        if request.start >= 0 && request.length > 0 && request.start <= text.length && request.length <= text.length - request.start {
            let range = NSRange(location: request.start, length: request.length)
            let language = checker.language(forWordRange: range, in: request.text, orthography: nil) ?? checker.language()
            suggestions = checker.completions(
                forPartialWordRange: range,
                in: request.text,
                language: language,
                inSpellDocumentWithTag: 0
            ) ?? []
        }
    }
    if let data = try? JSONSerialization.data(withJSONObject: suggestions) {
        FileHandle.standardOutput.write(data + Data([10]))
    } else {
        FileHandle.standardOutput.write(Data("[]\n".utf8))
    }
}
