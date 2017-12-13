const MongoDB = require('mongodb');
const MongoDBClient = MongoDB.MongoClient;

const genericPool = require('generic-pool');

const defaultOptions = {
  engine: 'mongodb',
  uri: 'mongodb://localhost:27017/test',
  max: 100,
  min: 1,
};

class ConnectionManager {
  constructor(options) {
    options = Object.assign({}, defaultOptions, options);

    const uri = options.uri;

    this._pool = genericPool.createPool(
      {
        create: () =>
          new Promise((resolve, reject) => {
            MongoDBClient.connect(uri, {
              poolSize: 1,
              native_parser: true,
            }).then(client => {
              console.log('Connection Manager initialized in: ' + uri);
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
      options,
    );
  }

  /**
   * acquire(): Acquire a resource from the DBClient
   *
   * @returns {Promise}
   */
  acquire() {
    if (!this._pool)
      throw new Error(
        'You must first connect to the DB before loading/saving documents.',
      );

    return this._pool.acquire();
  }

  /**
   * acquire(): Release a borrowed resource from the DBClient
   *
   * @returns {Promise}
   */
  release(conn) {
    if (!this._pool)
      throw new Error(
        'You must first connect to the DB before loading/saving documents.',
      );
    return this._pool.release(conn);
  }

  /**
   * Close current client
   *
   * @returns {Promise}
   */
  close() {
    if (!this._pool)
      throw new Error('There is no connection currently active.');
    return this._pool.drain();
  }
}

module.exports = ConnectionManager;
//ConnectionMgr
/*const _ = require('lodash')
const MongoDB = require('mongodb')
const MongoClient = MongoDB.MongoClient
const genericPool = require('generic-pool')

let pool

const defaultOptions = {
  host: 'localhost',
  port: 27017,
  db: 'test',
  max: 100,
  min: 1
}

exports.connect = (options) => {
  options = _.assign({}, defaultOptions, options)
  let mongoUrl = options.uri || options.url

  if (!mongoUrl) {
    if (options.user && options.pass) {
      mongoUrl = `mongodb://${options.user}:${options.pass}@{options.host}:${options.port}/${options.db}`
    } else {
      mongoUrl = `mongodb://${options.host}:${options.port}/${options.db}`
    }
  }
  pool = genericPool.createPool({
    create: () => MongoClient.connect(mongoUrl, {
      poolSize: 1,
      native_parser: true
    }),
    destroy: (client) => client.close()
  }, options)
}

exports.acquire = () => pool.acquire()
exports.release = (conn) => pool.release(conn)*/
