import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

for (const path of ['/api/state', '/api/search-profile']) {
  test(`${path} rejects malformed JSON before accessing storage`, async () => {
    const DB = {prepare() { assert.fail('Invalid input must not access storage'); }};
    for (const body of ['{', 'null', '[]']) {
      const response = await worker.fetch(new Request(`https://tracker.test${path}`, {
        method: 'PUT',
        headers: {
          'oai-authenticated-user-id': 'input-test',
          'Content-Type': 'application/json',
          Origin: 'https://tracker.test',
        },
        body,
      }), {DB});
      assert.equal(response.status, 400, body);
      assert.match((await response.json()).error, /^invalid_/);
    }
  });
}
