const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const { testSchema, testOptions, s, m } = require('./mock');

describe('# Indexes', () => {
  before(async () => {
    const options = {
      connection: {
        engine: 'mongodb',
        uri: 'mongodb://localhost:27017/test2',
      },
      tenants: {
        noListener: true,
      },
    };

    conn = connect(options);
    const m1 = new Model(s, 'TestModel2');
    const m2 = new Model(s, 'TestModel3');

    newDoc = m1.new(
      {
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
      },
      'test',
    );

    newDoc2 = m2.new(
      {
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
      },
      'test',
    );

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
