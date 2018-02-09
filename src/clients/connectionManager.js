const MongoOplog = require('mongo-oplog');
const MongoDB = require('mongodb');
const MongoDBClient = MongoDB.MongoClient;

const genericPool = require('generic-pool');
const { to } = require('await-to-js');

const ElasticSearchClient = require('./elasticSearchClient');
const QueueManager = require('../queue/queueManager');

const defaultOptions = {
  engine: 'mongodb',
  uri: 'mongodb://localhost:27017/test',
  max: 100,
  min: 1,
};

class ConnectionManager {
  constructor(options) {
    this.models = {};

    const connectionOptions = Object.assign(
      {},
      defaultOptions,
      options.connection,
    );

    const uri = connectionOptions.uri;

    const i = uri.indexOf('://');
    if (i < 0) {
      throw new Error('No scheme found in URI ' + uri);
    }

    // Initialize Oplog to perform action into ElasticSearch instance
    if (options.elasticSearch && options.elasticSearch.host) {
      if (this._elasticSearch && this._elasticSearch.oplog)
        this._elasticSearch.oplog.destroy();

      this._elasticSearch = new ElasticSearchClient(options.elasticSearch);
      this._queueManager = new QueueManager();

      const oplog = this._initializeMongoOplog(uri);

      Object.assign(this._elasticSearch, oplog);
    }

    this._pool = genericPool.createPool(
      {
        create: () =>
          new Promise((resolve, reject) => {
            MongoDBClient.connect(uri, {
              poolSize: 1,
              native_parser: true,
            }).then(client => {
              resolve(client);
            });
          }),
        destroy: client =>
          new Promise(resolve => {
            client.close().then(() => {
              resolve();
            });
          }),
      },
      connectionOptions,
    );
  }

  /**
   * _parseUri(): Parse Mongo URI to get databasename
   * @param {*} uri
   */
  _parseUri(uri) {
    let opt = null;

    let i = uri.indexOf('?');
    if (i >= 0) {
      opt = uri.substring(i);
    }

    i = uri.indexOf('/', 10);

    return (
      (uri.indexOf('/', 10) < 0 ? uri : uri.substring(0, i)) +
      '/local' +
      (opt || '')
    );
  }

  /**
   * acquire(): Acquire a resource from the DBClient
   *
   * @returns {Promise}
   */
  async acquire() {
    if (!this._pool)
      throw new Error(
        'You must first connect to the DB before loading/saving documents.',
      );

    try {
      return await this._pool.acquire();
    } catch (error) {
      return error;
    }
  }

  /**
   * acquire(): Release a borrowed resource from the DBClient
   *
   * @returns {Promise}
   */
  async release(conn) {
    if (!this._pool)
      throw new Error(
        'You must first connect to the DB before loading/saving documents.',
      );
    try {
      return await this._pool.release(conn);
    } catch (error) {
      return error;
    }
  }

  /**
   * Close current client
   *
   * @returns {Promise}
   */
  async close() {
    if (!this._pool)
      throw new Error('There is no connection currently active.');
    try {
      return await this._pool.drain();
    } catch (error) {
      return error;
    }
  }

  /**
   * _initializeMongoOplog(): Initialize all listeners for
   * Mongo oplog to perform operations into ES instance
   *
   * @param {String} uri
   */
  async _initializeMongoOplog(uri) {
    const oplogUri = this._parseUri(uri);

    const oplog = MongoOplog(oplogUri);

    await oplog.tail();

    /*oplog.on('op', data => {
      console.log('OP', data);
    });*/

    oplog.on('insert', doc => {
      const model = this.models[doc.ns.split('.')[1]];
      if (
        model &&
        model._schemaOptions &&
        model._schemaOptions.elasticSearchIndexes
      ) {
        this._queueManager.pushCommand(
          this._insertDocOnES.bind(this, doc),
          'insert',
          (err, result) => {
            if (err) throw err;
          },
        );
      }
    });

    oplog.on('update', doc => {
      const model = this.models[doc.ns.split('.')[1]];
      if (
        model &&
        model._schemaOptions &&
        model._schemaOptions.elasticSearchIndexes
      ) {
        this._queueManager.pushCommand(
          this._updateDocOnES.bind(this, doc),
          'update',
          (err, result) => {
            if (err) throw err;
          },
        );
      }
    });

    oplog.on('delete', doc => {
      const model = this.models[doc.ns.split('.')[1]];
      if (
        model &&
        model._schemaOptions &&
        model._schemaOptions.elasticSearchIndexes
      ) {
        this._queueManager.pushCommand(
          this._deleteDocOnES.bind(this, doc),
          'delete',
          (err, result) => {
            if (err) throw err;
          },
        );
      }
    });

    /*oplog.on('error', error => {
      console.log('ERROR', error);
    });*/

    oplog.on('end', async () => {
      await oplog.destroy();
    });

    return oplog;
  }

