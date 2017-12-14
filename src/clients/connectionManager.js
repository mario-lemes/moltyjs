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
