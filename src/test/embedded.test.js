const { expect } = require('chai');

const Molty = require('../index');

const MongoClient = require('../clients/mongoClient');
const ConnectionManager = require('../clients/connectionManager');

const { Schema, connect, Model } = Molty;

const {
  testSchema,
  testOptions,
  s2,
  sDiscriminator2,
  conn,
} = require('./mock');

describe('# Embedded documents', () => {
  before(async () => {
    await conn.dropDatabase('embedded');
  });

  it('Creating an embeded document', async () => {
    try {
    } catch (error) {
      throw error;
    }
  });
});
