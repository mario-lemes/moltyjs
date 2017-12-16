# What is moltyjs?

A tiny ODM for MongoDB with multy tenancy support.

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

```javascript
const { connect } = require('moltys');

const options = {
  engine: 'mongodb', // By default
  uri: 'mongodb://localhost:27017/test',
  max: 100, // By default
  min: 1, // By default
};

const connection = connect(options);
```

"connect()" will return a connection instance which will allow you to perform all the actions availables on the DB.

**Note:** For the time being MoltyJS only support Mongo Databases.

## Drop a DB

```javascript
const res = await connection.dropDatabase('test');
// true
```

## Create a new Schema

Molty Schema are based on Mongoose Schema structure with some changes on the declaration of the inherit schema options. I even keep some field options name to make the Molty integration as easier as posible in those project are currently running Mongoose.

To create a new Schema use the "Schema()" constructor passing the schema and the options:

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

_type_: Mandatory [String, Number, Boolean, Buffer, Date, Array, Object]
_required_: Optional {Boolean}
_unique_: Optional {Boolean}
_default_: Optional
_match_: Optional
_enum_: Optional
_min_: Optional
_max_: Optional
_maxlength_: Optional
_validate_: Optional

And the schema options allowed are:

_timestamps_: Optional
_inheritOptions_: Optional
--_discriminatorKey_: Required once "_inheritOptions_" is set
--_merge_: Optional ['methods', 'preHooks', 'postHooks']

## Create a new Model

Once we have created our schema we need to register as a model so we can start to create, find, updete and delete documents. To do this you must provide the a proper schema and a model name. The model name will be the collection name on the DB so use the criteria you want since Molty does not make any accomodation on them like auto plurilize.

```javascript
const { Model } = require('moltys');

const TestModel = new Model(newSchema, 'TestModel');
```

## Create a Model discriminator

You can also create models which inherits from other models and you can decide in which fashion you wan to do it. You have to make sure that the discriminator key of the child models are the same than the parents and also set what you want to merge from the parent model.

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

methods: which corresponds to the static methods.
preHooks: which corresponds to the hooks that are executed **before** performing actions on the DB
postHooks: which corresponds to the hooks that are executed **after** performing actions on the DB

## Create a new document

Once we have already set up the Schema and registered the Model with it we can start creating document from that Model as follow:

```javascript
const { Model } = require('moltys');

const TestModel = new Model(newSchema, 'TestModel');

newDoc = TestModel.new({
  email: 'test@moltyjs.com',
  password: '1321321',
  name: 'Mario Lemes',
});
```

## Hooks middleware (Work in progress)

Document middleware is supported for the following document functions. In document middleware functions, **this** refers to the document.

save

Query middleware is supported for the following Model and Query functions. In query middleware functions, this refers to the query.

update

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

There are several operations to save a document into the database:

* insertOne

### insertOne()

## Recovering a document

There are several operations to recover a document from the database:

* findOne

# TODO

* Improove documentation
* Populate
* delete()
* Add embedded documents
* The [mquery](https://github.com/aheckmann/mquery) query builder
