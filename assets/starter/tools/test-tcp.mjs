import assert from 'node:assert/strict';
import {stateAfter} from '../src/tcpModel.mjs';
assert.equal(stateAfter('buffer').canReadThrough, 100);
assert.equal(stateAfter('blocked').next, 101);
assert.equal(stateAfter('repair').canReadThrough, 300);
assert.equal(stateAfter('duplicate').duplicates, 100);
assert.equal(stateAfter('deliver').next, 301);
console.log('TCP example: gaps, ordered prefix and duplicate bytes verified.');
