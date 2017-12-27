const mongoClient = require('./clients/mongoClient');
const Document = require('./document');

const {
  isValidType,
  isObject,
  isArray,
  isEmptyValue,
  isString,
  isInEnum,
  isNumber,
} = require('./validators');

class Model {
  /**
   * Model(): Model conmstructor
   *
   * @param {Schema} schema
   * @param {String} modelName
   *
   * @returns {Model}
   */
  constructor(schema, modelName, discriminator = null) {
    if (arguments.length < 1) throw new Error('Schema is missing');

    this._schemaNormalized = schema._schema;
    this._schemaOptions = schema._options;

    this._modelName = modelName.replace(/\s/g, '');

    this._preHooks = schema._preHooks;
    this._postHooks = schema._postHooks;

    this._childsModels = {};

    this._methods = {};
    this._validateStaticMethodsName(schema.methods, this._schemaNormalized);

    this._methods = schema.methods;

    this._discriminator = discriminator;

    mongoClient.addModel(this);
  }

  /**
   * _validateStaticMethodsName(): Check if there is an static method
   * with the same name as schema field
   *
   * @param {Object} methods
   * @params {Object} schema
   */
  _validateStaticMethodsName(methods, schema) {
    Object.keys(methods).forEach(key => {
      if (key === '_preHooks' || key === '_postHooks' || key === '_data')
        throw new Error('Static methods can not be called like: ' + key);

      if (key in schema)
        throw new Error(
          'Static methods can not be called like an schema field name: ' + key,
        );

      // Objects nested
      if (schema[key] && !schema[key].type && isObject(schema[key])) {
        return this._validateStaticMethodsName(methods, schema[key]);
      }
    });
  }

  /**
   * _validateDiscriminatorName(): Check if there is a schema field
   * with the same name as the discriminator key
   *
   * @param {Object} discriminator
   * @params {Object} schema
   */
  _validateDiscriminatorName(discriminator, schema) {
    Object.keys(schema).forEach(key => {
      if (key === '_preHooks' || key === '_postHooks' || key === '_data')
        throw new Error(
          'Discriminator name can not be called like this: ' + key,
        );

      if (key === discriminator)
        throw new Error(
          'Discriminator name can not be called like anothe schema field: ' +
            key,
        );

      // Objects nested
      if (!schema[key].type && isObject(schema[key])) {
        return this._validateDiscriminatorName(discriminator, schema[key]);
      }
    });
  }

  /**
   * new(): Create a new document based on this model
   *
   * @param {Object} payload
   * @param {String} tenant
   *
   * @returns {Onject} doc
   */
  new(payload, tenant) {
    if (!tenant) throw new Error('Tenant name is required, got ' + tenant);

    // Check if paylaod field names are correct
    this._validatePayloadFieldNames(payload, this._schemaNormalized);
    // Normalize the payload with the model schema
    let data = this._normalizePayload(payload, this._schemaNormalized);

    // Validate all the values
    this._validatePayloadFieldValues(data, this._schemaNormalized, tenant);

    // Returning the new document created
    return new Document(
      data,
      this._preHooks,
      this._postHooks,
      this._methods,
      this._schemaOptions,
      this._modelName,
      this._discriminator,
      tenant,
    );
  }

  /**
   * discriminator(): Create a new discriminator for an schema
   * which inherit all the properties from the parent schema
   *
   * @param {Schema} schemaDiscriminator
   * @param {String} discriminatorModelName
   */
  discriminator(schemaDiscriminator, discriminatorModelName) {
    const {
      merge,
      discriminatorKey: childDiscriminatorKey,
    } = schemaDiscriminator._options.inheritOptions;

    if (!childDiscriminatorKey)
      throw new Error(
        'To create an inherited model you have to sepcify the "discriminatorKey" in the schema "options" field.',
      );

    const {
      discriminatorKey: parentDiscriminatorKey,
    } = this._schemaOptions.inheritOptions;

    if (!parentDiscriminatorKey)
      throw new Error(
        'You can not inherit from this model, you should add the "discriminatorKey" option in both schemas.',
      );

    if (parentDiscriminatorKey !== childDiscriminatorKey)
      throw new Error(
        'The "discriminatorKey" from the parent and the child model shoul be the same: [' +
          parentDiscriminatorKey +
          ',' +
          childDiscriminatorKey +
          ']',
      );

    let schema = {
      methods: {},
      _preHooks: {},
      _postHooks: {},
      _schema: {},
      _options: {},
    };

    schema._options = schemaDiscriminator._options;

    if (merge && merge.indexOf('methods') >= 0) {
      Object.keys(schemaDiscriminator.methods).forEach(key => {
        if (key in this._methods)
          throw new Error(
            'Static methods from a child schema can not be called like another method from the parent: ' +
              key,
          );
      });

      schema.methods = Object.assign(
        {},
        this._methods,
        schemaDiscriminator.methods,
      );
    }

    if (merge && merge.indexOf('preHooks') >= 0) {
      schema._preHooks = this._preHooks.concat(schemaDiscriminator._preHooks);
    }
    if (merge && merge.indexOf('postHooks') >= 0) {
      schema._postHooks = this._postHooks.concat(
        schemaDiscriminator._postHooks,
      );
    }

    schema._schema = Object.assign(
      {},
      this._schemaNormalized,
      schemaDiscriminator._schema,
    );

    this._validateDiscriminatorName(childDiscriminatorKey, schema._schema);

    const discriminatorModel = new Model(
      schema,
      this._modelName,
      discriminatorModelName,
    );

    if (this._childsModels[discriminatorModelName])
      throw new Error(
        'There is already model discriminator with the same name: ' +
          discriminatorModelName,
      );

    this._childsModels[discriminatorModelName] = discriminatorModel;

    return discriminatorModel;
  }

