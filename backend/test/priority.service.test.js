const test = require('node:test');
const assert = require('node:assert/strict');

const { calculatePriorityScore } = require('../src/services/priority.service');

test('calculatePriorityScore returns higher score for higher severity/upvotes', () => {
    const low = calculatePriorityScore({ severity: 'low', upvotes: 0, locationPriority: 0 });
    const high = calculatePriorityScore({ severity: 'high', upvotes: 10, locationPriority: 10 });

    assert.equal(typeof low, 'number');
    assert.equal(typeof high, 'number');
    assert.ok(high > low);
});
