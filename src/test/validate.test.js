const { expect } = require('chai');

const Molty = require('../index');

const { Schema, connect, Model } = Molty;

const { veryNewSchema, conn } = require('./mock');

describe('# Validate', () => {
  let m;
  before(async () => {
    m = new Model(veryNewSchema, 'VeryNewModel');
  });

  it('Creating a new document and testing validation', async () => {
    newDoc = await m.new({
      email: 'test@test.com',
      tenantId: Schema.types().ObjectId(),
    });

    expect(newDoc).to.have.a.property('_data');
  });
});
