const { describe, it } = require('node:test');
const assert = require('node:assert');

const { validateFlowTarget } = require('../src/services/flow.service');

describe('Flow Target Integrity & Validation', () => {
  it('should reject invalid targetType', async () => {
    await assert.rejects(
      async () => {
        await validateFlowTarget('INVALID', 'col-1', null, 'proj-1');
      },
      { message: /Invalid flow targetType/ }
    );
  });

  it('should reject COLLECTION target when collectionId is missing', async () => {
    await assert.rejects(
      async () => {
        await validateFlowTarget('COLLECTION', null, null, 'proj-1');
      },
      { message: /collectionId is required/ }
    );
  });

  it('should reject COLLECTION target when requestId is provided', async () => {
    await assert.rejects(
      async () => {
        await validateFlowTarget('COLLECTION', 'col-1', 'req-1', 'proj-1');
      },
      { message: /requestId must be null/ }
    );
  });

  it('should reject REQUEST target when requestId is missing', async () => {
    await assert.rejects(
      async () => {
        await validateFlowTarget('REQUEST', null, null, 'proj-1');
      },
      { message: /requestId is required/ }
    );
  });

  it('should reject REQUEST target when collectionId is provided', async () => {
    await assert.rejects(
      async () => {
        await validateFlowTarget('REQUEST', 'col-1', 'req-1', 'proj-1');
      },
      { message: /collectionId must be null/ }
    );
  });
});
