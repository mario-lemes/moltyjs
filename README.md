# What is moltyjs?

A tiny ODM for MongoDB with multy tenancy support.

# Install

```shell
$ npm install moltyjs --save
```

# Usage

```javascript
const { connect } = require('moltys');

// ES2015
import { connect } from ('moltyjs');
```

# Connect to a DB

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

# Create a new Schema

Molty Schema are based on Mongoose Schema structure with some changes on the declaration of the inherit schema options. I even keep some field options name to make the Molty integration as easier as posible in those project are currently running Mongoose.

```javascript
const { connect, Schema } = require('moltys');

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

# TODO

* Populate
* find()
* update()
* delete()
* Add embedded documents and ref document support
* The [mquery](https://github.com/aheckmann/mquery) query builder
