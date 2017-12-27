const { expect } = require('chai');

const Molty = require('../index');

const { Schema, connect, Model } = Molty;

const { veryNewSchema } = require('./mock');

describe('# Validate', () => {
  let m;
  before(() => {
    const options = {
      connection: {
        engine: 'mongodb',
        uri: 'mongodb://localhost:27017/test',
      },
      tenants: {
        noListener: true,
      },
    };

    conn = connect(options);
    m = new Model(veryNewSchema, 'VeryNewModel');
  });

  it('Creating a new document and testing validation', () => {
    newDoc = m.new(
      {
        email: 'test@test.com',
        tenantId: Schema.types().ObjectId(),
      },
      'test',
    );
    expect(newDoc).to.have.a.property('_data');
    expect(newDoc).to.have.a.property('_tenant', 'test');
  });
});
