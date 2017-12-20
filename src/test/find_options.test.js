const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const {
  testSchema,
  testSchema2,
  testOptions,
  s,
  s2,
  sDiscriminator,
} = require('./mock');

describe('# CRUD Operations', () => {
  let newDoc,
    refDoc,
    conn,
    mDiscriminator,
    newDiscriminatorDoc2,
    newDiscriminatorDoc3,
    newDiscriminatorDoc4;
  const email = 'asdfasdf@gmail.com';
  const email2 = 'awdasdasdfasdf@gmail.com';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';

  before(() => {
    const options = {
      connection: {
        engine: 'mongodb',
        uri: 'mongodb://localhost:27017/test',
      },
      tenants: {
        noListener: true,
      },
    };

    conn = connect(options);
    const m = new Model(s, 'TestModel8');

    newDoc = m.new({
      test: ['OOOKK', 'YEEEES'],
      email,
      firstName,
      lastName,
      password: '1321321',
      birthdate: Date.now(),
      gender,
      emergencyContactInfo: {
        location: 'Las Palmas',
        relation: 'Brother',
      },
    });

    const TestSchema2 = new Model(testSchema2, 'TestSchema2');

    refDoc = TestSchema2.new({
      email,
    });

    const m2 = new Model(s2, 'TestModel9');
    mDiscriminator = m2.discriminator(
      sDiscriminator,
      'TestModel7Discriminator',
    );

    newDiscriminatorDoc2 = mDiscriminator.new({
      test: ['OOOKK', 'YEEEES'],
      email: 'asdfsadfsdfsfd@dsfdfadsfsdf.es',
      password: '1234567890',
      jobTitle: 'Plumber',
    });

    newDiscriminatorDoc3 = mDiscriminator.new({
      test: ['OOOKK', 'YEEEES'],
      email: 'asdfsassssssd@dsfdfadsfsdf.es',
      password: '1234567890',
      jobTitle: 'Developer',
    });

    newDiscriminatorDoc4 = mDiscriminator.new({
      test: ['OOOKK', 'YEEEES'],
      email: 'a444sssssd@dsfdfadsfsdf.es',
      password: '1234567890',
      jobTitle: 'Designer',
    });

    newDiscriminatorDoc = mDiscriminator.new({
      test: ['OOOKK', 'YEEEES'],
      email: email2,
      password: 'asdasdasdasd',
      jobTitle: 'Teacher',
    });
  });

  it.only('find all documents with projection fields (test: 1)', async () => {
    try {
      await conn.insertOne('test2', newDiscriminatorDoc3);
      await conn.insertOne('test2', newDiscriminatorDoc4);

      let res2 = await conn.find(
        'test2',
        'TestModel7Discriminator',
        {},
        { moltyClass: false, projection: { test: 1 } },
      );

      expect(res2).to.have.lengthOf(2);
      expect(res2[0]).to.have.not.property('_data');
      expect(res2[0]).to.have.not.property('newDiscriminatorMethod1');
      expect(res2[0]).to.have.not.property('email');
      expect(res2[0]).to.have.not.property('password');
      expect(res2[0]).to.have.not.property('jobTitle');
      expect(res2[0]).to.have.not.property('firstName');
      expect(res2[0]).to.have.not.property('lastName');
      expect(res2[0]).to.have.not.property('confirmationToken');
      expect(res2[0]).to.have.not.property('confirmationTokenExpires');
      expect(res2[0]).to.have.not.property('isActive');
      expect(res2[0]).to.have.not.property('__kind');
      expect(res2[0]).to.have.not.property('createdAt');
      expect(res2[0]).to.have.not.property('updatedAt');
      expect(res2[0]).to.have.property('_id');
      expect(res2[0]).to.have.property('test');
    } catch (error) {
      throw error;
    }
  });
});
