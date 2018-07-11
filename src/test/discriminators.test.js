const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const {
  testSchema,
  testOptions,
  s,
  s2,
  sDiscriminator,
  conn,
} = require('./mock');

describe('# Discriminators', () => {
  let newDiscriminatorDoc, mDiscriminator, newDoc;
  const email = 'mariolemes5@gmail.com';
  const password = '123455647o87i87';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';

  before(async () => {
    const m = new Model(s2, 'TestModel5');
    mDiscriminator = m.discriminator(sDiscriminator, 'TestModel5Discriminator');

    newDiscriminatorDoc = await mDiscriminator.new({
      test: ['OOOKKA', 'YEEEESA'],
      email,
      password,
      jobTitle: 'Teacher',
      institution: 'A',
    });

    newDoc = await m.new({
      test: ['OOOKKB', 'YEEEESB'],
      email: 'hello@gmail.com',
      password,
    });
  });

  it('Creating a new model which inherit all the properties from another model', () => {
    const model = conn.models['TestModel5'];

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
      expect(res).to.have.property('_data');
      expect(res._data._id).to.equal(newDiscriminatorDoc._data._id);
      expect(res._data).to.deep.equal(newDiscriminatorDoc._data);
      //expect(res._data.test[0]).to.equal('YESSSSSSSSSSSSSSSSSSS');
      expect(res._data).to.have.property(
        newDiscriminatorDoc._options.inheritOptions.discriminatorKey,
      );
    } catch (error) {
      throw error;
    }
  });

  it('Insert one doc from a parent doc', async () => {
    try {
      const res = await conn.insertOne('test2', newDoc);

      expect(res).to.have.property('_data');
      expect(res._data._id).to.equal(newDoc._data._id);
      expect(res._data).to.deep.equal(newDoc._data);
      expect(res._data.test[0]).to.equal('OOOKKB');
      expect(res._data).to.have.property(
        newDoc._options.inheritOptions.discriminatorKey,
      );
    } catch (error) {
      throw error;
    }
  });
});
