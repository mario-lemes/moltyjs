const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const {
  testSchema,
  testOptions,
  s,
  sDiscriminator,
  directorSchema,
  m,
  conn,
} = require('./mock');

describe('# Indexes', async () => {
  before(async () => {
    const m1 = new Model(s, 'TestModel2_2');
    const m2 = new Model(s, 'TestModel3_2');

    mDiscriminator = m2.discriminator(
      sDiscriminator,
      'TestModel3_2_Discriminated',
    );
    /* mDiscriminator2 = m2.discriminator(
      sDiscriminator,
      'TestModel3_2_Discriminated_2',
    ); */
    mDiscriminator3 = m2.discriminator(
      directorSchema,
      'TestModel3_2_Discriminated_3',
    );

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
      test: ['OOOKK2', 'YEEEES2'],
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

    newDoc3 = await mDiscriminator.new({
      test: ['OOOKK3', 'YEEEES3'],
      email: 'qwerwetret@dsfdffds.com',
      firstName: 'sdfasdf',
      lastName: 'sdfsadfsadf',
      password: '1321321',
      institution: 'test',
      birthdate: Date.now(),
      gender: 'Male',
      jobTitle: 'TEST',
      emergencyContactInfo: {
        location: 'Las Palmas',
        relation: 'Brother',
      },
    });

    const res = await conn.insertOne('test2', newDoc);
    const res2 = await conn.insertOne('test2', newDoc2);
    const res3 = await conn.insertOne('test2', newDoc3);
  });

  it('Ensuring index on the DB collection', async () => {
    try {
      expect(conn).to.have.property('tenants');
      expect(conn).to.have.property('models');
      expect(conn).to.have.property('_indexes');
      expect(conn.models).to.be.an.instanceof(Object);
      expect(conn.models).to.have.property('TestModel2_2');
      expect(conn.models).to.have.property('TestModel3_2');
      expect(conn.tenants).to.be.an.instanceof(Object);
      expect(conn.tenants).to.have.property('test2');
      expect(conn.tenants.test2).to.have.property('TestModel2_2', true);
      expect(conn.tenants.test2).to.have.property('TestModel3_2', true);
      expect(conn._indexes).to.be.an.instanceof(Object);
      expect(conn._indexes).to.have.property('TestModel2_2');
      expect(conn._indexes).to.have.property('TestModel3_2');
      expect(conn._indexes.TestModel2_2).to.be.an.instanceof(Array);
      expect(conn._indexes.TestModel3_2).to.be.an.instanceof(Array);
      expect(conn._indexes.TestModel2_2).to.have.lengthOf(2);
      expect(conn._indexes.TestModel3_2).to.have.lengthOf(6);
    } catch (error) {
      throw error;
    }
  });
});
