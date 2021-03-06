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
  sDiscriminator3,
  conn,
} = require('./mock');

describe('# find() Operations', () => {
  let newDoc,
    refDoc,
    mDiscriminator,
    newDiscriminatorDoc2,
    newDiscriminatorDoc3,
    newDiscriminatorDoc4;
  const email = 'asdfasdf@gmail.com';
  const email2 = 'awdasdasdfasdf@gmail.com';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';

  before(async () => {
    const m = new Model(s, 'TestModel8');

    newDoc = await m.new({
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

    const TestModel2 = new Model(testSchema2, 'TestSchema2_2');

    refDoc = await TestModel2.new({
      email,
    });

    const m2 = new Model(s2, 'TestModel9');
    mDiscriminator = m2.discriminator(
      sDiscriminator3,
      'TestModel7Discriminator_B',
    );

    newDiscriminatorDoc2 = await mDiscriminator.new({
      test: ['OOOKKA', 'YEEEESA'],
      email: 'asdfsadfsdfsfd@dsfdfadsfsdf.es',
      password: '1234567890',
      jobTitle: 'Plumber',
      institution: 'A',
    });

    newDiscriminatorDoc3 = await mDiscriminator.new({
      test: ['OOOKKB', 'YEEEESB'],
      email: 'asdfsassssssd@dsfdfadsfsdf.es',
      password: '1234567890',
      jobTitle: 'Developer',
      institution: 'B',
    });

    newDiscriminatorDoc4 = await mDiscriminator.new({
      test: ['OOOKKC', 'YEEEESC'],
      email: 'a444sssssd@dsfdfadsfsdf.es',
      password: '1234567890',
      jobTitle: 'Designer',
      institution: 'C',
    });

    newDiscriminatorDoc = await mDiscriminator.new({
      test: ['OOOKKD', 'YEEEESD'],
      email: email2,
      password: 'asdasdasdasd',
      jobTitle: 'Teacher',
      institution: 'D',
    });
  });

  it('find all documents with projection fields (test: 1)', async () => {
    try {
      await conn.insertOne('test2', newDiscriminatorDoc3);
      await conn.insertOne('test2', newDiscriminatorDoc4);

      let res2 = await conn.find(
        'test2',
        'TestModel7Discriminator_B',
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
