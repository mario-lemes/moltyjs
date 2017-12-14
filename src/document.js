const Middleware = require('./middleware');

const mongoClient = require('./clients/mongoClient');

class Document {
  constructor(
    data,
    preHooks,
    postHooks,
    methods,
    schemaOptions,
    modelName,
    discriminator,
  ) {
    this._data = data;
    //this._methods = methods;
    this._modelName = modelName;
    this._options = schemaOptions;
    this._discriminator = discriminator ? discriminator : null;

    // Assigning a proper ObjectId
    if (!this._data['_id']) {
      this._data['_id'] = mongoClient.ObjectId();
    } else if (!mongoClient.isValidObjectId(this._data['_id'])) {
      throw new Error('Document _id is not a proper Mongo Object Id');
    }

    // Applying static methods to the document
    Object.keys(methods).forEach(key => {
      this[key] = methods[key].bind(this._data);
    });

    // Bind hooks to the document recently created
    this._preHooks = this._applyHooks(preHooks, methods);
    this._postHooks = this._applyHooks(postHooks, methods);
  }

  /**
   * _applyHooks(): Promisify and binding document and static
   * methods to the hooks
   *
   * @param [{Object}] hooksList
   * @param {Object} methods
   *
   * @returns [{Object}]
   */
  _applyHooks(hooksList, methods) {
    let insertHooks = new Middleware();
    let updateHooks = new Middleware();
    let deleteHooks = new Middleware();

    hooksList.forEach(key => {
      switch (key.hook) {
        case 'insert':
          insertHooks.use(key.fn.bind(this));
          break;
        case 'update':
          updateHooks.use(key.fn.bind(this));
          break;
        case 'delete':
          deleteHooks.use(key.fn.bind(this));
          break;
        default:
          throw new Error('Hook "' + key.hook + '" is not allowed.');
          break;
      }
    });

    return { insert: insertHooks, update: updateHooks, delete: deleteHooks };
  }
}

module.exports = Document;
