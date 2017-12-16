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
  let newDoc, refDoc, conn, mDiscriminator, newDiscriminatorDoc2;
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
    const m = new Model(s, 'TestModel6');

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

    const m2 = new Model(s2, 'TestModel7');
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

    newDiscriminatorDoc = mDiscriminator.new({
      test: ['OOOKK', 'YEEEES'],
      email: email2,
      password: 'asdasdasdasd',
      jobTitle: 'Teacher',
    });
  });

  it('findOne document', async () => {
    try {
      const res = await conn.insertOne('test2', newDiscriminatorDoc2);
      expect(res.ops[0]).to.have.property('test');
      expect(res.ops[0].test[0]).to.equal('YESSSSSSSSSSSSSSSSSSS');
      const res2 = await conn.findOne('test2', 'TestModel7Discriminator', {
        _id: newDiscriminatorDoc2._data._id,
      });
      expect(res2._data._id).to.eql(newDiscriminatorDoc2._data._id);
      expect(res2).to.be.instanceOf(Document);
      expect(res2).to.have.property('newDiscriminatorMethod1');
      expect(res2._discriminator).to.equal('TestModel7Discriminator');
      expect(res2._modelName).to.equal('TestModel7');
    } catch (error) {
      throw error;
    }
  });

  it('updateOne document', async () => {
    try {
      const resRefDoc = await conn.insertOne('test2', refDoc);

      const resUpdate = await conn.updateOne(
        'test2',
        'TestSchema2',
        { _id: refDoc._data._id },
        {
          $set: {
            tenantId: Schema.types().ObjectId('5a3411ed14ee497f1c2bcb58'),
          },
        },
      );

      const resFind = await conn.findOne('test2', 'TestSchema2', {
        _id: refDoc._data._id,
      });

      expect(resUpdate).to.have.property('n', 1);
      expect(resUpdate).to.have.property('nModified', 1);
      expect(resUpdate).to.have.property('ok', 1);

      expect(resFind._data._id).to.eql(refDoc._data._id);
      expect(resFind._data.tenantId).to.eql(
        Schema.types().ObjectId('5a3411ed14ee497f1c2bcb58'),
      );
    } catch (error) {
      throw error;
    }
  });

  it('updateOne discriminator document', async () => {
    try {
      const res = await conn.insertOne('test2', newDiscriminatorDoc);
      const resUpdate = await conn.updateOne(
        'test2',
        'TestModel7Discriminator',
        { _id: newDiscriminatorDoc._data._id },
        {
          $set: {
            jobTitle: 'CAMIONERO',
          },
        },
      );
      const resFind = await conn.findOne('test2', 'TestModel7Discriminator', {
        _id: newDiscriminatorDoc._data._id,
      });

      expect(resFind._data).to.have.property('jobTitle', 'CAMIONERO');
      expect(resFind._data).to.have.property('_id');
      expect(resFind._data._id).to.eql(newDiscriminatorDoc._data._id);
    } catch (error) {
      throw error;
    }
  });
});
