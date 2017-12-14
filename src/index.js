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
    this.Model = this.Model.bind(this);
    this.connect = this.connect.bind(this);
  }

  /**
   * Model(): Create a new model associated to a schema with an specifyc name.
   * Used as a model contructor of the Model class.
   * @param {Schema} schema
   * @param {String} modelName
   *
   * @returns {Model}
   */
  Model(schema, modelName) {
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
