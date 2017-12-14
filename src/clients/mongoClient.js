const ConnectionManager = require('./connectionManager');
const ObjectID = require('mongodb').ObjectID;

const { to } = require('await-to-js');

class MongoClient {
  constructor() {
    this._connectionManager = null;
    this._models = {};
    this._discriminatorModels = {};
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

    if (model._discriminator) {
      this._discriminatorModels[model._discriminator] = {
        model,
        parent: model._modelName,
        discriminatorKey: model._schemaOptions.inheritOptions.discriminatorKey,
      };
    } else {
      this._models[model._modelName].model = model;
    }
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
   * isValidObjectId(): Checks if a value is a valid bson ObjectId
   *
   * @returns {Boolean}
   */
  isValidObjectId(id) {
    return ObjectID.isValid(id);
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
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    const Document = require('../document');
    if (!(doc instanceof Document))
      throw new Error('The document should be a proper Document instance');

    // If is a a document that belong to inherit model set
    // the discriminator key
    if (doc._options.inheritOptions.discriminatorKey) {
      doc._data[
        doc._options.inheritOptions.discriminatorKey
      ] = doc._discriminator ? doc._discriminator : doc._modelName;
    }

    // Ensure index are created
    await this.createIndexes(
      tenant,
      doc._modelName,
      this._models[doc._modelName].indexes,
    );

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
   * findOne(): Fetches the first document that matches the query
   * into the collection and the tenant specifyed. "
   *
   * @param {String} tenant
   * @param {Object} query
   * @param {Object} options
   *
   * @returns {Promise}
   */
  async findOne(tenant, collection, query = {}, options = {}) {
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    if (!collection && typeof collection != 'string')
      throw new Error(
        'Should specify the collection name (String), got: ' + collection,
      );

    // If we are looking for resources in a discriminator model
    // we have to set the proper query and addres to the parent collection
    let model = {};
    if (this._discriminatorModels[collection]) {
      if (query[this._discriminatorModels[collection].discriminatorKey])
        throw new Error(
          'You can not include a specific value for the "discriminatorKey" on the query.',
        );

      query[
        this._discriminatorModels[collection].discriminatorKey
      ] = collection;
      model = this._discriminatorModels[collection].model;
      collection = this._discriminatorModels[collection].parent;
    } else {
      model = this._models[collection].model;
    }

    // Ensure index are created
    await this.createIndexes(
      tenant,
      collection,
      this._models[collection].indexes,
    );

    // Running pre insert hooks
    //await doc._preHooks.insert.exec();

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        // Check and apply document options before saving
        //doc = this._applyDocumentOptions(doc, 'insert');

        const [error, result] = await to(
          conn
            .db(tenant)
            .collection(collection)
            .findOne(query, options),
        );

        if (error) {
          return reject(error);
        } else {
          // Running post insert hooks
          //await doc._postHooks.insert.exec();

          // Binding model properties to the document
          const Document = require('../document');
          const doc = new Document(
            result,
            model._preHooks,
            model._postHooks,
            model._methods,
            model._schemaOptions,
            model._modelName,
            model._discriminator,
          );

          return resolve(doc);
        }
      } catch (error) {
        reject(error);
      } finally {
        this._connectionManager.release(conn);
      }
    });
  }

  async find() {
    // When the connection is available, use it
    /*conn.then(async (mongo) => {
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
      }*/
    throw new Error('Sorry, "find()" method is not supported yet');
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
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    if (!collection && typeof collection != 'string')
      throw new Error(
        'Should specify the collection name (String), got: ' + collection,
      );
    if (!fields && typeof fields != 'object')
      throw new Error('Should specify the field name (Array), got: ' + fields);

    // Checking if indexes are already set for this tenant and this collection
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
    if (!tenant && typeof tenant != 'string')
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
