const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, model } = Molty;

const Middleware = require('../middleware');

const { testSchema, testOptions, s, sDiscriminator } = require('./mock');

describe('# CRUD Operations', () => {
  let newDoc, conn, mDiscriminator;
  const email = 'asdfasdf@gmail.com';
  const email2 = 'awdasdasdfasdf@gmail.com';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';

  before(() => {
    const options = {
      engine: 'mongodb',
      uri: 'mongodb://localhost:27017/test',
    };

    conn = connect(options);
    const m = model(s, 'TestModel6');

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

    mDiscriminator = m.discriminator(sDiscriminator, 'TestModel5Discriminator');

    newDiscriminatorDoc = mDiscriminator.new({
      test: ['OOOKK', 'YEEEES'],
      email: email2,
      password: 'asdasdasdasd',
      jobTitle: 'Teacher',
    });
  });

  it('findOne document', async () => {
    try {
      const res = await conn.insertOne('test2', newDiscriminatorDoc);
      const res2 = await conn.findOne('test2', 'TestModel5Discriminator');
      expect(res2._data._id).to.eql(newDiscriminatorDoc._data._id);
      expect(res2).to.be.instanceOf(Document);
      expect(res2).to.have.property('newDiscriminatorMethod1');
      expect(res2._discriminator).to.equal('TestModel5Discriminator');
      expect(res2._modelName).to.equal('TestModel6');
    } catch (error) {
      throw error;
    }
  });
});
