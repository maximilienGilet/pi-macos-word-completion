import AppKit
import Foundation

struct CompletionRequest: Decodable {
    let text: String
    let start: Int
    let length: Int
}

let checker = NSSpellChecker.shared
checker.automaticallyIdentifiesLanguages = true
if ProcessInfo.processInfo.environment["PI_SPELL_DEBUG"] == "1" {
    fputs("[DEBUG-spell] language=\(checker.language()) dictionaries=\(checker.availableLanguages.prefix(5))\n", stderr)
}

while let line = readLine() {
    var suggestions: [String] = []
    if let request = try? JSONDecoder().decode(CompletionRequest.self, from: Data(line.utf8)) {
        let text = request.text as NSString
        if request.start >= 0 && request.length > 0 && request.start <= text.length && request.length <= text.length - request.start {
            let range = NSRange(location: request.start, length: request.length)
            let language = checker.language(forWordRange: range, in: request.text, orthography: nil) ?? checker.language()
            if ProcessInfo.processInfo.environment["PI_SPELL_DEBUG"] == "1" {
                fputs("[DEBUG-spell] selected=\(language) text=\(request.text)\n", stderr)
            }
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
