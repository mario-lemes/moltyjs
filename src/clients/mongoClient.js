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

// https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/
const validAggregateOperators = {
  $match: [],
  $lookup: ['from', 'localField', 'foreignField', 'as'],
  $project: [],
};

const defaultTenantsOptions = {
  noListener: false,
  returnNonCachedInstance: false,
};

const defaultFindOptions = {
  moltyClass: true,
  limit: 0,
  projection: null,
};

const defaultInsertOneOptions = {
  moltyClass: true,
  forceServerObjectId: true,
};

const defaultInsertManyOptions = {
  moltyClass: true,
  ordered: false,
  forceServerObjectId: true,
};

const defaultAggregateOptions = {};

class MongoClient {
  constructor() {
    this._connectionManager = null;
    this.models = {};
    this.tenants = {};
    this._indexes = {};
    this._tenantsOptions = {};
  }

  /**
   * connect(): Connect to a database through the DBClient
   *
   * @param {Object} options
   *
   *  @returns {Promise}
   */
  connect(options) {
    this.models = {};
    this.tenants = {};
    this._indexes = {};
    this._tenantsOptions = Object.assign(
      {},
      defaultTenantsOptions,
      options.tenants,
    );

    this._connectionManager = new ConnectionManager(options.connection);
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

    if (model._discriminator && this.models[model._discriminator]) {
      throw new Error(
        'There is already a model with the same name: ' + model._discriminator,
      );
    } else if (!model._discriminator && this.models[model._modelName]) {
      throw new Error(
        'There is already a model with the same name: ' + model._modelName,
      );
    }

    const schema = model._schemaNormalized;
    let indexes = [];
    Object.keys(schema).forEach(key => {
      if ('unique' in schema[key] && schema[key].unique) {
        const index = { key: { [key]: 1 }, unique: true, name: key };
        indexes.push(index);
      }
    });

    this._indexes[model._modelName] = indexes;

    if (model._discriminator) {
      this.models[model._discriminator] = model;
    } else {
      this.models[model._modelName] = model;
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
  _applyHooks(hooksList, objectBinded, tenant) {
    let insertHooks = new Middleware();
    let insertManyHooks = new Middleware();
    let updateHooks = new Middleware();
    let deleteHooks = new Middleware();

    if (hooksList.length > 0) {
      hooksList.forEach(key => {
        switch (key.hook) {
          case 'insertOne':
            insertHooks.use(key.fn.bind(objectBinded, this, tenant));
            break;
          case 'insertMany':
            insertManyHooks.use(key.fn.bind(objectBinded, this, tenant));
            break;
          case 'update':
            updateHooks.use(key.fn.bind(objectBinded, this, tenant));
            break;
          case 'delete':
            deleteHooks.use(key.fn.bind(objectBinded, this, tenant));
            break;
          default:
            throw new Error('Hook "' + key.hook + '" is not allowed.');
            break;
        }
      });
    }
    return {
      insertOne: insertHooks,
      insertMany: insertManyHooks,
      update: updateHooks,
      delete: deleteHooks,
    };
  }

  /**
   * _validateUpdateOperators(): Check if the update operators are correct
   *
   * @param {Object} payload
   */
  _validateUpdateOperators(payload) {
    Object.keys(payload).forEach(operator => {
      if (validUpdateOperators.indexOf(operator) < 0) {
        throw new Error('The update operator is not allowed, got: ' + operator);
      }
    });
  }

  /**
   * _validateAndIndexAggregateOperators(): Check if the aggregate operators
   * are correct and supported
   *
   * @param {Object} pipeline
   */
  _validateAndIndexAggregateOperators(pipeline) {
    let operatorIndexes = {};
    let i = 0;
    for (let stage of pipeline) {
      Object.keys(stage).forEach(operator => {
        // Save the position of all
        if (!operatorIndexes[operator])
          operatorIndexes = { ...operatorIndexes, [operator]: [i] };
        else
          operatorIndexes = {
            ...operatorIndexes,
            [operator]: [operator].push(i),
          };

        if (Object.keys(validAggregateOperators).indexOf(operator) < 0) {
          throw new Error(
            'The aggregate operator is not allowed, got: ' + operator,
          );
        }

        // If the aggregate operator has additional parameters let's check
        // which we support
        if (validAggregateOperators[operator].length > 0) {
          Object.keys(stage[operator]).forEach(suboperator => {
            if (validAggregateOperators[operator].indexOf(suboperator) < 0) {
              throw new Error(
                'The paramater ' +
                  suboperator +
                  ' in ' +
                  operator +
                  ' aggreagate operator is not allowed',
              );
            }
          });
        }
      });
      i++;
    }
    return operatorIndexes;
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
   * _getModelCollectionAndDiscriminator(): Form a document it returns
   * model, collection, discriminatorKey and the discriminator
   * @param {Document} doc
   */
  _getModelCollectionAndDiscriminator(doc) {
    let model = {},
      collection = null,
      discriminatorKey = null,
      discriminator = null;

    if (doc._discriminator) {
      // If the documents we are inserting are from a discriminator model
      if (!this.models[doc._discriminator])
        throw new Error(
          'The collection ' +
            collection +
            'does not exist and is not registered.',
        );
      model = this.models[doc._discriminator];
      discriminatorKey = doc._options.inheritOptions.discriminatorKey;
      discriminator = doc._discriminator;
    } else if (
      this.models[doc._modelName] &&
      Object.keys(this.models[doc._modelName]._childsModels).length > 0
    ) {
      // Else, if the documents are from parent model but has discriminators
      // models
      model = this.models[doc._modelName];
      discriminatorKey = doc._options.inheritOptions.discriminatorKey;
      discriminator = doc._modelName;
    } else {
      // If the docs are not discriminator docs and do not came from a model
      // which has discriminators model
      if (!this.models[doc._modelName])
        throw new Error(
          'The collection ' +
            collection +
            'does not exist and is not registered.',
        );
      model = this.models[doc._modelName];
    }

    collection = doc._modelName;

    return [model, collection, discriminatorKey, discriminator];
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
  async insertOne(doc, options = {}) {
    const Document = require('../document');
    if (!(doc instanceof Document))
      throw new Error('The document should be a proper Document instance');
    if (!doc._tenant && typeof doc._tenant != 'string')
      throw new Error(
        'The document must specify the tenant name (String), got: ' +
          doc._tenant,
      );

    const tenant = doc._tenant;

    // Assign default options to perform the inserOne query
    const insertOneOptions = Object.assign(
      {},
      defaultInsertOneOptions,
      options,
    );

    // If we are inserting a resources in a discriminator model
    // we have to set the proper params and address to the parent collection
    const [
      model,
      collection,
      discriminatorKey,
      discriminator,
    ] = this._getModelCollectionAndDiscriminator(doc);

    // If they have discriminator
    if (discriminator && discriminatorKey) {
      if (doc._data[discriminatorKey])
        throw new Error(
          'You can not include a specific value for the "discriminatorKey" on the doc.',
        );

      doc._data[discriminatorKey] = discriminator;
    }

    const docAux = this._applyDocumentOptions(doc, 'insert');

    // Ensure index are created
    if (this._indexes[collection] && this._indexes[collection].length > 0) {
      await this.createIndexes(tenant, collection, this._indexes[collection]);
    }

    // Apply hooks
    const _preHooksAux = this._applyHooks(model._preHooks, doc, tenant);
    const _postHooksAux = this._applyHooks(model._postHooks, doc, tenant);

    // Running pre insert hooks
    await _preHooksAux.insertOne.exec();

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        const [error, result] = await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .insert(doc._data, insertOneOptions),
        );

        if (error) {
          reject(error);
        } else {
          // Running post insert hooks
          await _postHooksAux.insertOne.exec();
          if (result) {
            if (insertOneOptions.moltyClass) {
              // Binding model properties to the document
              const Document = require('../document');

              const docInserted = new Document(
                result.ops[0],
                model._preHooks,
                model._postHooks,
                model._methods,
                model._schemaOptions,
                model._modelName,
                model._discriminator,
              );

              resolve(docInserted);
            } else {
              resolve(result);
            }
          } else {
            resolve(result);
          }
        }
      } catch (error) {
        reject(error);
      } finally {
        return await this._connectionManager.release(conn);
      }
    });
  }

