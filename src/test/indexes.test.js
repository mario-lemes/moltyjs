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
      expect(conn).to.have.property('tenants');
      expect(conn).to.have.property('models');
      expect(conn.models).to.be.an.instanceof(Object);
      expect(conn.models).to.have.property('TestModel2');
      expect(conn.models).to.have.property('TestModel3');
      expect(conn.tenants).to.be.an.instanceof(Object);
      expect(conn.tenants).to.have.property('test2');
      expect(conn.tenants.test2).to.have.property('TestModel2', true);
      expect(conn.tenants.test2).to.have.property('TestModel3', true);
    } catch (error) {
      throw error;
    }
  });
});
