import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { CustomEditor, type ExtensionAPI, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth, type EditorTheme, type TUI } from "@earendil-works/pi-tui";
import { ghostSuffix, renderGhost, wordAtCursor } from "./ghost.ts";

type CompleteWord = (text: string, start: number, length: number) => Promise<string[]>;

export class WordEditor extends CustomEditor {
	private suggestion: string | null = null;
	private timer?: ReturnType<typeof setTimeout>;
	private request = 0;

	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, private complete: CompleteWord) {
		super(tui, theme, keybindings);
	}

	private refresh(): void {
		this.request++;
		if (this.timer) clearTimeout(this.timer);
		this.suggestion = null;
		const cursor = this.getCursor();
		const lines = this.getLines();
		if (cursor.col !== (lines[cursor.line] ?? "").length || this.isShowingAutocomplete()) return;
		const word = wordAtCursor(lines, cursor.line, cursor.col);
		if (!word) return;
		const request = this.request;
		this.timer = setTimeout(() => {
			void this.complete(lines[cursor.line] ?? "", cursor.col - word.length, word.length).then((matches) => {
				const now = this.getCursor();
				if (request !== this.request || this.isShowingAutocomplete() || wordAtCursor(this.getLines(), now.line, now.col) !== word) return;
				this.suggestion = ghostSuffix(word, matches);
				this.tui.requestRender();
			}).catch(() => { if (request === this.request) this.suggestion = null; });
		}, 80);
	}

	override setText(text: string): void {
		super.setText(text);
		this.refresh();
	}

	override insertTextAtCursor(text: string): void {
		super.insertTextAtCursor(text);
		this.refresh();
	}

	override handleInput(data: string): void {
		if (this.suggestion && !this.isShowingAutocomplete() && matchesKey(data, "tab")) {
			const suffix = this.suggestion;
			this.suggestion = null;
			this.insertTextAtCursor(suffix);
			return;
		}
		if (this.suggestion && matchesKey(data, "escape")) {
			this.suggestion = null;
			this.request++;
			this.tui.requestRender();
			return;
		}
		const text = this.getText();
		const cursor = this.getCursor();
		super.handleInput(data);
		const now = this.getCursor();
		if (text !== this.getText() || cursor.line !== now.line || cursor.col !== now.col) this.refresh();
	}

	override render(width: number): string[] {
		const lines = super.render(width);
		const cursor = this.getCursor();
		if (!this.focused || !this.suggestion || this.isShowingAutocomplete() || cursor.col !== (this.getLines()[cursor.line] ?? "").length) return lines;
		return renderGhost(lines, this.suggestion, width, visibleWidth, truncateToWidth);
	}
}

export default function (pi: ExtensionAPI): void {
	if (process.platform !== "darwin") return;
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		const helper = spawn("/usr/bin/swift", [fileURLToPath(new URL("./spell.swift", import.meta.url))], {
			stdio: ["pipe", "pipe", "ignore"],
		});
		const pending: Array<(value: string[]) => void> = [];
		let available = true;
		createInterface({ input: helper.stdout }).on("line", (line) => {
			try {
				const parsed: unknown = JSON.parse(line);
				pending.shift()?.(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
			} catch {
				pending.shift()?.([]);
			}
		});
		const stop = () => {
			available = false;
			for (const resolve of pending.splice(0)) resolve([]);
		};
		helper.on("error", stop);
		helper.on("exit", stop);
		const complete: CompleteWord = (text, start, length) => new Promise((resolve) => {
			if (!available || helper.stdin.destroyed) { resolve([]); return; }
			pending.push(resolve);
			try {
				helper.stdin.write(JSON.stringify({ text, start, length }) + "\n");
			} catch {
				pending.splice(pending.indexOf(resolve), 1);
				resolve([]);
			}
		});
		ctx.ui.setEditorComponent((tui, theme, keybindings) => new WordEditor(tui, theme, keybindings, complete));
		pi.on("session_shutdown", () => { helper.kill(); stop(); });
	});
}
