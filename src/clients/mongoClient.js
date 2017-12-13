const ConnectionManager = require('./connectionManager');
const ObjectID = require('mongodb').ObjectID;

const { to } = require('await-to-js');

class MongoClient {
  constructor() {
    this._connectionManager = null;
    this._models = {};
    this._tenants = {};
  }

  /**
   * connect(): Connect to a database through the DBClient
   *
   * @param {Object} options
   *
   *  @returns {Promise}
   */
  connect(options) {
    if (!this._connectionManager)
      this._connectionManager = new ConnectionManager(options);
    return this;
  }

  /**
   * addModel(): Add model to the MongoClient instance so we know
   * all the models side effects needs to take on the DB like
   * ensure indexes
   *
   * @param {Model} model
   */
  addModel(model) {
    const schema = model._schemaNormalized;
    let indexes = [];
    Object.keys(schema).forEach(key => {
      if ('unique' in schema[key] && schema[key].unique) {
        const index = { key: { [key]: 1 }, unique: true, name: key };
        indexes.push(index);
      }
    });
    this._models[model._modelName] = {
      indexes: indexes,
    };
  }

  /**
   * _applyDocumentOptions(): Checkf if the document has associtaed
   * any options from the schema settings like timestamp or discriminators
   *
   * @param {Document} doc
   * @param {Sting} operation ('insert', 'update')
   */
  _applyDocumentOptions(doc, operation) {
    if (doc._options.timestamps && operation === 'insert') {
      doc._data['createdAt'] = new Date();
      doc._data['updatedAt'] = new Date();
    }

    if (doc._options.timestamps && operation === 'update') {
      doc._data['updatedAt'] = new Date();
    }

    return doc;
  }

  /**
   * ObjectId(): Get a unique ObjectId from MongoDB
   *
   * @returns {ObjectID}
   */
  ObjectId() {
    return new ObjectID();
  }

  /**
   * insertOne(): Insert one document into the collection and the
   * tenant specifyed. "forceServerObjectId" is set to true in order
   * to require server side assign _id
   *
   * @param {String} tenant
   * @param {Document} doc
   *
   * @returns {Promise}
   */
  async insertOne(tenant, doc) {
    if (typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    const Document = require('../document');
    if (!(doc instanceof Document))
      throw new Error('The document should be a proper Document instance');

    // Ensure index are created
    await this.createIndexes(
      tenant,
      doc._modelName,
      this._models[doc._modelName].indexes,
    );

    // If is a a document that belong to inherit model set
    // the discriminator key
    if (doc._options.inheritOptions.discriminatorKey) {
      doc._data[
        doc._options.inheritOptions.discriminatorKey
      ] = doc._discriminator ? doc._discriminator : doc._modelName;
    }

    // Running pre insert hooks
    await doc._preHooks.insert.exec();

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        // Check and apply document options before saving
        doc = this._applyDocumentOptions(doc, 'insert');

        const [error, result] = await to(
          conn
            .db(tenant)
            .collection(doc._modelName)
            .insert(doc._data, { forceServerObjectId: true }),
        );

        if (error) {
          return reject(error);
        } else {
          // Running post insert hooks
          await doc._postHooks.insert.exec();

          return resolve(result);
        }
      } catch (error) {
        reject(error);
      } finally {
        this._connectionManager.release(conn);
      }
    });
  }

  /**
   * createIndexes(): Creates indexes on the db and collection collection
   *
   * @param {String} tenant
   * @param {String} collection
   * @param [{String}] fields
   *
   * @returns {Promise}
   */
  async createIndexes(tenant, collection, fields) {
    if (typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    if (typeof collection != 'string')
      throw new Error(
        'Should specify the collection name (String), got: ' + collection,
      );
    if (typeof fields != 'object')
      throw new Error('Should specify the field name (Array), got: ' + fields);

    // Checking if indexes are alreayy set for this tenant and this collection
    if (this._tenants[tenant] && this._tenants[tenant][collection]) return;

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        // Ensure there are no indexes yet
        await to(
          conn
            .db(tenant)
            .collection(collection)
            .dropIndexes(),
        );

        const [error, result] = await to(
          conn
            .db(tenant)
            .collection(collection)
            .createIndexes(fields),
        );

        if (error) {
          return reject(error);
        } else {
          // Set Indexes for this tenant and this collection are already set
          this._tenants[tenant] = {
            ...this._tenants[tenant],
            [collection]: true,
          };
          return resolve(result);
        }
      } catch (error) {
        reject(error);
      } finally {
        this._connectionManager.release(conn);
      }
    });
  }

  /**
   * dropDatabase(): Drop a database, removing it permanently from the server.
   *
   * @param {String} tenant
   * @param {String} collection
   * @param [{String}] fields
   *
   * @returns {Promise}
   */
  async dropDatabase(tenant) {
    if (typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        const [error, result] = await to(conn.db(tenant).dropDatabase());

        if (error) {
          return reject(error);
        } else {
          return resolve(result);
        }
      } catch (error) {
        reject(error);
      } finally {
        this._connectionManager.release(conn);
      }
    });
  }
}

