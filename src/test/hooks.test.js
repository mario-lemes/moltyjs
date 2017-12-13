const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, model } = Molty;

const Middleware = require('../middleware');

const { testSchema, testOptions, s, s2, s3 } = require('./mock');

describe('# Hooks', () => {
  let newDoc, conn;
  const email2 = 'mariolemes2@gmail.com';
  const email3 = 'mariolemes3@gmail.com';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';
  const password = '1321321';
  const test = ['OOOKK', 'YEEEES'];
  before(() => {
    const options = {
      engine: 'mongodb',
      uri: 'mongodb://localhost:27017/test',
    };
    conn = connect(options);
    const m2 = model(s2, 'TestModel2');
    const m3 = model(s3, 'TestModel3');

    newDoc = m2.new({
      test: ['OOOKK', 'YEEEES'],
      email: email2,
      firstName,
      lastName,
      password,
      birthdate: Date.now(),
      gender,
      emergencyContactInfo: {
        location: 'Las Palmas',
        relation: 'Brother',
      },
    });

    newDoc2 = m3.new({
      test,
      email: email3,
      firstName,
      lastName,
      password,
      birthdate: Date.now(),
      gender,
      emergencyContactInfo: {
        location: 'Las Palmas',
        relation: 'Brother',
      },
    });
  });

  it('Saving the new doc into the DB but modifying its password with prehook', async () => {
    try {
      expect(newDoc._data.password).to.equal(password);
      expect(newDoc._data.lastName).to.equal(lastName);
      const res = await conn.insertOne('test2', newDoc);
      expect(res).to.have.property('result');
      expect(res).to.have.property('ops');
      expect(res).to.have.property('insertedCount', 1);
      expect(res).to.have.property('insertedIds');
      expect(res.insertedIds[0]).to.equal(newDoc._data._id);
      expect(res.ops[0]).to.deep.equal(newDoc._data);
    } catch (error) {
      throw error;
    }
  });

  it('Saving the new doc into the DB and using static methos in the prehook', async () => {
    try {
      expect(newDoc2._data.password).to.equal(password);
      expect(newDoc2._data.lastName).to.equal(lastName);
      expect(newDoc2._data.test).to.equal(test);
      const res = await conn.insertOne('test2', newDoc2);

      expect(res).to.have.property('result');
      expect(res).to.have.property('ops');
      expect(res).to.have.property('insertedCount', 1);
      expect(res).to.have.property('insertedIds');
      expect(res.insertedIds[0]).to.equal(newDoc2._data._id);
      expect(res.ops[0]).to.deep.equal(newDoc2._data);
    } catch (error) {
      throw error;
    }
  });
});