  /**
   * insertMany(): Inserts an array of documents into MongoDB.
   * If documents passed in do not contain the _id field,
   * one will be added to each of the documents missing it by
   * the driver, mutating the document. This behavior
   * can be overridden by setting the forceServerObjectId flag.
   *
   * @param {String} tenant
   * @param [{Document}] docs
   *
   * @returns {Promise}
   */
  async insertMany(docs, options = {}) {
    if (!(docs instanceof Array))
      throw new Error(
        'The documents should be a proper Array instance with documents',
      );
    if (docs.length <= 0)
      throw new Error('The documents Array should not be empty');
    const Document = require('../document');
    if (!(docs[0] instanceof Document))
      throw new Error('Elements of the Array should be Document instances');
    if (!docs[0]._tenant && typeof docs[0]._tenant != 'string')
      throw new Error(
        'The document must specify the tenant name (String), got: ' +
          docs[0]._tenant,
      );

    const tenant = docs[0]._tenant;

    // Assign default options to perform the inserMany query
    const insertManyOptions = Object.assign(
      {},
      defaultInsertManyOptions,
      options,
    );

    // If we are inserting a resources in a discriminator model
    // we have to set the proper params and address to the parent collection
    const [
      model,
      collection,
      discriminatorKey,
      discriminator,
    ] = this._getModelCollectionAndDiscriminator(docs[0]);

    let arrayDocsData = [];

    // If they have discriminator
    if (discriminator && discriminatorKey) {
      // Loop over each document in the Array
      for (let i = 0; i < docs.length; i++) {
        if (docs[i]._discriminator !== discriminator)
          throw new Error(
            'There are documents in the Array that belongs to different collections.',
          );

        if (docs[i]._data[discriminatorKey])
          throw new Error(
            'You can not include a specific value for the "discriminatorKey" on the doc.',
          );

        docs[i]._data[discriminatorKey] = discriminator;

        // Check and apply document options before saving
        const docAux = this._applyDocumentOptions(docs[i], 'insert');

        // Preparing the doc
        arrayDocsData.push(docAux._data);
      }
    } else {
      // Loop over each document in the Array
      for (let i = 0; i < docs.length; i++) {
        if (docs[i]._modelName !== model._modelName)
          throw new Error(
            'There are documents in the Array that belongs to different collections.',
          );

        // Check and apply document options before saving
        const docAux = this._applyDocumentOptions(docs[i], 'insert');

        // Preparing the doc
        arrayDocsData.push(docAux._data);
      }
    }

    // Ensure index are created
    if (this._indexes[collection] && this._indexes[collection].length > 0) {
      await this.createIndexes(tenant, collection, this._indexes[collection]);
    }

    // Apply hooks
    const _preHooksAux = this._applyHooks(model._preHooks, docs, tenant);
    const _postHooksAux = this._applyHooks(model._postHooks, docs, tenant);

    // Running pre insert hooks
    await _preHooksAux.insertMany.exec();

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        const [error, result] = await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .insertMany(arrayDocsData, insertManyOptions),
        );

