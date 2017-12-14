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
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: 'LEMES',
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

const TestModel = model(newSchema, 'TestModel');
```

# TODO

* Improove documentation
* Populate
* find()
* update()
* delete()
* Add embedded documents and ref document support
* The [mquery](https://github.com/aheckmann/mquery) query builder
