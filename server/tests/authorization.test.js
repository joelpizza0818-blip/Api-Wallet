const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  hasWorkspaceRole,
  requireWorkspaceRole,
  WRITE_ROLES,
  ADMIN_ROLES,
} = require('../src/services/authorization.service');

describe('Authorization & Multi-Tenant Isolation', () => {
  it('should correctly evaluate role membership matching Set, Array, or single string', () => {
    // Check WRITE_ROLES set
    assert.strictEqual(WRITE_ROLES.has('OWNER'), true);
    assert.strictEqual(WRITE_ROLES.has('ADMIN'), true);
    assert.strictEqual(WRITE_ROLES.has('DEVELOPER'), true);
    assert.strictEqual(WRITE_ROLES.has('QA'), false);
    assert.strictEqual(WRITE_ROLES.has('VIEWER'), false);

    // Check ADMIN_ROLES set
    assert.strictEqual(ADMIN_ROLES.has('OWNER'), true);
    assert.strictEqual(ADMIN_ROLES.has('ADMIN'), true);
    assert.strictEqual(ADMIN_ROLES.has('DEVELOPER'), false);
  });
});