  /**
   * _insertDocOnES(): Insert doc abstract into ES
   *
   * @param {Object} doc
   */
  async _insertDocOnES(doc) {
    const model = this.models[doc.ns.split('.')[1]];
    const { elasticSearchIndexes } = model._schemaOptions;

    let payload = null;
    Object.keys(elasticSearchIndexes).forEach(indexKey => {
      if (Object.keys(doc.o).includes(indexKey)) {
        payload = {
          ...payload,
          [indexKey]: doc.o[indexKey],
        };
      }
    });

    if (payload) {
      const [index, collection] = await this._createIndex(
        elasticSearchIndexes,
        doc,
      );

      if (model._schemaOptions && model._schemaOptions.inheritOptions) {
        const { discriminatorKey } = model._schemaOptions.inheritOptions;
        payload = {
          collection,
          [discriminatorKey]: doc.o[discriminatorKey],
          ...payload,
        };
      } else {
        payload = {
          collection,
          ...payload,
        };
      }

      await this._elasticSearch.addDocument(
        index,
        'doc',
        doc.o._id.toString(),
        payload,
      );
    }
  }

  /**
   * _updateDocOnES(): Update ES record
   *
   * @param {Object} doc
   */
  async _updateDocOnES(doc) {
    const { elasticSearchIndexes } = this.models[
      doc.ns.split('.')[1]
    ]._schemaOptions;

    let payload = null;
    Object.keys(elasticSearchIndexes).forEach(indexKey => {
      Object.keys(doc.o).forEach(updateOperator => {
        if (Object.keys(doc.o[updateOperator]).includes(indexKey)) {
          payload = {
            ...payload,
            [indexKey]: doc.o[updateOperator][indexKey],
          };
        }
      });
    });

    if (payload) {
      const [index, collection] = await this._createIndex(
        elasticSearchIndexes,
        doc,
      );

      await this._elasticSearch.updateDocument(
        index,
        'doc',
        doc.o2._id.toString(),
        payload,
      );
    }
  }

  /**
   * _deleteDocOnES(): Delete ES record
   *
   * @param {Object} doc
   */
  async _deleteDocOnES(doc) {
    const [index, collection] = doc.ns.split('.');
    await this._elasticSearch.deleteDocument(
      index,
      'doc',
      doc.o._id.toString(),
    );
  }

  /**
   * _createIndex(): Check if an index exists, if not
   * create it
   *
   * @param {Object} indexes
   * @param {Object} doc
   *
   * @returns {Array} [index, collection]
   */
  async _createIndex(indexes, doc) {
    const [index, collection] = doc.ns.split('.');
    const [error, indexExists] = await to(
      this._elasticSearch.indexExists(index),
    );

    if (!indexExists) {
      const [error, result] = await to(this._elasticSearch.createIndex(index));

      /*Object.keys(indexes).forEach(index => {
        indexes = {
          ...indexes,
          [index]: {
            ...indexes[index],
            store: true,
          },
        };
      });

      await this._elasticSearch.putMapping(index, collection, indexes);*/
    }

    return [index, collection];
  }

  // ===============================
  // PUBLIC ELASTIC SEARCH API =====
  // ===============================

  /**
   * searchOnES(): Get documents from ES based
   * on its query
   *
   * @param {String} index
   * @param {String} collection
   * @param {Object} query
   *
   * @returns {Array}
   */
  async searchOnES(index, collection, query = []) {
    const model = this.models[collection];
    let match = {};

    if (model._schemaOptions && model._schemaOptions.inheritOptions) {
      const { discriminatorKey } = model._schemaOptions.inheritOptions;
      match = [
        {
          match: {
            collection: model._modelName,
          },
        },
        {
          match: {
            [discriminatorKey]: collection,
          },
        },
      ];
    } else {
      match = {
        match: {
          collection: model._modelName,
        },
      };
    }

    query = {
      bool: {
        must: [...match, ...query],
      },
    };

    return await this._elasticSearch.search(index, 'doc', query);
  }

  /**
   * deleteIndexOnES(): Delete index from ES
   *
   * @param {String} index
   * @param {String} collection
   * @param {Object} query
   *
   * @returns {Array}
   */
  async deleteIndexOnES(index) {
    return await this._elasticSearch.deleteIndex(index);
  }
}

module.exports = ConnectionManager;
