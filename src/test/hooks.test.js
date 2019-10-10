const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const {
  testSchema,
  testOptions,
  veryNewSchema,
  s,
  s2,
  s3,
  conn,
} = require('./mock');

describe('# Hooks', () => {
  let newDoc, newDoc2, m4;
  const email2 = 'mariolemes2@gmail.com';
  const email3 = 'mariolemes3@gmail.com';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';
  const password = '1321321';
  const test = ['OOOKK', 'YEEEES'];
  before(async () => {
    const m2 = new Model(s2, 'TestModel2');
    const m3 = new Model(s3, 'TestModel3');

    newDoc = await m2.new({
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

    newDoc2 = await m3.new({
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

    m4 = new Model(veryNewSchema, 'VeryNewModel2');
  });

  it('Saving the new doc into the DB but modifying its password with prehook', async () => {
    try {
      expect(newDoc._data.password).to.equal(password);
      expect(newDoc._data.lastName).to.equal(lastName);
      const res = await conn.insertOne('test2', newDoc);
      expect(res).to.have.property('_data');
      expect(res._data._id).to.equal(newDoc._data._id);
      expect(res._data).to.deep.equal(newDoc._data);
    } catch (error) {
      throw error;
    }
  });

  it.only('Saving the new doc into the DB and using static methos in the prehook', async () => {
    try {
      expect(newDoc2._data.password).to.equal(password);
      expect(newDoc2._data.lastName).to.equal(lastName);
      expect(newDoc2._data.test).to.equal(test);
      const res = await conn.insertOne('test2', newDoc2);
      const res2s = await conn.updateOne(
        'test2',
        'TestModel3',
        { _id: res._data._id },
        { $set: { gender: 'Female' } },
      );
      expect(res).to.have.property('_data');
      expect(res._data._id).to.equal(newDoc2._data._id);
      expect(res._data).to.deep.equal(newDoc2._data);
    } catch (error) {
      throw error;
    }
  });

  it('Creating a new Doc and using the method associated to it', async () => {
    try {
      const newDoc3 = await m4.new({
        email: 'test@test.com',
        tenantId: Schema.types().ObjectId(),
      });
      const val = newDoc3.newMethod('NEW VAR', 'NEW VAR 2');

      expect(val).to.equal(true);
    } catch (error) {
      throw error;
    }
  });
});
