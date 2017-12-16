const Middleware = require('../middleware');
const ConnectionManager = require('./connectionManager');
const ObjectID = require('mongodb').ObjectID;
const {
  isValidType,
  isObject,
  isEmptyValue,
  isString,
  isInEnum,
  isNumber,
} = require('../validators');

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
    if (this._connectionManager === null)
      throw new Error(
        'You must first connect to the DB before creating a model.',
      );

    if (this._models[model._modelName] && !model._discriminator)
      throw new Error('There is already a model with the same name');

    const schema = model._schemaNormalized;
    let indexes = [];
    Object.keys(schema).forEach(key => {
      if ('unique' in schema[key] && schema[key].unique) {
        const index = { key: { [key]: 1 }, unique: true, name: key };
        indexes.push(index);
      }
    });

    this._models[model._modelName] = {
      ...this._models[model._modelName],
      indexes,
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
   * _applyHooks(): Promisify and binding document or query to the hooks
   *
   * @param [{Object}] hooksList
   * @param {Object} objectBinded
   *
   * @returns [{Object}]
   */
  _applyHooks(hooksList, objectBinded) {
    let insertHooks = new Middleware();
    let updateHooks = new Middleware();
    let deleteHooks = new Middleware();

    hooksList.forEach(key => {
      switch (key.hook) {
        case 'insert':
          insertHooks.use(key.fn.bind(objectBinded));
          break;
        case 'update':
          updateHooks.use(key.fn.bind(objectBinded));
          break;
        case 'delete':
          deleteHooks.use(key.fn.bind(objectBinded));
          break;
        default:
          throw new Error('Hook "' + key.hook + '" is not allowed.');
          break;
      }
    });

    return { insert: insertHooks, update: updateHooks, delete: deleteHooks };
  }

  /**
   * _validateUpdateOperators(): Check if the update operators are correct
   *
   * @param {Object} payload
   */
  _validateUpdateOperators(payload) {
    // https://docs.mongodb.com/v3.4/reference/operator/update/
    const validUpdateOperators = [
      // Fields
      '$currentDate',
      '$inc',
      '$min',
      '$max',
      '$mul',
      '$rename',
      '$set',
      '$setOnInsert',
      '$unset',
      // Array
      '$',
      '$addToSet',
      '$pop',
      '$pull',
      '$pushAll',
      '$push',
      '$pullAll',
      // Modifiers
      '$each',
      '$position',
      '$slice',
      '$sort',
      // Bitwise
      '$bit',
      '$isolated',
    ];
    Object.keys(payload).forEach(operator => {
      if (validUpdateOperators.indexOf(operator) < 0) {
        throw new Error('The update operator is not allowed, got: ' + operator);
      }
      return;
    });
  }

  /**
   * _validatePayload(): Check if the payload is valid based on the model schema
   *
   * @params {Object} payload
   * @params {Object} schema
   *
   * @returns {Boolean}
   */
  _validatePayload(payload, schema) {
    Object.keys(payload).forEach(operator => {
      Object.keys(payload[operator]).forEach(key => {
        let value = payload[operator][key];

        if (schema[key] === undefined) {
          throw new Error(
            'Field name ' +
              key +
              ' does not correspond to any field name on the schema',
          );
        }

        // Objects nested
        if (!schema[key].type && isObject(value)) {
          return this._validatePayload(value, schema[key]);
        }

        // Validation type
        if (!isValidType(value, schema[key].type)) {
          throw new Error(
            'Unsuported value (' + value + ') for type ' + schema[key].type,
          );
        }

        // Reg exp validation
        if (
          schema[key].match &&
          isString(value) &&
          !schema[key].match.test(value)
        ) {
          throw new Error(
            'Value assigned to ' +
              key +
              ' does not match the regex/string ' +
              schema[key].match.toString() +
              '. Value was ' +
              value,
          );
        }

        // Enum validation
        if (!isInEnum(schema[key].enum, value)) {
          throw new Error(
            'Value assigned to ' +
              key +
              ' should be in enum [' +
              schema[key].enum.join(', ') +
              '], got ' +
              value,
          );
        }

        // Min value validation
        if (isNumber(schema[key].min) && value < schema[key].min) {
          throw new Error(
            'Value assigned to ' +
              key +
              ' is less than min, ' +
              schema[key].min +
              ', got ' +
              value,
          );
        }

        // Max value validation
        if (isNumber(schema[key].max) && value > schema[key].max) {
          throw new Error(
            'Value assigned to ' +
              key +
              ' is less than max, ' +
              schema[key].max +
              ', got ' +
              value,
          );
        }

        // Max lenght validation
        if (
          schema[key].maxlength &&
          isString(value) &&
          value.length > schema[key].maxlength
        ) {
          throw new Error(
            'Value assigned to ' +
              key +
              ' is bigger than ' +
              schema[key].maxlength.toString() +
              '. Value was ' +
              value.length,
          );
        }

        // Custom validation
        if (
          typeof schema[key].validate === 'function' &&
          !schema[key].validate(value)
        ) {
          throw new Error(
            'Value assigned to ' +
              key +
              ' failed custom validator. Value was ' +
              value,
          );
        }
      });
    });
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
    if (
      doc._options.inheritOptions &&
      doc._options.inheritOptions.discriminatorKey
    ) {
      doc._data[
        doc._options.inheritOptions.discriminatorKey
      ] = doc._discriminator ? doc._discriminator : doc._modelName;
    }

    // Ensure index are created
    if (
      this._models[doc._modelName] &&
      this._models[doc._modelName].indexes.length > 0
    ) {
      await this.createIndexes(
        tenant,
        doc._modelName,
        this._models[doc._modelName].indexes,
      );
    }

    // Apply hooks
    const _preHooksAux = this._applyHooks(doc._preHooks, doc);
    const _postHooksAux = this._applyHooks(doc._postHooks, doc);

    // Running pre insert hooks
    await _preHooksAux.insert.exec();

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
          await _postHooksAux.insert.exec();

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
    } else if (this._models[collection]) {
      model = this._models[collection].model;
    } else {
      throw new Error(
        'The collection ' +
          collection +
          'does not exist and is not registered.',
      );
    }

    // Ensure index are created
    if (
      this._models[collection] &&
      this._models[collection].indexes.length > 0
    ) {
      await this.createIndexes(
        tenant,
        collection,
        this._models[collection].indexes,
      );
    }

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        const [error, result] = await to(
          conn
            .db(tenant)
            .collection(collection)
            .findOne(query, options),
        );

        if (error) {
          return reject(error);
        } else {
          if (result) {
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
          } else {
            return resolve(result);
          }
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
   * updateOne(): Update a single document on MongoDB.
   *
   * @param {String} tenant
   * @param {String} collection
   * @param {Object} filter  The Filter used to select the document to update
   * @param {Object} payload The update operations to be applied to the document
   * @param {Object} options Optional settings.
   *
   * @returns {Promise}
   */
  async updateOne(tenant, collection, filter, payload, options = {}) {
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    if (!collection && typeof collection != 'string')
      throw new Error(
        'Should specify the collection name (String), got: ' + collection,
      );
    if (!filter && typeof filter != 'object')
      throw new Error('Should specify the filter options, got: ' + filter);
    if (!payload && typeof payload != 'string')
      throw new Error('Should specify the payload object, got: ' + payload);

    // If we are looking for resources in a discriminator model
    // we have to set the proper filter and addres to the parent collection
    let model = {};
    if (this._discriminatorModels[collection]) {
      if (filter[this._discriminatorModels[collection].discriminatorKey])
        throw new Error(
          'You can not include a specific value for the "discriminatorKey" on the query.',
        );

      filter[
        this._discriminatorModels[collection].discriminatorKey
      ] = collection;
      model = this._discriminatorModels[collection].model;
      collection = this._discriminatorModels[collection].parent;
    } else if (this._models[collection]) {
      model = this._models[collection].model;
    } else {
      throw new Error(
        'The collection ' +
          collection +
          'does not exist and is not registered.',
      );
    }

    // Check update operators
    this._validateUpdateOperators(payload);

    // Validate the payload
    this._validatePayload(payload, model._schemaNormalized);

    // Ensure index are created
    if (
      this._models[collection] &&
      this._models[collection].indexes.length > 0
    ) {
      await this.createIndexes(
        tenant,
        collection,
        this._models[collection].indexes,
      );
    }

    // Apply hooks
    const _preHooksAux = this._applyHooks(model._preHooks, payload);
    const _postHooksAux = this._applyHooks(model._postHooks, payload);

    // Running pre update hooks
    await _preHooksAux.update.exec();

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        const [error, result] = await to(
          conn
            .db(tenant)
            .collection(model._modelName)
            .update(filter, payload, options),
        );

        if (error) {
          return reject(error);
        } else {
          // Running post update hooks
          await _postHooksAux.update.exec();

          return resolve(result.result);
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