  /**
   * _validatePayloadFieldNames(): Check if all the field names
   * from the payload corresponds to schema with.
   *
   * @param {Object} payload
   * @param {schema} schema
   */
  _validatePayloadFieldNames(payload, schema) {
    Object.keys(payload).forEach(key => {
      if (schema[key] === undefined && key !== '_id') {
        throw new Error(
          'Field name ' +
            key +
            ' does not correspond to any field name on the schema',
        );
      }

      // Objects nested
      if (!schema[key].type && isObject(schema[key])) {
        return this._validatePayloadFieldNames(payload[key], schema[key]);
      }
    });
  }

  /**
   * _validatePayloadFieldValues : Check if the data type and format is
   * accepted by the schema assigned to this model and
   * also pass all the validation
   *
   * @param {Object} payload
   * @param {Schema} schema
   * @param {String} tenant
   */
  async _validatePayloadFieldValues(payload, schema, tenant = null) {
    Object.keys(schema).forEach(async key => {
      // No required values
      if (payload[key] === undefined && !schema[key].required) return;

      // Objects nested
      if (!schema[key].type && isObject(payload[key])) {
        payload[key] = this._validatePayloadFieldValues(
          payload[key],
          schema[key],
        );
        return;
      }

      // Validation type
      if (!isValidType(payload[key], schema[key].type)) {
        throw new Error(
          'Unsuported value (' +
            payload[key] +
            ') for type ' +
            schema[key].type,
        );
      }

      // Reg exp validation
      if (
        schema[key].match &&
        isString(payload[key]) &&
        !schema[key].match.test(payload[key])
      ) {
        throw new Error(
          'Value assigned to ' +
            key +
            ' does not match the regex/string ' +
            schema[key].match.toString() +
            '. Value was ' +
            payload[key],
        );
      }

      // Enum validation
      if (!isInEnum(schema[key].enum, payload[key])) {
        throw new Error(
          'Value assigned to ' +
            key +
            ' should be in enum [' +
            schema[key].enum.join(', ') +
            '], got ' +
            payload[key],
        );
      }

      // Min value validation
      if (isNumber(schema[key].min) && payload[key] < schema[key].min) {
        throw new Error(
          'Value assigned to ' +
            key +
            ' is less than min, ' +
            schema[key].min +
            ', got ' +
            payload[key],
        );
      }

      // Max value validation
      if (isNumber(schema[key].max) && payload[key] > schema[key].max) {
        throw new Error(
          'Value assigned to ' +
            key +
            ' is less than max, ' +
            schema[key].max +
            ', got ' +
            payload[key],
        );
      }

      // Max lenght validation
      if (
        schema[key].maxlength &&
        isString(payload[key]) &&
        payload[key].length > schema[key].maxlength
      ) {
        throw new Error(
          'Value assigned to ' +
            key +
            ' is bigger than ' +
            schema[key].maxlength.toString() +
            '. Value was ' +
            payload[key].length,
        );
      }

      // Custom validation
      if (typeof schema[key].validate === 'function') {
        try {
          const isValid = await schema[key].validate(
            mongoClient,
            tenant,
            payload[key],
          );

          if (!isValid) {
            throw new Error(
              'Value assigned to ' +
                key +
                ' failed custom validator. Value was ' +
                payload[key],
            );
          }
        } catch (error) {
          throw error;
        }
      }
    });
  }

  /**
   * _normalizePayload(): Assign default values to the payload
   *
   *
   * @param {Object} payload
   * @param {schema} schema
   *
   * returns {Object} doc
   */
  _normalizePayload(payload, schema) {
    Object.keys(schema).forEach(key => {
      // Default values
      if (payload[key] === undefined && 'default' in schema[key]) {
        const defaultValue = schema[key].default;
        payload[key] =
          typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        return;
      }

      // If we don't have the ref Id on the payload let set as null or empty []
      // to keep record of it in the database
      if (schema[key].ref && isEmptyValue(payload[key])) {
        payload[key] = isArray(schema[key].type) ? [] : null;
      }

      // No required values
      if (payload[key] === undefined && !schema[key].required) return;

      // Objects nested
      if (!schema[key].type && isObject(payload[key])) {
        payload[key] = this._normalizePayload(payload[key], schema[key]);
        return;
      }

      // Is required validation
      if (schema[key].required && isEmptyValue(payload[key])) {
        throw new Error(
          'Key ' + key + ' is required' + ', but got ' + payload[key],
        );
      }
    });

    return payload;
  }
}

module.exports = Model;
