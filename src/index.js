const mongoClient = require('./clients/mongoClient');
const Schema = require('./schema');
const Model = require('./model');

/**
 * Molty class
 */
class Molty {
  constructor() {
    this.Schema = Schema;
    this.Model = Model;

    this.connection = null;

    // Binding methods
    this.connect = this.connect.bind(this);
  }

  /**
   * connect(): Connect to a database through the DBClient
   *
   * @param {Object} options
   *
   *  @returns {Promise}
   */
  connect(options) {
    this.connection = mongoClient.connect(options);
    if (this.connection._connectionManager._elasticSearch) {
      this.connection.ES = {
        search: this.connection._connectionManager.searchOnES.bind(
          this.connection._connectionManager,
        ),
        drop: this.connection._connectionManager.deleteIndexOnES.bind(
          this.connection._connectionManager,
        ),
      };
    }
    return this.connection;
  }
}

module.exports = exports = new Molty();
