const { expect } = require('chai');

const Molty = require('../index');

const MongoClient = require('../clients/mongoClient');
const ConnectionManager = require('../clients/connectionManager');

const { Schema, connect } = Molty;

const { testSchema, testOptions, s, m } = require('./mock');

before(async () => {
  const options = {
    engine: 'mongodb',
    uri: 'mongodb://localhost:27017/test',
  };

  try {
    const conn = connect(options);
    const res = await conn.dropDatabase('test2');
    expect(res).to.equal(true);
  } catch (error) {
    return error;
  }
});
