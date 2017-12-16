const mongoClient = require('./clients/mongoClient');
const { isObjectId } = require('./validators');

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
    } else if (!isObjectId(this._data['_id'])) {
      throw new Error('Document _id is not a proper Mongo Object Id');
    }

    // Applying static methods to the document
    Object.keys(methods).forEach(key => {
      this[key] = methods[key].bind(this._data);
    });

    this._preHooks = preHooks;
    this._postHooks = postHooks;
  }
}

module.exports = Document;
