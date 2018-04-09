const mongoClient = require('./clients/mongoClient');
const Document = require('./document');

const { to } = require('await-to-js');
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

    this._normalizedPayload = null;

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
   *
   * @returns {Onject} doc
   */
  async new(payload) {
    if (
      !payload ||
      (Object.keys(payload).length === 0 && payload.constructor === Object)
    )
      throw new Error('Document payload is required');

    // Check if paylaod field names are correct
    this._validatePayloadFieldNames(payload, this._schemaNormalized);

    let data = null;
    // Normalize the payload with the model schema
    data = this._normalizePayload(payload, this._schemaNormalized);

    try {
      // Validate all the values
      await this.validatePayloadFieldValues(data, this._schemaNormalized, data);

      // Returning the new document created
      const newDoc = new Document(
        data,
        this._preHooks,
        this._postHooks,
        this._methods,
        this._schemaOptions,
        this._modelName,
        this._discriminator,
      );

      return newDoc;
    } catch (err) {
      throw err;
    }
  }

  /**
   * discriminator(): Create a new discriminator for an schema
   * which inherit all the properties from the parent schema
   *
   * @param {Schema} schemaDiscriminator
   * @param {String} discriminatorModelName
   */
  discriminator(schemaDiscriminator, discriminatorModelName) {
    const schemaAux = {};

    schemaAux._options = Object.assign({}, schemaDiscriminator._options);

    const {
      merge,
      discriminatorKey: childDiscriminatorKey,
    } = schemaAux._options.inheritOptions;

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

    schemaAux.methods = Object.assign({}, schemaDiscriminator.methods);
    if (merge && merge.indexOf('methods') >= 0) {
      Object.keys(schemaDiscriminator.methods).forEach(key => {
        if (key in this._methods)
          throw new Error(
            'Static methods from a child schema can not be called like another method from the parent: ' +
              key,
          );
      });

      schemaAux.methods = Object.assign({}, schemaAux.methods, this._methods);
    }

    schemaAux._preHooks = schemaDiscriminator._preHooks;
    if (merge && merge.indexOf('preHooks') >= 0) {
      schemaAux._preHooks = this._preHooks.concat(schemaAux._preHooks);
    }

    schemaAux._postHooks = schemaDiscriminator._postHooks;
    if (merge && merge.indexOf('postHooks') >= 0) {
      schemaAux._postHooks = this._postHooks.concat(schemaAux._postHooks);
    }

    schemaAux._schema = Object.assign(
      {},
      schemaDiscriminator._schema,
      this._schemaNormalized,
    );

    this._validateDiscriminatorName(childDiscriminatorKey, schemaAux._schema);

    const discriminatorModel = new Model(
      schemaAux,
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
      // Array
      if (isArray(schema[key]) && !schema[key][0].type && payload[key]) {
        payload[key].forEach(arrayItem => {
          return this._validatePayloadFieldNames(arrayItem, schema[key][0]);
        });
      }

      // Objects nested
      if (
        isObject(schema[key]) &&
        !isArray(schema[key]) &&
        !schema[key].type &&
        (isObject(payload[key]) && Object.keys(payload[key]).length > 0)
      ) {
        return this._validatePayloadFieldNames(payload[key], schema[key]);
      }
    });
  }

  /**
   * validatePayloadFieldValues : Check if the data type and format is
   * accepted by the schema assigned to this model and
   * also pass all the validation
   *
   * @param {Object} payload
   * @param {Schema} schema
   * @param {String} tenant
   */
  async validatePayloadFieldValues(
    payload,
    schema,
    parentPayload,
    operator = null,
  ) {
    for (let key of Object.keys(schema)) {
      // Array
      if (!schema[key].type && isArray(schema[key]) && payload[key]) {
        for (let arrayItem of payload[key]) {
          try {
            await this.validatePayloadFieldValues(
              arrayItem,
              schema[key][0],
              parentPayload,
              operator,
            );
            continue;
          } catch (error) {
            throw error;
          }
        }
      }

      // Objects nested
      if (
        !schema[key].type &&
        isObject(schema[key]) &&
        !isArray(schema[key]) &&
        payload[key]
      ) {
        try {
          await this.validatePayloadFieldValues(
            payload[key],
            schema[key],
            parentPayload,
            operator,
          );
          continue;
        } catch (error) {
          throw error;
        }
      }

      // No required values
      if (
        (!payload || payload[key] === undefined) &&
        (!schema[key].required || operator)
      )
        continue;

      // Is required validation
      if (
        (!operator || operator === '$unset') &&
        schema[key].required &&
        (!payload || isEmptyValue(payload[key]))
      ) {
        throw new Error('Key ' + key + ' is required');
      }

      // Validation type
      if (
        !isValidType(
          payload[key],
          isArray(schema[key]) ? Array : schema[key].type,
        )
      ) {
        throw new Error(
          'Unsuported value (' +
            JSON.stringify(payload[key]) +
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
          'Value assigned to "' +
            key +
            '" does not match the regex/string ' +
            schema[key].match.toString() +
            '. Value was ' +
            payload[key],
        );
      }

      // Enum validation
      if (!isInEnum(schema[key].enum, payload[key])) {
        throw new Error(
          'Value assigned to "' +
            key +
            '" should be in enum [' +
            schema[key].enum.join(', ') +
            '], got ' +
            payload[key],
        );
      }

      // Min value validation
      if (isNumber(schema[key].min) && payload[key] < schema[key].min) {
        throw new Error(
          'Value assigned to "' +
            key +
            '" is less than min, ' +
            schema[key].min +
            ', got ' +
            payload[key],
        );
      }

      // Max value validation
      if (isNumber(schema[key].max) && payload[key] > schema[key].max) {
        throw new Error(
          'Value assigned to "' +
            key +
            '" is less than max, ' +
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
          'Value assigned to "' +
            key +
            '" is bigger than ' +
            schema[key].maxlength.toString() +
            '. Value was ' +
            payload[key].length,
        );
      }

      // Custom validation
      if (typeof schema[key].validate === 'function') {
        let error, isValid;
        if (schema[key].validate.constructor.name === 'AsyncFunction') {
          [error, isValid] = await to(schema[key].validate(parentPayload));
        } else {
          isValid = schema[key].validate(parentPayload);
        }

        if (!isValid || error) {
          let err = new Error(
            'Value assigned to "' +
              key +
              '" failed custom validator. Value was ' +
              payload[key],
          );
          err.code = 'VALIDATION_FAILED';
          throw err;
        }
      }
    }
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
      // Ref values (Ids)
      if (schema[key].ref) {
        if (!payload || isEmptyValue(payload[key])) {
          const refNormalValue = isArray(schema[key].type) ? [] : null;
          payload = {
            ...payload,
            [key]: refNormalValue,
          };
        } else if (payload[key]) {
          const Schema = require('./schema');
          if (isArray(schema[key].type)) {
            payload[key].forEach(value => {
              payload[key].push(Schema.types().ObjectId(value));
            });
          } else {
            payload[key] = Schema.types().ObjectId(payload[key]);
          }
        }
        return;
      }

      // Default values
      if (
        (!payload || payload[key] === undefined) &&
        'default' in schema[key]
      ) {
        const defaultValue =
          typeof schema[key].default === 'function'
            ? schema[key].default()
            : schema[key].default;

        if (!payload)
          payload = {
            [key]: defaultValue,
          };
        else payload[key] = defaultValue;

        return;
      }

      // Array
      if (
        !schema[key].type &&
        isArray(schema[key]) &&
        (payload[key] && payload[key].length > 0)
      ) {
        for (let i = 0; i < payload[key].length; i++) {
          payload[key][i] = this._normalizePayload(
            payload[key][i],
            schema[key][0],
          );
          return;
        }
      }

      // Objects nested
      if (!schema[key].type && isObject(schema[key]) && !isArray(schema[key])) {
        const aux = this._normalizePayload(payload[key], schema[key]);
        if (aux) payload[key] = aux;
        return;
      }

      // No required values
      if ((!payload || payload[key] === undefined) && !schema[key].required)
        return;
    });

    return payload;
  }
}

module.exports = Model;
