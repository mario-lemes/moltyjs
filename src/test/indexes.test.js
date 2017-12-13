const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, model } = Molty;

const Middleware = require('../middleware');

const { testSchema, testOptions, s, m } = require('./mock');

describe('# Indexes', () => {
  before(() => {
    const options = {
      engine: 'mongodb',
      uri: 'mongodb://localhost:27017/test',
    };

    conn = connect(options);
  });

  it('Ensuring index on the DB collection', async () => {
    try {
      expect(conn).to.have.property('_tenants');
      expect(conn).to.have.property('_models');
      expect(conn._models).to.be.an.instanceof(Object);
      expect(conn._models).to.have.property('TestModel2');
      expect(conn._models).to.have.property('TestModel3');
      expect(conn._tenants).to.be.an.instanceof(Object);
      expect(conn._tenants).to.have.property('test2');
      expect(conn._tenants.test2).to.have.property('TestModel2', true);
      expect(conn._tenants.test2).to.have.property('TestModel3', true);
    } catch (error) {
      throw error;
    }
  });
});
