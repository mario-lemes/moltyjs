[![npm version](https://badge.fury.io/js/moltyjs.svg)](https://badge.fury.io/js/moltyjs)

# What is moltyjs?

A tiny ODM for MongoDB with multy tenancy support.

**NOTE: THIS LIBRARY IS NOT SUITABLE FOR A PRODUCTION ENVIRONMENT, IS STILL UNDER CONSTRUCCTIONS AND MIGTH BE BREAKING CHANGES FROM ONE COMMIT TO ANOTHER. PLEASE, USE IT CAREFULLY AND CHECK THE DOCUMENTATION IN EACH VERSION RELEASE AND THE CHANGELOG. THANK YOU!**

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
  connection: {
    engine: 'mongodb', // By default
    uri: 'mongodb://localhost:27017/test',
    max: 100, // By default
    min: 1, // By default
  },
  tenants: {
    noListener: false, // By default
    returnNonCachedInstance: false, // By default
  },
};

const connection = connect(options);
```

"connect()" will return a connection instance which will allow you to perform all the actions availables on the DB.

**Note:** For the time being MoltyJS only support Mongo Databases.

## Drop a DB

### `.dropDatabase(database)`

```javascript
const res = await connection.dropDatabase('test');
// true
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

* _type_: Is the only one which is mandatory and could be a **String, Number, Boolean, Buffer, Date, Array, Object, ObjectId** or an array **[]** of any of them.
* _ref_: Optional and should be the Model name associated to the collection you want to refeer. The _type_ of areference field must be **ObjectId** or **[ObjectId]**.
* _required_: Optional and only allow **Boolean** values.
* _unique_: Optional and only allow **Boolean** values.
* _default_: Optional, only allows values of the same type which is set on the _type_ property. You also can assigna a function to it which return a value with the correct type.
* _match_: Optional, allows either RegExp or **String** to validate the value of the field.
* _enum_: Optional, and must be an array of values of the same type is set on _type_.
* _min_: Optional, minimum number allowed.
* _max_: Optional, maximum number allowed.
* _maxlength_: Optional, maximum length of a **String**
* _validate_: Optional, function to perform a custom validation. Value of the field, connection instance and tenant name is passing through the function args:

```javascript
const { Schema } = require('moltys');

const otherSchema = Schema({
  job: {
    type: String,
    validate: async (value, tenant, connection) => {
      const exists = await connection.find(tenant, 'TestModel', {
        job: value,
      });

      // If the document already exists we
      // propagate an error returning false
      if (exists) return false;

      return true;
    },
  },
});
```

And the schema options allowed are:

* _timestamps_: Optional, set automatically in the documents saved or updated in the DB the fields: `createdAt` and `updatedAt`
* _inheritOptions_: Optional, used for inherit from a parent Schema
  * _discriminatorKey_: Required once "_inheritOptions_" is set
  * _merge_: Optional, must be an array with a combination of these three values ['methods', 'preHooks', 'postHooks'], depending of what you want to merge from the parent Schema.

## Static methods

You can extend the functionality of Document class adding static method to work with the documents instances:

```javascript
newSchema.methods.comparePassword = async function(candidatePassword) {
  const user = this._data;
  return candidatePassword === user.password;
};

// Later on, after creating a model associated to the schema and then a new document from that model

const TestModel = new Model(newSchema, 'TestModel');

newDoc = TestModel.new(
  {
    email: 'test@moltyjs.com',
    password: '1321321',
    name: 'Michael Scott',
  },
  'test',
);

// You can call static methods from the document itself
newDoc.comparePassword('000000'); // false
```

## Hooks middleware

All hooks have binded the connection instance and the tenant name beside the document or the query depending of the hook.

#### Document middleware is supported for the following document functions.

* insertOne
* insertMany

In document middleware functions, **this** refers to the document or to the array of documents.

Examples:

```javascript
// Pre hooks on insertOne
newSchema.pre('insertOne', function(connection, tenant, next) {
  // this refers to the document
  console.log(this);
  return next();
});

// Post hooks on insertOne
newSchema.post('insertOne', function(connection, tenant, next) {
  // From any pre or post hook of Document middleware
  // you can call to any of the static methos associated
  // to the docuemnt
  this.staticMethod();
  return next();
});

// Pre hooks on insertMany
newSchema.pre('insertMany', function(connection, tenant, next) {
  // this refers to the array os documents since the method that
  // trigger this hook is 'insertMany'
  console.log(this); // [{Document}, {Document}]
  return next();
});

// Post hooks on insertMany
newSchema.post('insertMany', async function(connection, tenant, next) {
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

#### Query middleware is supported for the following Model and Query functions.

* update

Examples:

```javascript
// Pre hooks on update
newSchema.pre('update', function(connection, tenant, next) {
  // this refers to the update query
  console.log(this); // Ex. { $set: {jobTitle: 'Test' }}
  return next();
});

// Post hooks on update
newSchema.post('update', async function(connection, tenant, next) {
  //...
  return next();
});
```

In query middleware functions, **this** refers to the query.

## Create a new Model

Once we have created our schema we need to register as a model so we can start to create, find, updete and delete documents. To do this you must provide the a proper schema and a model name. The model name will be the collection name on the DB so use the criteria you want since Molty does not make any accomodation on them like auto plurilize.

### `new Model(schema, discriminatorName)`

```javascript
const { Model } = require('moltys');

const TestModel = new Model(newSchema, 'TestModel');
```

## Create a Model discriminator

You can also create models which inherits from other models and you can decide in which fashion you wan to do it. You have to make sure that the discriminator key of the child models are the same than the parents and also set what you want to merge from the parent model.

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

The **merge** option must be an array with the element you want to merge from the parent model, teh options are:

* methods: which corresponds to the static methods.
* preHooks: which corresponds to the hooks that are executed **before** performing actions on the DB
* postHooks: which corresponds to the hooks that are executed **after** performing actions on the DB

## Create a new document

Once we have already set up the Schema and registered the Model with it we can start creating document from that Model as follow:

### `.new(payload, tenant)`

```javascript
const { Model } = require('moltys');

const TestModel = new Model(newSchema, 'TestModel');

newDoc = TestModel.new(
  {
    email: 'test@moltyjs.com',
    password: '1321321',
    name: 'Michael Scott',
  },
  'test',
);
```

**Note**: The tenant name is required to allow performing actions against the DB in the validate schema fields function, in the static methods and also in the hooks. This librarie was built to cover a lack of mongo multytenancy libraries support, if you are only working with a single tenant you can just pass the same value as a constant.

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

### `insertOne(doc, options = {})`

* {Document} `doc` Document instance object
* {Object} `options` Optional settings
  * {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class
    instead of MongoDB Document
  * {Boolean} `forceServerObjectId` (false by default: no limit) Force server to create \_id fields instead of client.

```javascript
const res = await connection.insertOne(newDoc);
// Document || Error
```

### `insertMany(docs, options = {})`

* [{Document}] `docs` Array of Document instances of the same model and for the same tenant
* {Object} `options` Optional settings
  * {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class
    instead of MongoDB Document
  * {Boolean} `forceServerObjectId` (false by default: no limit) Force server to create \_id fields instead of client.

```javascript
newDoc2 = TestModel.new({
  email: 'test2@moltyjs.com',
  password: '1321321',
  name: 'Dwight Schrute',
}, 'test');

const res = await connection.insertMany([newDoc, newDoc2], {moltyClass: false});
// Document || Error
```

## Recovering a document

### `find(tenant, collection, query = {}, options = {})`

* {String} `tanant` Tenant name
* {String} `collection` Collection name
* {Object} `query` Query object
* {Object} `options` Optional settings
  * {Boolean} `moltyClass` (true by default) True if you want the results as MoltyJs Document class
    instead of MongoDB Document
  * {Number} `limit` (0 by default: no limit) Limit the results to the amount specified
  * {Object} `projection` (null by default) Create a projection of a field, the projection document limits the fields to return for all matching documents

```javascript
const resFind = await connection.find('tenant_test', 'TestModel',
{
  name: 'Michael Scott',
},
{
  limit: 1,
  projection: { name: 0 }
});
// [Document] || Error
```

## Updating a document

### `updateOne(tenant, collection, filter, payload, options = {})`

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

Updating a document support all the [update operators](https://docs.mongodb.com/v3.4/reference/operator/update/) from MongoDB
