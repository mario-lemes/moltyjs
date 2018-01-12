const { expect } = require('chai');

const Molty = require('../index');

const MongoClient = require('../clients/mongoClient');
const ConnectionManager = require('../clients/connectionManager');

const { Schema, connect, Model } = Molty;

const {
  testSchema,
  testOptions,
  s2,
  sDiscriminator2,
  conn,
} = require('./mock');

describe('# Elastic Search', () => {
  before(async () => {
    const res4 = await conn.dropDatabase('es4');

    const m2 = new Model(s2, 'TestModel7_2');

    mDiscriminator = m2.discriminator(
      sDiscriminator2,
      'TestModel7Discriminator_2',
    );

    newDiscriminatorDoc5 = await mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '5@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Web Designer',
      },
      'es4',
    );

    newDiscriminatorDoc6 = await mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '6@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Coach',
      },
      'es4',
    );

    newDiscriminatorDoc7 = await mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '7@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Engineer',
      },
      'es4',
    );

    newDiscriminatorDoc8 = await mDiscriminator.new(
      {
        test: ['OOOKK', 'YEEEES'],
        email: '8@dsfdfadsfsdf.es',
        password: '1234567890',
        jobTitle: 'Architect',
      },
      'es4',
    );
  });

  it('Performing operations into ES', async () => {
    try {
      // INSERT
      await conn.insertMany('es4', [
        newDiscriminatorDoc5,
        newDiscriminatorDoc6,
        newDiscriminatorDoc7,
        newDiscriminatorDoc8,
      ]);

      // UPDATE
      await conn.updateOne(
        'es4',
        'TestModel7Discriminator_2',
        { _id: newDiscriminatorDoc5._data._id },
        {
          $set: {
            firstName: 'TEST',
          },
        },
      );

      await conn.updateOne(
        'es4',
        'TestModel7Discriminator_2',
        { _id: newDiscriminatorDoc6._data._id },
        {
          $set: {
            firstName: 'HOLA',
          },
        },
      );

      await conn.updateOne(
        'es4',
        'TestModel7Discriminator_2',
        { _id: newDiscriminatorDoc7._data._id },
        {
          $set: {
            firstName: 'COOL',
          },
        },
      );

      await conn.updateOne(
        'es4',
        'TestModel7Discriminator_2',
        { _id: newDiscriminatorDoc8._data._id },
        {
          $set: {
            firstName: 'GREAT',
          },
        },
      );

      // DELETE
      await conn.deleteOne('es4', 'TestModel7Discriminator_2', {
        _id: newDiscriminatorDoc5._data._id,
      });

      await conn.deleteOne('es4', 'TestModel7Discriminator_2', {
        _id: newDiscriminatorDoc6._data._id,
      });

      await conn.deleteOne('es4', 'TestModel7Discriminator_2', {
        firstName: 'COOL',
      });

      let resFind = await conn.find(
        'es4',
        'TestModel7Discriminator_2',
        {},
        { moltyClass: false },
      );

      expect(resFind).to.have.lengthOf(1);

      expect(resFind[0]).to.have.property('email', '8@dsfdfadsfsdf.es');
      expect(resFind[0]).to.have.property('kind', 'TestModel7Discriminator_2');
      expect(resFind[0]).to.have.property('firstName', 'GREAT');
      expect(resFind[0]).to.have.property('lastName', 'LEMES');
    } catch (error) {
      throw error;
    }
  });
});