        if (error) {
          reject(error);
        } else {
          // Running post insert hooks
          await _postHooksAux.insertMany.exec();

          if (result) {
            if (insertManyOptions.moltyClass) {
              let docInserted = [];
              for (let i = 0; i < result.ops.length; i++) {
                // Binding model properties to the document
                const Document = require('../document');

                docInserted.push(
                  new Document(
                    result.ops[i],
                    model._preHooks,
                    model._postHooks,
                    model._methods,
                    model._schemaOptions,
                    model._modelName,
                    model._discriminator,
                  ),
                );
              }

              resolve(docInserted);
            } else {
              resolve(result);
            }
          } else {
            resolve(result);
          }
        }
      } catch (error) {
        reject(error);
      } finally {
        return await this._connectionManager.release(conn);
      }
    });
  }

  /**
   * find(): Fetches the first document that matches the query
   * into the collection and the tenant specifyed. "
   *
   * @param {String} tenant
   * @param {Object} query
   * @param {Object} options
   *
   * @returns {Promise}
   */
  async find(tenant, collection, query = {}, options = {}) {
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    if (!collection && typeof collection != 'string')
      throw new Error(
        'Should specify the collection name (String), got: ' + collection,
      );

    // Assign default options to perform the find query
    const findOptions = Object.assign({}, defaultFindOptions, options);

    // If we are looking for resources in a discriminator model
    // we have to set the proper filter and addres to the parent collection
    let model = {};
    if (this.models[collection]) {
      const { _discriminator } = this.models[collection];

      if (_discriminator) {
        const { discriminatorKey } = this.models[
          collection
        ]._schemaOptions.inheritOptions;

        if (query[discriminatorKey])
          throw new Error(
            'You can not include a specific value for the "discriminatorKey" on the query.',
          );

        query[discriminatorKey] = collection;
      }
      model = this.models[collection];
      collection = this.models[collection]._modelName;
    } else {
      throw new Error(
        'The collection ' +
          collection +
          'does not exist and is not registered.',
      );
    }

    // Ensure index are created
    if (this._indexes[collection] && this._indexes[collection].length > 0) {
      await this.createIndexes(tenant, collection, this._indexes[collection]);
    }

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        // Get and run the Cursor
        const [error, result] = await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .find(query, {
              limit: findOptions.limit,
              projection: findOptions.projection,
            })
            .toArray(),
        );

        // Run the cursor
        // http://mongodb.github.io/node-mongodb-native/3.0/api/Cursor.html
        /*const [error, result] = await to(
          cursor
            .limit(findOptions.limit)
            .project(findOptions.projection)
            .toArray(),
        );*/

        if (error) {
          reject(error);
        } else {
          if (result) {
            if (findOptions.moltyClass) {
              const Document = require('../document');
              let docs = [];
              result.forEach(doc => {
                docs.push(
                  new Document(
                    doc,
                    model._preHooks,
                    model._postHooks,
                    model._methods,
                    model._schemaOptions,
                    model._modelName,
                    model._discriminator,
                  ),
                );
              });
              resolve(docs);
            } else {
              resolve(result);
            }
          } else {
            resolve(result);
          }
        }
      } catch (error) {
        reject(error);
      } finally {
        return await this._connectionManager.release(conn);
      }
    });
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

    // Check update operators
    this._validateUpdateOperators(payload);

    // If we are updating a resources in a discriminator model
    // we have to set the proper filter and addres to the parent collection
    let model = {};
    if (this.models[collection]) {
      const { _discriminator } = this.models[collection];

      if (_discriminator) {
        const { discriminatorKey } = this.models[
          collection
        ]._schemaOptions.inheritOptions;

        if (filter[discriminatorKey])
          throw new Error(
            'You can not include a specific value for the "discriminatorKey" on the query.',
          );

        filter[discriminatorKey] = collection;
      }

      model = this.models[collection];
      collection = this.models[collection]._modelName;
    } else {
      throw new Error(
        'The collection ' +
          collection +
          'does not exist and is not registered.',
      );
    }

    // Validate the payload
    this._validatePayload(payload, model._schemaNormalized);

    // Ensure index are created
    if (this._indexes[collection] && this._indexes[collection].length > 0) {
      await this.createIndexes(tenant, collection, this._indexes[collection]);
    }

    // Apply hooks
    const _preHooksAux = this._applyHooks(model._preHooks, payload, tenant);
    const _postHooksAux = this._applyHooks(model._postHooks, payload, tenant);

    // Running pre update hooks
    await _preHooksAux.update.exec();

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        const [error, result] = await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .update(filter, payload, options),
        );

        if (error) {
          reject(error);
        } else {
          // Running post update hooks
          await _postHooksAux.update.exec();

          resolve(result.result);
        }
      } catch (error) {
        reject(error);
      } finally {
        return await this._connectionManager.release(conn);
      }
    });
  }

  /**
   * aggregate(): Execute an aggregation framework pipeline against the collection.
   *
   * @param {String} tenant
   * @param {String} collection
   * @param {Object[]} pipeline Array containing all the aggregation framework commands for the execution
   * @param {Object} options Optional settings.
   *
   * @returns {Promise}
   */
  async aggregate(tenant, collection, pipeline = [], options = {}) {
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'Should specify the tenant name (String), got: ' + tenant,
      );
    if (!collection && typeof collection != 'string')
      throw new Error(
        'Should specify the collection name (String), got: ' + collection,
      );

    // Check aggregate operators
    const operatorsIndexes = this._validateAndIndexAggregateOperators(pipeline);

    // Assign default options to perform the aggregate query
    const aggregateOptions = Object.assign(
      {},
      defaultAggregateOptions,
      options,
    );

    // If we are looking for resources in a discriminator model
    // we have to set the proper filter and address to the parent collection
    let model = {};
    if (this.models[collection]) {
      const { _discriminator } = this.models[collection];

      if (_discriminator) {
        const { discriminatorKey } = this.models[
          collection
        ]._schemaOptions.inheritOptions;

        if (pipeline[0]['$match'].discriminatorKey)
          throw new Error(
            'You can not include a specific value for the "discriminatorKey" on the query.',
          );

        pipeline[0]['$match'] = {
          ...pipeline[0]['$match'],
          [discriminatorKey]: collection,
        };
      }
      model = this.models[collection];
      collection = this.models[collection]._modelName;
    } else {
      throw new Error(
        'The collection ' +
          collection +
          'does not exist and is not registered.',
      );
    }

    // Check if there is a $lookup operator in the pipeline with
    // discriminated models pointing out
    if (operatorsIndexes['$lookup']) {
      for (let i = 0; i < operatorsIndexes['$lookup'].length; i++) {
        let lookup = pipeline[operatorsIndexes['$lookup'][i]].$lookup;
        if (this.models[lookup.from]) {
          const { _discriminator } = this.models[lookup.from];
          if (_discriminator) {
            lookup.from = this.models[lookup.from]._modelName;
          }
        }
      }
    }

    // Ensure index are created
    if (this._indexes[collection] && this._indexes[collection].length > 0) {
      await this.createIndexes(tenant, collection, this._indexes[collection]);
    }

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        // Get and run the Cursor
        const [error, result] = await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .aggregate(pipeline, {}) //{} = aggregateOptions
            .toArray(),
        );

        // Run the cursor
        // http://mongodb.github.io/node-mongodb-native/3.0/api/Cursor.html
        /*const [error, result] = await to(
          cursor
            .limit(findOptions.limit)
            .project(findOptions.projection)
            .toArray(),
        );*/

        if (error) {
          reject(error);
        } else {
          if (result) {
            if (aggregateOptions.moltyClass) {
              /* const Document = require('../document');
              let docs = [];
              result.forEach(doc => {
                docs.push(
                  new Document(
                    doc,
                    model._preHooks,
                    model._postHooks,
                    model._methods,
                    model._schemaOptions,
                    model._modelName,
                    model._discriminator,
                  ),
                );
              });
              resolve(docs);*/
              resolve(result);
            } else {
              resolve(result);
            }
          } else {
            resolve(result);
          }
        }
      } catch (error) {
        reject(error);
      } finally {
        return await this._connectionManager.release(conn);
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
    if (this.tenants[tenant] && this.tenants[tenant][collection]) return;

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        // Ensure there are no indexes yet
        await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .dropIndexes(),
        );

        const [error, result] = await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .createIndexes(fields),
        );

        if (error) {
          reject(error);
        } else {
          // Set Indexes for this tenant and this collection are already set
          this.tenants[tenant] = {
            ...this.tenants[tenant],
            [collection]: true,
          };

          resolve(result);
        }
      } catch (error) {
        reject(error);
      } finally {
        return await this._connectionManager.release(conn);
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
        const [error, result] = await to(
          conn.db(tenant, this._tenantsOptions).dropDatabase(),
        );

        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      } finally {
        return await this._connectionManager.release(conn);
      }
    });
  }
}

module.exports = new MongoClient();
