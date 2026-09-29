import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';

test('gets a real macOS dictionary completion from a graphical session', { timeout: 30000 }, async () => {
  const helper = spawn('/usr/bin/swift', ['extensions/mac-word-completion/spell.swift'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let error = '';
  try {
    const response = new Promise((resolve, reject) => {
      let output = '';
      helper.stdout.on('data', (chunk) => {
        output += chunk;
        if (output.split('\n').length >= 3) resolve(output.trim().split('\n').map((line) => JSON.parse(line)));
      });
      helper.stderr.on('data', (chunk) => { error += chunk; });
      helper.on('error', reject);
      helper.on('exit', (code) => { if (output.split('\n').length < 3) reject(new Error(error || `Swift exited ${code}`)); });
    });
    helper.stdin.write(JSON.stringify({ text: 'un bonj', start: 3, length: 4 }) + '\n');
    helper.stdin.write(JSON.stringify({ text: 'hello worl', start: 6, length: 4 }) + '\n');
    const [french, english] = await response;
    assert.ok(french.includes('bonjour') || english.includes('world'), `Native completions: fr=${JSON.stringify(french)}, en=${JSON.stringify(english)}; ${error}`);
  } finally {
    helper.kill();
  }
});
