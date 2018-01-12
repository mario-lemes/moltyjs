const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const { testSchema, testOptions, s, m, conn } = require('./mock');

describe('# Indexes', async () => {
  before(async () => {
    const m1 = new Model(s, 'TestModel2_2');
    const m2 = new Model(s, 'TestModel3_2');

    newDoc = await m1.new({
      test: ['OOOKK', 'YEEEES'],
      email: 'dasdsadsad@dsfdffds.com',
      firstName: 'sdfasdf',
      lastName: 'sdfsadfsadf',
      password: '1321321',
      birthdate: Date.now(),
      gender: 'Male',
      emergencyContactInfo: {
        location: 'Las Palmas',
        relation: 'Brother',
      },
    });

    newDoc2 = await m2.new({
      test: ['OOOKK', 'YEEEES'],
      email: 'dasdsadsasdasdad@dsfdffds.com',
      firstName: 'sdfasdf',
      lastName: 'sdfsadfsadf',
      password: '1321321',
      birthdate: Date.now(),
      gender: 'Male',
      emergencyContactInfo: {
        location: 'Las Palmas',
        relation: 'Brother',
      },
    });

    const res = await conn.insertOne('test2', newDoc);
    const res2 = await conn.insertOne('test2', newDoc2);
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
