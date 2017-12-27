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
    newDiscriminatorDoc4,
    newDiscriminatorDoc5,
    newDiscriminatorDoc6,
    newDiscriminatorDoc7,
    newDiscriminatorDoc8,
    newDiscriminatorDoc9,
    newDiscriminatorDoc10;
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
    const m = new Model(s, 'TestModel6');

    newDoc = m.new(
      {
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
      },
      'test',
    );

    const TestSchema2 = new Model(testSchema2, 'TestSchema2');

    refDoc = TestSchema2.new(
      {
        email,
      },
      'test',
    );

    const m2 = new Model(s2, 'TestModel7');
    mDiscriminator = m2.discriminator(
      sDiscriminator,
      'TestModel7Discriminator',
    );

    newDiscriminatorDoc = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: email2,
        password: 'asdasdasdasd',
        jobTitle: 'Teacher',
      },
      'test',
    );

    newDiscriminatorDoc2 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: 'asdfsadfsdfsfd@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Plumber',
      },
      'test',
    );

    newDiscriminatorDoc3 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: 'asdfsassssssd@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Developer',
      },
      'test',
    );

    newDiscriminatorDoc4 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: 'a444sssssd@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Designer',
      },
      'test',
    );
    // --------------------------------------

    newDiscriminatorDoc5 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '5@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Web Designer',
      },
      'test',
    );

    newDiscriminatorDoc6 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '6@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Coach',
      },
      'test',
    );

    newDiscriminatorDoc7 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '7@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Engineer',
      },
      'test',
    );

    newDiscriminatorDoc8 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '8@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Architect',
      },
      'test',
    );

    //----------------------------------------
    newDiscriminatorDoc9 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '7@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Engineer',
      },
      'test',
    );

    newDiscriminatorDoc10 = mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '8@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Architect',
      },
      'test',
    );
  });

  it('find one document', async () => {
    try {
      const res = await conn.insertOne('test2', newDiscriminatorDoc2);

      expect(res._data).to.have.property('test');
      // expect(res._data.test[0]).to.equal('YESSSSSSSSSSSSSSSSSSS');
      const res2 = await conn.find(
        'test2',
        'TestModel7Discriminator',
        {
          _id: newDiscriminatorDoc2._data._id,
        },
        { limit: 1 },
      );
      expect(res2[0]._data._id).to.eql(newDiscriminatorDoc2._data._id);
      expect(res2[0]).to.be.instanceOf(Document);
      expect(res2[0]).to.have.property('newDiscriminatorMethod1');
      expect(res2[0]._discriminator).to.equal('TestModel7Discriminator');
      expect(res2[0]._modelName).to.equal('TestModel7');
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

      const resFind = await conn.find(
        'test2',
        'TestSchema2',
        {
          _id: refDoc._data._id,
        },
        { limit: 1 },
      );

      expect(resUpdate).to.have.property('n', 1);
      expect(resUpdate).to.have.property('nModified', 1);
      expect(resUpdate).to.have.property('ok', 1);

      expect(resFind[0]._data._id).to.eql(refDoc._data._id);
      expect(resFind[0]._data.tenantId).to.eql(
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
      const resFind = await conn.find(
        'test2',
        'TestModel7Discriminator',
        {
          _id: newDiscriminatorDoc._data._id,
        },
        { limit: 1 },
      );

      expect(resFind[0]._data).to.have.property('jobTitle', 'CAMIONERO');
      expect(resFind[0]._data).to.have.property('_id');
      expect(resFind[0]._data._id).to.eql(newDiscriminatorDoc._data._id);
    } catch (error) {
      throw error;
    }
  });

  it('find all documents', async () => {
    try {
      await conn.insertOne('test2', newDiscriminatorDoc3);
      await conn.insertOne('test2', newDiscriminatorDoc4);

      let res2 = await conn.find(
        'test2',
        'TestModel7Discriminator',
        {},
        { moltyClass: true },
      );

      expect(res2).to.have.lengthOf(4);
      expect(res2[0]).to.have.property('_data');
      expect(res2[0]).to.have.property('newDiscriminatorMethod1');
      expect(res2[0]._discriminator).to.equal('TestModel7Discriminator');
      expect(res2[0]._modelName).to.equal('TestModel7');
    } catch (error) {
      throw error;
    }
  });

  it('insertMany documents', async () => {
    try {
      await conn.insertMany('test2', [
        newDiscriminatorDoc5,
        newDiscriminatorDoc6,
        newDiscriminatorDoc7,
        newDiscriminatorDoc8,
      ]);

      let res2 = await conn.find(
        'test2',
        'TestModel7Discriminator',
        {},
        { moltyClass: true },
      );

      expect(res2).to.have.lengthOf(8);
      expect(res2[0]).to.have.property('_data');
      expect(res2[0]).to.have.property('newDiscriminatorMethod1');
      expect(res2[0]._discriminator).to.equal('TestModel7Discriminator');
      expect(res2[0]._modelName).to.equal('TestModel7');
    } catch (error) {
      throw error;
    }
  });

  it('should not insertMany documents becaure are duplicated', async () => {
    try {
      await conn.insertMany('test2', [
        newDiscriminatorDoc9,
        newDiscriminatorDoc10,
      ]);

      let res2 = await conn.find(
        'test2',
        'TestModel7Discriminator',
        {},
        { moltyClass: true },
      );
      throw new Error('Unexpected');
    } catch (error) {
      // Duplicated
      expect(error).to.have.property('code', 11000);
    }
  });
});
