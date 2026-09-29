# Pi macOS Word Completion

Complete the word you are typing in Pi with the native macOS dictionary. The suggestion appears as inline ghost text; nothing is inserted until you press Tab. No network calls, language model, prompt history, or frequency database.

## Install

Requires **macOS 11 (Big Sur) or newer**, Pi, Node.js 22.19+, and the Swift command-line tool (`xcode-select --install` if needed). macOS 11 is the minimum supported by Node.js 22; this extension has not been tested on every macOS release back to 11.

```sh
pi install npm:pi-macos-word-completion
```

For a local checkout:

```sh
pi install /path/to/pi-macos-word-completion
```

Restart Pi or run `/reload`. Type `bonj` to preview `bonjour`. Press **Tab** to accept, **Escape** to dismiss. Pi's existing command and file completion continues to work.

## How it works

The extension asks `NSSpellChecker` for completions of the current prose word, using the word's language when macOS can identify it. Candidates retain their native order. The Swift helper runs locally and returns suggestions asynchronously. The extension only looks at the current editor line and does not save prompts.

This package replaces Pi's input editor to render ghost text. Another extension replacing the editor (such as a Vim-input extension) will conflict unless the two editors are explicitly integrated.

## Development

```sh
npm test
npm run test:release
npm pack --dry-run
pi -e .
```

CI checks the Swift helper's request/response protocol on a hosted macOS runner. Hosted runners may lack a usable graphical spelling service, so `npm run test:release` also requires a real dictionary completion on a Mac with a graphical session. `npm publish` runs this release check automatically. The npm package contains the Swift helper alongside the extension.

## License

MIT
