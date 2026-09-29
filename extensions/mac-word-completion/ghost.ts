const wordPattern = /(?:^|[\s.,;:!?()[\]{}])([\p{L}\p{M}']{2,})$/u;
const cursorPattern = /\x1b\[7m \x1b\[0m/;

export function wordAtCursor(lines: string[], cursorLine: number, cursorCol: number): string | null {
	const line = lines[cursorLine] ?? "";
	const before = line.slice(0, cursorCol);
	if (before.startsWith("/") || /[\p{L}\p{N}_]/u.test(line.slice(cursorCol, cursorCol + 1))) return null;
	return before.match(wordPattern)?.[1] ?? null;
}

export function ghostSuffix(word: string, matches: string[]): string | null {
	const candidate = matches.find((value) => value !== word && value.toLocaleLowerCase().startsWith(word.toLocaleLowerCase()));
	return candidate ? candidate.slice(word.length) + " " : null;
}

export function renderGhost(
	lines: string[],
	suffix: string,
	width: number,
	measure: (text: string) => number,
	truncate: (text: string, width: number, ellipsis: string) => string,
): string[] {
	const output = [...lines];
	for (let index = 0; index < output.length; index++) {
		const line = output[index];
		const cursor = cursorPattern.exec(line);
		if (!cursor) continue;
		const before = line.slice(0, cursor.index);
		const after = line.slice(cursor.index + cursor[0].length);
		const available = Math.min(measure(after), width - measure(before) - 1);
		const first = Array.from(suffix)[0];
		if (!first || available < measure(first)) return output;
		const tail = truncate(suffix.slice(first.length), available - measure(first), "");
		const padding = " ".repeat(available - measure(first) - measure(tail));
		output[index] = `${before}\x1b[7m${first}\x1b[0m\x1b[2m${tail}\x1b[0m${padding}`;
		return output;
	}
	return output;
}