module.exports = new MongoClient();

/*

//DB

const ObjectID = require('mongodb').ObjectID
const to = require('await-to-js').default
const ConnectionMgr = require('./connectionMgr')

exports.find = (tenant, coll, query, page, limit) => {
  return new Promise(async (resolve, reject) => {
    // Acquire a connection
    const conn = ConnectionMgr.acquire()

    // When the connection is available, use it
    conn.then(async (mongo) => {
      limit = limit || 10
      page = page || 1
      query = query || {}
      const skip = page > 0 ? ((page - 1) * limit) : 0
      try {
        const collection = mongo.db(tenant).collection(coll)
        const [error, result] = await to(collection.find(query)
                                .sort({_id: -1})
                                .skip(skip)
                                .limit(limit)
                                .toArray())
        if (error) {
          return reject(error)
        } else {
          return resolve({
            cursor: {
              currentPage: page,
              perPage: limit
            },
            data: result
          })
        }
      } catch (error) {
        reject(error)
      } finally {
        // Release the connection after  us
        ConnectionMgr.release(mongo)
      }
    })
  })
}

exports.insert = (tenant, coll, document) => {
  return new Promise((resolve, reject) => {
    // Acquire a connection
    const conn = ConnectionMgr.acquire()
    conn.then(async (mongo) => {
      try {
        console.log(tenant, coll)
        const collection = mongo.db(tenant).collection(coll)
        const [error, result] = await to(collection.insert(document))

        if (error) {
          return reject(error)
        } else {
          return resolve(result)
        }
      } catch (error) {
        console.log(error)
        reject(error)
      } finally {
        ConnectionMgr.release(mongo)
      }
    })
  })
}

// Model

const to = require('await-to-js').default
const DB = require('../db')

const COLLECTION = 'tasks'

class Task {
  static create (ctx, params, data) {
    return new Promise(async (resolve, reject) => {

      const [error, result] = await to(DB.insert(ctx.tenant, COLLECTION, data))

      if (error) {
        return resolve({error})
      }

      resolve(result)
    })
  }

  static find (ctx, params, query) {
    return new Promise(async (resolve, reject) => {
      const [error, processes] = await to(DB.find(ctx.tenant, COLLECTION))
      if (error) {
        return resolve({error})
      }
      return resolve(processes)
    })
  }
}

module.exports = Task


// Index
const mongoOpts = {
  host: config.mongo.host,
  max: 5,
  min: 1,
  timeout: 30000,
  logout: false
}

// init the connection pool
require('./db/connectionMgr').init(mongoOpts)

const koaBody = require('koa-body')()
const to = require('await-to-js').default
const Task = require('../../models/task')

const create = async function (ctx, next) {
  ctx.status = 201

  const [error, result] = await
                  to(Task.create(ctx, ctx.params, ctx.request.body))

  if (error || result.error) {
    ctx.status = 400
    ctx.body = error || result.error
  } else {
    ctx.body = result
  }

  return next()
}

const find = async function (ctx, next) {
  ctx.status = 200
  const [error, result] = await to(Task.find(ctx, ctx.params, ctx.query))

  if (error || result.error) {
    ctx.status = 400
    ctx.body = error || result.error
  } else {
    ctx.body = result
  }

  return next()
}

exports.register = (router) => {
  // POST api/v1/tasks
  router.post('/tasks', koaBody, create)

  // GET api/v1/tasks
  router.get('/tasks', find)
}*/
