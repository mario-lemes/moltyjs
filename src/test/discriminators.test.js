const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const { testSchema, testOptions, s, s2, sDiscriminator } = require('./mock');

describe('# Discriminators', () => {
  let newDiscriminatorDoc, mDiscriminator, conn, newDoc;
  const email = 'mariolemes5@gmail.com';
  const password = '123455647o87i87';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';

  before(() => {
    const options = {
      engine: 'mongodb',
      uri: 'mongodb://localhost:27017/test',
    };

    conn = connect(options);

    const m = new Model(s2, 'TestModel5');
    mDiscriminator = m.discriminator(sDiscriminator, 'TestModel5Discriminator');

    newDiscriminatorDoc = mDiscriminator.new({
      test: ['OOOKK', 'YEEEES'],
      email,
      password,
      jobTitle: 'Teacher',
    });

    newDoc = m.new({
      test: ['OOOKK', 'YEEEES'],
      email: 'hello@gmail.com',
      password,
    });
  });

  it('Creating a new model which inherit all the properties from another model', () => {
    const { model } = conn._models['TestModel5'];
    expect(model).to.be.an.instanceof(Model);
    expect(model).to.have.property('_schemaNormalized');
    expect(model).to.have.property('_schemaOptions');
    expect(model).to.have.property('_childsModels');
    expect(model._childsModels).to.have.property('TestModel5Discriminator');
    expect(model._childsModels['TestModel5Discriminator']).to.be.an.instanceof(
      Model,
    );
    expect(model).to.have.property('_discriminator', null);

    expect(mDiscriminator).to.be.an.instanceof(Model);
    expect(mDiscriminator).to.have.property('_schemaNormalized');
    expect(mDiscriminator).to.have.property('_schemaOptions');
    expect(mDiscriminator).to.have.property('_childsModels');
    expect(mDiscriminator._childsModels).to.be.empty;

    expect(mDiscriminator).to.have.property(
      '_discriminator',
      'TestModel5Discriminator',
    );
  });

  it('Testing hooks in inherited models', async () => {
    try {
      const res = await conn.insertOne('test2', newDiscriminatorDoc);
      expect(res).to.have.property('result');
      expect(res).to.have.property('ops');
      expect(res).to.have.property('insertedCount', 1);
      expect(res).to.have.property('insertedIds');
      expect(res.insertedIds[0]).to.equal(newDiscriminatorDoc._data._id);
      expect(res.ops[0]).to.deep.equal(newDiscriminatorDoc._data);
      expect(res.ops[0].test[0]).to.equal('YESSSSSSSSSSSSSSSSSSS');
      expect(res.ops[0]).to.have.property(
        newDiscriminatorDoc._options.inheritOptions.discriminatorKey,
      );
    } catch (error) {
      throw error;
    }
  });

  it('Insert one doc from a parent doc', async () => {
    try {
      const res = await conn.insertOne('test2', newDoc);
      expect(res).to.have.property('result');
      expect(res).to.have.property('ops');
      expect(res).to.have.property('insertedCount', 1);
      expect(res).to.have.property('insertedIds');
      expect(res.insertedIds[0]).to.equal(newDoc._data._id);
      expect(res.ops[0]).to.deep.equal(newDoc._data);
      expect(res.ops[0].test[0]).to.equal('OOOKK');
      expect(res.ops[0]).to.have.property(
        newDoc._options.inheritOptions.discriminatorKey,
      );
    } catch (error) {
      throw error;
    }
  });
});
