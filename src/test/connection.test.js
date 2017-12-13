const { expect } = require('chai');

const Molty = require('../index');

const MongoClient = require('../clients/mongoClient');
const ConnectionManager = require('../clients/connectionManager');

const { Schema, connect } = Molty;

const { testSchema, testOptions, s, m } = require('./mock');

describe('# Connection', () => {
  before(() => {});

  it('Creating a new connection', async () => {
    const options = {
      engine: 'mongodb',
      uri: 'mongodb://localhost:27017/test',
    };

    try {
      const client = await connect(options);
      expect(client).to.have.property('_connectionManager');
      expect(client._connectionManager).to.be.an.instanceof(ConnectionManager);
      expect(client._connectionManager).to.have.property('_pool');
      expect(client._connectionManager._pool).to.have.property(
        '_started',
        true,
      );
      expect(client._connectionManager._pool._factory).to.be.an.instanceof(
        Object,
      );
      expect(client._connectionManager._pool._factory).to.have.property(
        'create',
      );
      expect(client._connectionManager._pool._factory).to.have.property(
        'destroy',
      );
      expect(
        client._connectionManager._pool._factory.create,
      ).to.be.an.instanceof(Function);
      expect(
        client._connectionManager._pool._factory.destroy,
      ).to.be.an.instanceof(Function);
    } catch (error) {
      throw error;
    }
  });
});
