const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const {
  testSchema,
  testSchemaRefArray,
  testOptions,
  testSchema2,
  s,
  s2,
  s3,
} = require('./mock');

describe('# References', () => {
  let newDoc, conn, refDoc;
  const email = 'asdasdaasss@213243.com';
  const email2 = 'asdasd@asdasd.com';
  const firstName = 'Mario';
  const lastName = 'Lemes';
  const gender = 'Male';
  const password = '1321321';
  const test = ['OOOKK', 'YEEEES'];
  before(async () => {
    const options = {
      connection: {
        engine: 'mongodb',
        uri: 'mongodb://localhost:27017/test2',
      },
      tenants: {
        noListener: true,
      },
    };
    conn = connect(options);

    const TestSchema8 = new Model(testSchema2, 'TestSchema8');

    const TestSchemaRefArray = new Model(
      testSchemaRefArray,
      'TestSchemaRefArray',
    );

    refDoc = await TestSchema8.new(
      {
        email,
        tenantId: Schema.types().ObjectId(),
      },
      'test2',
    );

    refArrayDoc = await TestSchemaRefArray.new(
      {
        email: 'sakjdfhasjdfh@3312123.com',
      },
      'test2',
    );
  });

  it('Updating a document with a reference to another collection', async () => {
    try {
      const res = await conn.insertOne(refDoc);
      expect(res).to.have.property('_data');
      expect(res._data._id).to.equal(refDoc._data._id);
      expect(res._data).to.deep.equal(refDoc._data);
      expect(res._data).to.have.property('tenantId');
    } catch (error) {
      throw error;
    }
  });

  it('Updating a document with an array of references to another collection', async () => {
    try {
      const res = await conn.insertOne(refArrayDoc);
      const resUpdate = await conn.updateOne(
        'test2',
        'TestSchemaRefArray',
        { _id: refArrayDoc._data._id },
        {
          $push: {
            tenantId: {
              $each: [
                Schema.types().ObjectId('5a3411ed14ee497f1c2bcb58'),
                Schema.types().ObjectId('5a3474ad33cd5893cc24ae00'),
                Schema.types().ObjectId('5a3474ad33cd5893cc24ae01'),
              ],
            },
          },
        },
      );

      expect(resUpdate).to.have.property('n', 1);
      expect(resUpdate).to.have.property('nModified', 1);
      expect(resUpdate).to.have.property('ok', 1);
    } catch (error) {
      throw error;
    }
  });
});
