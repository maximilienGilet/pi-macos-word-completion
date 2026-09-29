import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { ghostSuffix, renderGhost, wordAtCursor } from '../extensions/mac-word-completion/ghost.ts';

const cursor = '\x1b[7m \x1b[0m';
const measure = (text) => text.replace(/\x1b\[[0-9;]*m/g, '').length;
const truncate = (text, width) => Array.from(text).slice(0, width).join('');

test('renders the native suffix without inserting text', () => {
  assert.equal(wordAtCursor(['un bonj'], 0, 7), 'bonj');
  assert.equal(wordAtCursor(['bo'], 0, 2), 'bo');
  assert.equal(wordAtCursor(["aujourd'hu"], 0, 10), "aujourd'hu");
  assert.equal(ghostSuffix('bonj', ['bonjour', 'Bonjour']), 'our ');
  const line = 'un bonj' + cursor + '      ';
  const rendered = renderGhost([line], 'our ', 14, measure, truncate);
  assert.equal(line, 'un bonj' + cursor + '      ');
  assert.match(rendered[0], /\x1b\[2m/);
  assert.match(rendered[0].replace(/\x1b\[[0-9;]*m/g, ''), /bonjour/);
});

test('does not complete commands, paths, or identifiers', () => {
  for (const [line, col] of [['/review bonj', 12], ['src/bonj', 8], ['my_bonj', 7], ['bonj42', 6], ['bonjour', 3], ['@bonj', 5]]) {
    assert.equal(wordAtCursor([line], 0, col), null, line);
  }
  assert.equal(ghostSuffix('bonjour', ['bonjour']), null);
  assert.equal(ghostSuffix('bonj', ['salut']), null);
});

test('asks the native spellchecker for a word within its full-line context', { skip: process.platform !== 'darwin', timeout: 30000 }, async () => {
  const helper = spawn('/usr/bin/swift', ['extensions/mac-word-completion/spell.swift'], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PI_SPELL_DEBUG: '1' } });
  let error = '';
  try {
    const response = new Promise((resolve, reject) => {
      let output = '';
      helper.stdout.on('data', (chunk) => {
        output += chunk;
        if (output.includes('\n')) resolve(JSON.parse(output.split('\n', 1)[0]));
      });
      helper.stderr.on('data', (chunk) => { error += chunk; });
      helper.on('error', reject);
      helper.on('exit', (code) => { if (!output.includes('\n')) reject(new Error(error || `Swift exited ${code}`)); });
    });
    helper.stdin.write(JSON.stringify({ text: 'un compl', start: 3, length: 5 }) + '\n');
    const words = await response;
    assert.ok(words.some((word) => word.toLowerCase().startsWith('compl') && word.length > 5), `Native completions: ${JSON.stringify(words)}; ${error}`);
  } finally {
    helper.kill();
  }
});
