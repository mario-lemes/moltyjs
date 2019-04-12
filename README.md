[![npm version](https://badge.fury.io/js/moltyjs.svg)](https://badge.fury.io/js/moltyjs)
[![dependencies Status](https://david-dm.org/Yonirt/moltyjs/status.svg)](https://david-dm.org/Yonirt/moltyjs)
[![devDependencies Status](https://david-dm.org/Yonirt/moltyjs/dev-status.svg)](https://david-dm.org/Yonirt/moltyjs?type=dev)

# What is moltyjs?

A tiny ODM for MongoDB with multy tenancy support and Elasticsearch integration.

MoltyJS allow you all what you expect from an object database modeling library plus multy tenancy support and Elasticsearch integration behind the scene.

## Install

```shell
$ npm install moltyjs --save
```

## Usage

```javascript
const { connect } = require('moltys');

// ES2015
import { connect } from ('moltyjs');
```

## Connect to a DB

To connect to a database use the "connect()" function passing trough 'options' payload all the settings required:

### `Molty.connect(options)`

```javascript
const { connect } = require('moltys');

const options = {
  engine: 'mongodb', // By default
  uri: 'mongodb://localhost:27017/test',
  max: 100, // By default
  min: 1, // By default
  connection: {
    replicaSet: 'repl-s0123',
  },
  tenants: {
    noListener: false, // By default
    returnNonCachedInstance: false, // By default
  },
  elasticSearch: {
    host: 'localhost:9200',
  },
};

const connection = connect(options);
```

"connect()" will return a connection instance which will allow you to perform all the actions availables on the DB.

Options settings allowed are:

- _engine_: {String} By default 'mongodb', and for the time being MoltyJS only supports Mongo Databases.
- _uri_: {String} DB connection URI. To get more information about MongoDB connection URI take a look to the [official documentation](https://docs.mongodb.com/manual/reference/connection-string/)
- _max_: {Number} By default 100, set the maximum connection simultaneasly to the DB.
- _min_: {Number} Bu default 1, set the minimum connection simultaneasly to the DB.
- _connection_: Object to set up the connection parameters to the DB instance and the connection pool settings.
- _tenants_: Object to set up the db instance configuration
  - _noListener_: {Boolean} By default false, do not make the db an event listener to the original connection. Keep it false if you are using MoltyJS in a multy tenancy architecture since MongoDB propagate all the events throug all the db instances oppened.
  - _returnNonCachedInstance_: {Boolean} By default false, control if you want to return a cached instance or have a new one created
- _elasticSearch_: Object to set up the connection parameter to the Elasticsearch instance
  - _host_: {String} Host of the Elasticsearch instance

## Drop a DB

### `.dropDatabase(database)`

```javascript
const res = await connection.dropDatabase('test');
// true
```

## Drop a Collection

### `.dropCollection(collection, database)`

```javascript
const res = await connection.dropCollection('collection', 'test');
// true
```

## Execute admin commands

### `.executeDbAdminCommand(command, options)`

```javascript
const res = await connection.executeDbAdminCommand({ listDatabases: 1 });
/*
{
   "databases" : [
      {
         "name" : "admin",
         "sizeOnDisk" : 83886080,
         "empty" : false
      },
      {
         "name" : "local",
         "sizeOnDisk" : 83886080,
         "empty" : false
      },
      {
         "name" : "test",
         "sizeOnDisk" : 83886080,
         "empty" : false
      }
   ],
   "totalSize" : 251658240,
   "ok" : 1
}
*/
```

## Create a new Schema

Molty Schema are based on Mongoose Schema structure with some changes on the declaration of the inherit schema options. I even keep some field options name to make the Molty integration as easier as posible in those project are currently running Mongoose.

To create a new Schema use the "Schema()" constructor passing the schema and the options:

### `new Schema(schema, options)`

```javascript
const { Schema } = require('moltys');

const newSchema = Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    password: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      default: '',
    },
    age: {
      type: Number,
    },
    tests: {
      type: [Schema.types().ObjectId],
      ref: 'ReferenceSchema',
    },
  },
  {
    timestamps: true,
    inheritOptions: {
      discriminatorKey: '__kind',
    },
  },
);
```

The schema field properties alowed are:

- _type_: Is the only one which is mandatory and could be a **String, Number, Boolean, Buffer, Date, Array, Object, ObjectId** or an array **[]** of any of them.
- _ref_: Optional and should be the Model name associated to the collection you want to refeer. The _type_ of areference field must be **ObjectId** or **[ObjectId]**.
- _required_: Optional and only allow **Boolean** values.
- _unique_: Optional and only allow **Boolean** values.
- _default_: Optional, only allows values of the same type which is set on the _type_ property. You also can assigna a function to it which return a value with the correct type.
- _match_: Optional, allows either RegExp or **String** to validate the value of the field.
- _enum_: Optional, and must be an array of values of the same type is set on _type_.
- _min_: Optional, minimum number allowed.
- _max_: Optional, maximum number allowed.
- _maxlength_: Optional, maximum length of a **String**
- _validate_: Optional, function to perform a custom validation. Document is passing through the function arg:

```javascript
const { Schema } = require('moltys');

const otherSchema = Schema({
  job: {
    type: String,
    validate: async doc => {
      if (doc.field === 'exist') return true;

      return false;
    },
  },
});
```

And the schema options allowed are:

- _timestamps_: Optional, set automatically in the documents saved or updated in the DB the fields: `createdAt` and `updatedAt`
- _inheritOptions_: Optional, used for inherit from a parent Schema
  - _discriminatorKey_: Required once "_inheritOptions_" is set
  - _merge_: Optional, must be an array with a combination of these three values ['methods', 'preHooks', 'postHooks'], depending of what you want to merge from the parent Schema.
- _mongoDBIndexes_: Optional, used for set custom schema indexes in mongoDB, like multi-field index, compound indexes, etc. See [https://docs.mongodb.com/manual/reference/command/createIndexes/](mongoDB documetation) for more information.
- _elasticSearchIndexes_: Optional, used for set the Schema field will be indexed by the Elasticsearch server and in which type: 'text', 'keyword', 'date', 'long', 'double', 'boolean', 'ip', 'object', 'nested'

```javascript
const { Schema } = require('moltys');

const schemaOptions = {
  timestamps: true,
  inheritOptions: {
    discriminatorKey: 'kind',
  },
  mongoDBIndexes: [
    {
      key: { name: 1, age: -1 },
      unique: true,
    },
  ],
  elasticSearchIndexes: {
    version: {
      type: 'text',
    },
  },
};

const elasticSearchSchema = Schema(
  {
    version: {
      type: String,
    },
    counter: {
      type: Number,
    },
  },
  schemaOptions,
);
```

## Static methods

You can extend the functionality of Document class adding static method to work with the documents instances:

```javascript
newSchema.methods.comparePassword = async function(candidatePassword) {
  const user = this._data;
  return candidatePassword === user.password;
};

const TestModel = new Model(newSchema, 'TestModel');

newDoc = TestModel.new({
  email: 'test@moltyjs.com',
  password: '1321321',
  name: 'Michael Scott',
});

// You can call static methods from the document itself
newDoc.comparePassword('000000'); // false
```

## Hooks middleware

All hooks have binded the connection instance and the tenant name beside the document or the query depending of the hook.

#### Document middleware is supported for the following functions.

- insertOne
- insertMany

In document middleware functions, **this** refers to the document or to the array of documents and **meta** is other value info related to the transaction like the fiter payload in the updates actions.

Examples:

```javascript
// Pre hooks on insertOne
newSchema.pre('insertOne', function(connection, tenant, meta, next) {
  // this refers to the document
  console.log(this);
  return next();
});

// Post hooks on insertOne
newSchema.post('insertOne', function(connection, tenant, meta, next) {
  // From any pre or post hook of Document middleware
  // you can call to any of the static methos associated
  // to the docuemnt
  this.staticMethod();
  return next();
});

// Pre hooks on insertMany
newSchema.pre('insertMany', function(connection, tenant, meta, next) {
  // this refers to the array os documents since the method that
  // trigger this hook is 'insertMany'
  console.log(this); // [{Document}, {Document}]
  return next();
});

// Post hooks on insertMany
newSchema.post('insertMany', async function(connection, tenant, meta, next) {
  // We can perform any action against the DB with the
  // connection instance and the tenant name
  const newDoc = TestModel.new({
    email: 'test@moltyjs.com',
    password: 'ababababa',
    name: 'Pam Beesley',
  });
  const res = await connection.insertOne('tenant_test', newDoc);
  return next();
});
```

#### Query middleware is supported for the following functions.

- updateOne
- updateMany
- deleteOne
- deleteMany

In query middleware functions, **this** refers to the query and **meta** is other value info related to the transaction like the fiter payload in the updates actions.

Examples:

```javascript
// Pre hooks on update
newSchema.pre('updateOne', function(connection, tenant, meta, next) {
  // this refers to the update query
  console.log(this); // Ex. { $set: {jobTitle: 'Test' }} => update query
  return next();
});

// Post hooks on delete
newSchema.post('deleteOne', async function(connection, tenant, meta, next) {
  console.log(this); // Ex. {_id: 5a57b7e35f142544ec0e68dc} => filter query
  return next();
});
```

## Create a new Model

Once we have created our schema we need to register as a model so we can start to create, find, updete and delete documents. To do this you must provide the a proper schema and a model name. The model name will be the collection name on the DB so use the criteria you want since Molty does not make any accomodation on them like auto plurilize.

### `new Model(schema, discriminatorName)`

```javascript
const { Model } = require('moltys');

const TestModel = new Model(newSchema, 'TestModel');
```

## Create a Model discriminator

You can also create models which inherits from other models and you can decide in which fashion you want to do it. You have to make sure that the discriminator key of the child models are the same than the parents and also set what you want to merge from the parent model.

### `.discriminator(schema, discriminatorName)`

```javascript
const { Schema } = require('moltys');

const newSchemaDiscriminator = Schema(
  {
    job: {
      type: String,
      default: '',
    },
    position: {
      type: String,
    },
  },
  {
    timestamps: true,
    inheritOptions: {
      discriminatorKey: '__kind',
      merge: ['methods', 'preHooks', 'postHooks'],
    },
  },
);

TestModelDiscriminator = TestModel.discriminator(
  newSchemaDiscriminator,
  'TestModelDiscriminator',
);
```

The **merge** option must be an array with the element you want to merge from the parent model, those options are:

- methods: which corresponds to the static methods.
- preHooks: which corresponds to the hooks that are executed **before** performing actions on the DB
- postHooks: which corresponds to the hooks that are executed **after** performing actions on the DB

## Create a new document

Once we have already set up the Schema and registered the Model with it we can start creating document from that Model as follow:

### `.new(payload) {Promise}`

```javascript
const { Model } = require('moltys');

const TestModel = new Model(newSchema, 'TestModel');

newDoc = await TestModel.new({
  email: 'test@moltyjs.com',
  password: '1321321',
  name: 'Michael Scott',
}); // Document // Error
```

## Referencing Documents

MoltyJS support referencing document that later on you wil be able to populate on find queries. To make a refference to another Model just add a new field on the Schema with the type ObjectId and the "ref" propertie with the Model name referenciated.

```javascript
const { Schema } = require('moltys');

const referenceSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    password: {
      type: String,
      required: true,
      unique: true,
      maxlength: 150,
      default: () => crypto.randomBytes(20).toString('hex'),
    },
    accountExpiration: {
      type: Date,
      default: () =>
        moment()
          .add(24, 'hours')
          .utc()
          .format(),
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'error'],
      default: 'pending',
    },
    model: {
      type: Schema.types().ObjectId,
      ref: 'TestModel',
    },
  },
  {
    timestamps: true,
  },
);
```

You can use an array of ObjectId also as type ([ObjectId]). Noticed that to get the proper ObjectId type you must tu get it from the Schema.types() method object is returned.

## Saving a document

### `insertOne(tenant, doc, options = {}) {Promise}`

- {String} Tenant name
- {Document} `doc` Document instance object
- {Object} `options` Optional settings
  - {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class
    instead of MongoDB Document
  - {Boolean} `forceServerObjectId` (false by default: no limit) Force server to create \_id fields instead of client.

```javascript
const res = await connection.insertOne(newDoc);
// Document || Error
```

### `insertMany(tenant, docs, options = {}) {Promise}`

- {String} Tenant name
- [{Document}] `docs` Array of Document instances of the same model and for the same tenant
- {Object} `options` Optional settings
  - {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class
    instead of MongoDB Document
  - {Boolean} `forceServerObjectId` (false by default: no limit) Force server to create \_id fields instead of client.

```javascript
newDoc2 = TestModel.new({
  email: 'test2@moltyjs.com',
  password: '1321321',
  name: 'Dwight Schrute',
});

const res = await connection.insertMany([newDoc, newDoc2], {
  moltyClass: false,
});
// Document || Error
```

## Recovering a document

### `find(tenant, collection, query = {}, options = {}) {Promise}`

- {String} `tanant` Tenant name
- {String} `collection` Collection name
- {Object} `query` Query object
- {Object} `options` Optional settings
  - {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class
    instead of MongoDB Document
  - {Number} `limit` (0 by default: no limit) Limit the results to the amount specified
  - {Object} `projection` (null by default) Create a projection of a field, the projection document limits the fields to return for all matching documents

```javascript
const resFind = await connection.find(
  'tenant_test',
  'TestModel',
  {
    name: 'Michael Scott',
  },
  {
    limit: 1,
    projection: { name: 0 },
  },
);
// [Document] || Error
```

## Updating a document

Updating a document support all the [update operators](https://docs.mongodb.com/v3.4/reference/operator/update/) from MongoDB

### `updateOne(tenant, collection, filter, payload, options = {}) {Promise}`

- {String} `tanant` Tenant name
- {String} `collection` Collection name
- {Object} `filter` Filter object used to select the document to update
- {Object} `payload` Payload object used to update the document
- {Object} `options` Optional settings
  - {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class
    instead of MongoDB Document

```javascript
const resUpdate = await connection.updateOne(
  'tenant_test',
  'TestModel',
  { name: 'Michael Scott' },
  {
    $set: {
      name: 'Some other name',
    },
  },
);
// {UpdateResult} || Error
```

### `updateMany(tenant, collection, filter, payload, options = {}) {Promise}`

- {String} `tanant` Tenant name
- {String} `collection` Collection name
- {Object} `filter` Filter object used to select the document to update
- {Object} `payload` Payload object used to update the document
- {Object} `options` Optional settings
- {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class instead of MongoDB Document

```javascript
const resUpdate = await connection.updateMany(
  'tenant_test',
  'TestModel',
  {
    _id: {
      $in: [
        '5aa1530d604da74824a6c170',
        '5aa1530d604da74824a6c171',
        '5aa1530d604da74824a6c172',
        '5aa1530d604da74824a6c173',
      ],
    },
  },
  {
    $set: {
      name: 'Some other name',
    },
  },
);
// {UpdateResult} || Error
```

## Deleting a document

### `deleteOne(tenant, collection, filter, options = {}) {Promise}`

- {String} `tanant` Tenant name
- {String} `collection` Collection name
- {Object} `filter` Filter object used to select the document to delete
- {Object} `options` Optional settings
- {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class instead of MongoDB Document

```javascript
const resUpdate = await connection.deleteOne('tenant_test', 'TestModel', {
  name: 'Michael Scott',
});
// {DeleteResult} || Error
```

### `deleteMany(tenant, collection, filter, options = {}) {Promise}`

- {String} `tanant` Tenant name
- {String} `collection` Collection name
- {Object} `filter` Filter object used to select the document to delete
- {Object} `options` Optional settings
- {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class instead of MongoDB Document

```javascript
const resUpdate = await connection.deleteMany('tenant_test', 'TestModel', {
  _id: {
    $in: [
      '5aa1530d604da74824a6c170',
      '5aa1530d604da74824a6c171',
      '5aa1530d604da74824a6c172',
      '5aa1530d604da74824a6c173',
    ],
  },
});
// {DeleteResult} || Error
```

## Aggregate

Aggregation operations group values from multiple documents together, and can perform a variety of operations on the grouped data to return a single result.

### `aggregate(tenant, collection, pipeline = [], options = {}) {Promise}`

- {String} `tanant` Tenant name
- {String} `collection` Collection name
- {Object[]} `pipeline` Array containing all the aggregation framework commands for the execution.
  - Pipeline stages supported [(use the same syntax as MongoDB Native Driver)](https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/):
    - \$match
    - \$lookup
    - \$project
- {Object} `options` Optional settings
  - "There is no options supported yet"

```javascript
const pipeline = [
  {
    $match: {
      _id: newDoc._data._id,
    },
  },
  {
    $lookup: {
      from: 'ReferenceSchema',
      localField: 'tests',
      foreignField: '_id',
      as: 'models',
    },
  },
  {
    $project: {
      _id: 0,
      tests: 1,
    },
  },
];

const aggregate = await connection.aggregate(
  'tenant_test',
  'TestModel',
  pipeline,
  {},
);
// {Result} || Error
```

## Elastisearch API public

### `search(tenant, collection, query=[]) {Promise}`

### `drop(tenant) {Promise}`
