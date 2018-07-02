const { expect } = require('chai');

const Molty = require('../index');
const Document = require('../document');

const MongoClient = require('../clients/mongoClient');
const ConnectionManager = require('../clients/connectionManager');

const { Schema, connect, Model } = Molty;

const { schemaFields, conn } = require('./mock');

describe('# Schema field types', () => {
  before(async () => {
    await conn.dropDatabase('schemafields');

    const ModelFields = new Model(schemaFields, 'ModelFields');

    newDoc = await ModelFields.new({
      string: 'Test String',
      buffer: new Buffer(0),
      boolean: true,
      date: new Date(),
      stringDate: new Date().toISOString(),
      number: 30,
      object: { any: { thing: 'i want' } },
      mixed: 1,
      someId: Schema.types().ObjectId(),
      nested: {
        stuff: 'Cool stuff',
      },
      array: [],
      arrayOfString: ['One', 'Two', 'Three'],
      arrayOfNumber: [1, 2, 3],
      arrayOfDate: [new Date(), new Date(), new Date()],
      arrayOfBuffer: [new Buffer(0), new Buffer(1), new Buffer(2)],
      arrayOfBoolean: [true, false, true],
      arrayOfObject: [
        { any: { thing: 'i want' } },
        { any: { thing: 'i care' } },
      ],
      arrayOfId: [
        Schema.types().ObjectId(),
        Schema.types().ObjectId(),
        Schema.types().ObjectId(),
      ],
      arrayOfNested: [
        { stuff: 'first thing' },
        { stuff: 'cool' },
        {
          test: 'hola',
          stuff: 'hola',
          custom: 'yes',
        },
      ],
      arrayOfArray: [[]],
      arrayOfArrayOfNumber: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
      doubleNested: {
        level_1: {
          level_2: {
            level_3_1: 'Test',
          },
        },
      },
    });
  });

  it('Creating a new document from SchemaFields', async () => {
    try {
      const res = await conn.insertOne('schemafields', newDoc);

      expect(res._data._id).to.eql(newDoc._data._id);
      expect(res).to.be.instanceOf(Document);
      expect(res._discriminator).to.equal(null);
      expect(res._modelName).to.equal('ModelFields');
    } catch (error) {
      throw error;
    }
  });
});
