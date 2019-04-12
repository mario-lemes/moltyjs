const { expect } = require('chai');

const Molty = require('../index');

const Mongoconn = require('../clients/mongoClient');
const ConnectionManager = require('../clients/connectionManager');

const { Schema, connect, Model } = Molty;

const { schemaFields, testOptions, s, m, conn } = require('./mock');

describe('# DB Ops', () => {
  before(() => {
    const ModelFields = new Model(schemaFields, 'ModelFields2');
  });

  it('Executing DB Admin commands', async () => {
    try {
      const res = await conn.executeDbAdminCommand({
        listDatabases: 1,
        nameOnly: true,
      });

      expect(res).to.have.property('databases');
      expect(res).to.have.property('ok', 1);
      expect(res.databases).to.be.an.instanceof(Object);
    } catch (error) {
      throw error;
    }
  });
});
