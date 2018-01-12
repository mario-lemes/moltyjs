const { expect } = require('chai');

const Molty = require('../index');

const MongoClient = require('../clients/mongoClient');
const ConnectionManager = require('../clients/connectionManager');

const { Schema, connect } = Molty;

const { testSchema, testOptions, s, m, conn } = require('./mock');

before(async () => {
  try {
    const res = await conn.dropDatabase('test2');

    await conn.dropDatabase('test3');
    await conn.dropDatabase('es');
    await conn.dropDatabase('es2');
    await conn.dropDatabase('es3');
    await conn.dropDatabase('es4');
    expect(res).to.equal(true);
  } catch (error) {
    return error;
  }
});
