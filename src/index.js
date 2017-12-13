const mongoClient = require('./clients/mongoClient');
const Schema = require('./schema');
const Model = require('./model');

/**
 * Molty class
 */
class Molty {
  constructor() {
    this.Schema = Schema;

    this.models = {};
    this.connection = null;

    // Binding methods
    this.model = this.model.bind(this);
    this.connect = this.connect.bind(this);
  }

  /**
   * model(): Create a ne model associated to a schema with an specifyc name
   * @param {Schema} schema
   * @param {String} modelName
   *
   * @returns {Model}
   */
  model(schema, modelName) {
    if (this.connection === null)
      throw new Error(
        'You must first connect to the DB before creating a model.',
      );

    if (this.models[modelName])
      throw new Error('There is already a model with the same name');

    this.models[modelName] = new Model(schema, modelName);

    return this.models[modelName];
  }

  /**
   * connect(): Connect to a database through the DBClient
   *
   * @param {Object} options
   *
   *  @returns {Promise}
   */
  connect(options) {
    if (!this.connection) this.connection = mongoClient.connect(options);
    return this.connection;
  }
}

module.exports = exports = new Molty();
