import assert from "node:assert/strict";

import { consumeSseChunk, readStreamingStringField } from "@/rpg/lib/host-model-call";

const first = consumeSseChunk(
  "",
  'data: {"choices":[{"delta":{"reasoning_content":"Think"}}]}\n' +
    'data: {"choices":[{"delta":{"content":"{\\"narration\\":\\""}}]}\n' +
    "data: {",
);
assert.deepEqual(first.deltas, ['{"narration":"']);
assert.equal(first.done, false);
assert.equal(first.pending, "data: {");

const second = consumeSseChunk(first.pending, '"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n');
assert.deepEqual(second.deltas, ["Hi"]);
assert.equal(second.done, true);
assert.equal(second.pending, "");

assert.equal(readStreamingStringField('{"place":"Dock"', "narration"), null);
assert.equal(readStreamingStringField('{"narration":"The lock', "narration"), "The lock");
assert.equal(readStreamingStringField('{"narration":"The lock is \\"rusted\\', "narration"), 'The lock is "rusted');
assert.equal(readStreamingStringField('{"narration":"Line\\', "narration"), "Line");
assert.equal(readStreamingStringField('{"narration":"Line\\nnext"}', "narration"), "Line\nnext");
assert.equal(readStreamingStringField('{"narration":"Caf\\u00', "narration"), "Caf");
assert.equal(readStreamingStringField('{"narration":"Caf\\u00e9"}', "narration"), "Café");
assert.equal(readStreamingStringField('{"situation": "Night"}', "situation"), "Night");
