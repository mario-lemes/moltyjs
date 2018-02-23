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
  $lookup: ['from', 'localField', 'foreignField', 'as', 'let', 'pipeline'],
  $project: [],
  $replaceRoot: [],
  $facet: [],
  $unwind: [],
  $group: [],
  $count: [],
  $group: [],
  $addFields: [],
  $redact: [],
};

const defaultTenantsOptions = {
  noListener: false,
  returnNonCachedInstance: false,
};

/**
 * DEFAULT METHODS OPTIONS
 */
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

const defaultUpdateOneOptions = {
  moltyClass: true,
  upsert: false,
};

const defaultAggregateOptions = {
  moltyClass: true,
};

const defaultDeleteOneOptions = {
  moltyClass: true,
};

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

    try {
      this._connectionManager = new ConnectionManager(options);

      return this;
    } catch (error) {
      throw error;
    }
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

    // Update models into the connection manager
    this._connectionManager.models = this.models;
  }

  /**
   * _applyTimestamps(): Checkf if the model has associtaed
   * any options from the schema settings like timestamp and apply
   * to the object
   *
   * @param {Object} obj
   * @param {Sting} operation ('insert', 'update')
   */
  _applyTimestamps(obj, model, operation) {
    if (model._schemaOptions.timestamps && operation === 'insert') {
      obj._data['createdAt'] = new Date();
      obj._data['updatedAt'] = new Date();
    }

    if (model._schemaOptions.timestamps && operation === 'update') {
      obj['$currentDate'] = {
        updatedAt: true,
      };
    }

    return obj;
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
   * _validateAggregateOperators(): Check if the aggregate operators
   * are correct and supported
   *
   * @param {Object} pipeline
   */
  _validateAggregateOperators(pipeline) {
    for (let stage of pipeline) {
      Object.keys(stage).forEach(operator => {
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

        if (operator === '$lookup' && stage['$lookup']['pipeline']) {
          return this._validateAggregateOperators(stage['$lookup']['pipeline']);
        }
      });
    }
  }

  /**
   * _normalizeAggregatePipeline(): Normalize $looup stages in the aggregate
   * pipeline in case of discriminated models
   *
   * @param {Object} pipeline
   *
   * @returns {Array}
   */
  _normalizeAggregatePipeline(pipeline, parentDiscriminator) {
    for (let stage of pipeline) {
      Object.keys(stage).forEach(operator => {
        if (operator === '$lookup') {
          // Check if there is a $lookup operator in the pipeline with
          // discriminated models pointing out

          let _discriminator = null;
          let lookupFrom = stage['$lookup'].from;
          if (this.models[lookupFrom]) {
            _discriminator = this.models[lookupFrom]._discriminator;
            if (_discriminator) {
              stage['$lookup'].from = this.models[lookupFrom]._modelName;
            }
          }

          if (stage['$lookup']['pipeline']) {
            return this._normalizeAggregatePipeline(
              stage['$lookup']['pipeline'],
              _discriminator,
            );
          }
        }
      });
    }

    if (parentDiscriminator) {
      const { discriminatorKey } = this.models[
        parentDiscriminator
      ]._schemaOptions.inheritOptions;

      if (pipeline[0]['$match'] && pipeline[0]['$match'].discriminatorKey)
        throw new Error(
          'You can not include a specific value for the "discriminatorKey" on the query.',
        );

      const pipelineKeys = Object.keys(pipeline[0]);

      pipeline.unshift({
        $match: { [discriminatorKey]: parentDiscriminator },
      });
    }

    return pipeline;
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
  async insertOne(tenant, doc, options = {}) {
    const Document = require('../document');
    if (!(doc instanceof Document))
      throw new Error('The document should be a proper Document instance');
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'The document must specify the tenant name (String), got: ' + tenant,
      );

    // Assign default options to perform the inserOne query
    const insertOneOptions = Object.assign(
      {},
      defaultInsertOneOptions,
      options,
    );

    const moltyClassEnabled = insertOneOptions.moltyClass;
    delete insertOneOptions.moltyClass;

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

    const docAux = this._applyTimestamps(doc, model, 'insert');

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
            if (moltyClassEnabled) {
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
  async insertMany(tenant, docs, options = {}) {
    if (!(docs instanceof Array))
      throw new Error(
        'The documents should be a proper Array instance with documents',
      );
    if (docs.length <= 0)
      throw new Error('The documents Array should not be empty');
    const Document = require('../document');
    if (!(docs[0] instanceof Document))
      throw new Error('Elements of the Array should be Document instances');
    if (!tenant && typeof tenant != 'string')
      throw new Error(
        'The document must specify the tenant name (String), got: ' + tenant,
      );

    // Assign default options to perform the inserMany query
    const insertManyOptions = Object.assign(
      {},
      defaultInsertManyOptions,
      options,
    );

    const moltyClassEnabled = insertManyOptions.moltyClass;
    delete insertManyOptions.moltyClass;

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
        const docAux = this._applyTimestamps(docs[i], model, 'insert');

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
        const docAux = this._applyTimestamps(docs[i], model, 'insert');

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
            if (moltyClassEnabled) {
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

    const moltyClassEnabled = findOptions.moltyClass;
    delete findOptions.moltyClass;

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
            if (moltyClassEnabled) {
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

    // Assign default options to perform the updateOne query
    const updateOneOptions = Object.assign(
      {},
      defaultUpdateOneOptions,
      options,
    );

    const moltyClassEnabled = updateOneOptions.moltyClass;
    delete updateOneOptions.moltyClass;

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

    payload = this._applyTimestamps(payload, model, 'update');

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
            .updateOne(filter, payload, updateOneOptions),
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

    // Assign default options to perform the aggregate query
    const aggregateOptions = Object.assign(
      {},
      defaultAggregateOptions,
      options,
    );

    const moltyClassEnabled = aggregateOptions.moltyClass;
    delete aggregateOptions.moltyClass;

    this._validateAggregateOperators(pipeline);

    // If we are looking for resources in a discriminator model
    // we have to set the proper filter and address to the parent collection
    let model = {},
      discriminator = null;
    if (this.models[collection]) {
      const { _discriminator } = this.models[collection];

      if (_discriminator) {
        const { discriminatorKey } = this.models[
          collection
        ]._schemaOptions.inheritOptions;

        if (pipeline[0]['$match'] && pipeline[0]['$match'].discriminatorKey)
          throw new Error(
            'You can not include a specific value for the "discriminatorKey" on the query.',
          );

        discriminator = collection;
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

    // Check all stages in the pipeline looking for any lookup stage
    // pointing out to a discriminated model
    pipeline = this._normalizeAggregatePipeline(pipeline, discriminator);

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
            .aggregate(pipeline, aggregateOptions)
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
            if (moltyClassEnabled) {
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
   * deleteOne(): Delete a single document on MongoDB.
   *
   * @param {String} tenant
   * @param {String} collection
   * @param {Object} filter  The Filter used to select the document to delete
   * @param {Object} options Optional settings.
   *
   * @returns {Promise}
   */
  async deleteOne(tenant, collection, filter, options = {}) {
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

    // Assign default options to perform the deleteOne query
    const deleteOneOptions = Object.assign(
      {},
      defaultDeleteOneOptions,
      options,
    );

    const moltyClassEnabled = deleteOneOptions.moltyClass;
    delete deleteOneOptions.moltyClass;

    // If we are deleting a resources in a discriminator model
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

    // Ensure index are created
    if (this._indexes[collection] && this._indexes[collection].length > 0) {
      await this.createIndexes(tenant, collection, this._indexes[collection]);
    }

    // Apply hooks
    const _preHooksAux = this._applyHooks(model._preHooks, filter, tenant);
    const _postHooksAux = this._applyHooks(model._postHooks, filter, tenant);

    // Running pre delete hooks
    await _preHooksAux.delete.exec();

    // Acquiring db instance
    const conn = await this._connectionManager.acquire();

    return new Promise(async (resolve, reject) => {
      try {
        const [error, result] = await to(
          conn
            .db(tenant, this._tenantsOptions)
            .collection(collection)
            .deleteOne(filter, deleteOneOptions),
        );

        if (error) {
          reject(error);
        } else {
          // Running post delete hooks
          await _postHooksAux.delete.exec();

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
