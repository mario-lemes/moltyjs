const { ObjectId } = require('mongodb');

const {
  isSupportedType,
  isArray,
  isObject,
  isEmptyValue,
} = require('./validators');

class Schema {
  /**
   * Schema(): Schema constructor
   *s
   * @param {Object} schema
   * @param {Object} options
   *
   * @returns {Schema}
   */
  constructor(schema, options = {}) {
    if (arguments.length < 1) throw new Error('Schema is missing');

    this._checkFormatType(schema);
    this._schema = schema;

    this._checkOptions(options);
    this._options = options;

    this._preHooks = [];
    this._postHooks = [];
    this.methods = {};
  }

  /**
   * types(): Static method to return all the types supported
   * by a schema
   *
   * @returns {Object}
   */
  static types() {
    return {
      ObjectId: ObjectId,
      String,
      Number,
      Boolean,
      Buffer,
      Date,
      Array,
      Object,
      Mixed: 'Mixed',
    };
  }

  /**
   * _checkFormatType(): Check this._schema for a properly
   * formatting
   *
   * @param {Object} schema
   */
  _checkFormatType(schema) {
    Object.keys(schema).forEach(key => {
      if (
        schema[key].ref &&
        (schema[key].type !== ObjectId &&
          (isArray(schema[key].type) && schema[key].type[0] !== ObjectId))
      ) {
        throw new Error(
          'Ref fields should be ObjectId type, got: ' + schema[key].type,
        );
      }

      if (schema[key].type && !isSupportedType(schema[key].type)) {
        throw new Error('Unsupported type or bad variable: ' + key);
      }

      // If the properties of the schema field are not allowed
      if (schema[key].type && Object.keys(schema[key]).length > 1) {
        Object.keys(schema[key]).forEach(propertyKey => {
          if (!this._isValidProperty(propertyKey)) {
            throw new Error('Unsupported propertie variable: ' + propertyKey);
          }
        });
      }

      if (key === 'collection') {
        throw new Error(
          'Schema fields can not be called "collection" since is a reserved word',
        );
      }

      if (key[0] === '_') {
        throw new Error('Schema fields can not start with "_": ' + key);
      }

      // Objects nested
      if (!schema[key].type && isObject(schema[key])) {
        return this._checkFormatType(schema[key]);
      }
    });
  }

  /**
   * _checkOptionss(): Check this._options for a properly
   * formatting
   *
   * @param {Object} options
   */
  _checkOptions(options) {
    Object.keys(options).forEach(key => {
      if (!this._isValidOption(key))
        throw new Error('Unsupported schema option: ' + key);

      // Objects inheritOptions
      if (key === 'inheritOptions' && isObject(options[key])) {
        Object.keys(options[key]).forEach(inheritOptionsKey => {
          if (!this._isValidInheritOption(inheritOptionsKey, options[key]))
            throw new Error(
              'Unsupported schema inherit option: ' + inheritOptionsKey,
            );

          if (
            inheritOptionsKey === 'discriminatorKey' &&
            options[key].discriminatorKey[0] === '_'
          )
            throw new Error(
              'Discriminator key can not start with "_": ' +
                options[key].discriminatorKey,
            );
        });
      }

      // Objects mongoDBIndexes
      if (key === 'mongoDBIndexes' && isArray(options[key])) {
        if (options[key].length === 0) {
          throw new Error(
            'mongoDB indexes should not be empty if it is declared on the schema options',
          );
        }
      }

      // Objects elasticSearchIndexes
      if (key === 'elasticSearchIndexes' && isObject(options[key])) {
        Object.keys(options[key]).forEach(elasticSearchKey => {
          if (Object.keys(this._schema).indexOf(elasticSearchKey) < 0) {
            throw new Error(
              'Elastic Search indexes must belongs to the Schema, got: ' +
                elasticSearchKey,
            );
          }

          if (
            !this._isValidElasticSearchIndexType(
              options[key][elasticSearchKey].type,
            )
          ) {
            throw new Error(
              'Elastic Search index type not supported, got: ' +
                options[key][elasticSearchKey].type,
            );
          }
        });
      }
    });
  }

  /**
   * pre(): Bind pre hook functions to the Schema
   *
   * @param {String} hook
   * @param {Function} cb hook function
   */
  pre(hook, fn) {
    if (arguments.length < 2) throw new Error('Hooks params are missing');
    if (!this._isValidHook(hook))
      throw new Error('Hook "' + hook + '" is not allowed.');

    this._preHooks.push({ hook, fn });
  }

  /**
   * post(): Bind post hook functions to the Schema
   *
   * @param {String} hook
   * @param {Function} fn hook function
   */
  post(hook, fn) {
    if (arguments.length < 2) throw new Error('Hooks params are missing');
    if (!this._isValidHook(hook))
      throw new Error('Hook "' + hook + '" is not allowed.');

    this._postHooks.push({ hook, fn });
  }

  /**
   * _isValidHook(): Check is the hook is allowed or not
   *
   * @param {String} hook Hook name
   *
   * @returns {Boolean}
   */
  _isValidHook(hook) {
    const validHooks = [
      'insertOne',
      'insertMany',
      'updateOne',
      'updateMany',
      'deleteOne',
    ];
    return validHooks.indexOf(hook) > -1;
  }

  /**
   * _isValidProperty(): Check is the property field is allowed or not
   *
   * @param {String} property Property name
   *
   * @returns {Boolean}
   */
  _isValidProperty(property) {
    const fieldProperties = [
      'type',
      'required',
      'unique',
      'default',
      'match',
      'enum',
      'min',
      'max',
      'maxlength',
      'validate',
      'ref',
    ];
    return fieldProperties.indexOf(property) > -1;
  }

  /**
   * _isValidOption(): Check is the option field is
   * allowed or not
   *
   * @param {String} option Option name
   *
   * @returns {Boolean}
   */
  _isValidOption(option) {
    const fieldOptions = [
      'timestamps',
      'inheritOptions',
      'elasticSearchIndexes',
      'mongoDBIndexes',
    ];
    return fieldOptions.indexOf(option) > -1;
  }

  /**
   * _isValidInheritOption(): Check is the inherit
   * options field is allowed or not
   *
   * @param {String} inheritOption Inherit Option name
   * @param {String} value         Inherit Option value
   *
   * @returns {Boolean}
   */
  _isValidInheritOption(inheritOption, value) {
    const fieldInheritOptions = ['discriminatorKey', 'merge'];
    const mergeOptions = ['methods', 'preHooks', 'postHooks'];

    if (fieldInheritOptions.indexOf(inheritOption) < 0) return false;

    if (inheritOption === 'merge') {
      for (let m of value.merge) {
        if (mergeOptions.indexOf(m) < 0) return false;
      }
    }

    return true;
  }

  /**
   * _isValidElasticSearchIndexType(): Check if the ES index types
   * is supported
   *
   * @param {String} type
   *
   * @returns {Boolean}
   */
  _isValidElasticSearchIndexType(type) {
    const elasticSearchIndexTypes = [
      'text',
      'keyword',
      'date',
      'long',
      'double',
      'boolean',
      'ip',
      'object',
      'nested',
    ];
    if (elasticSearchIndexTypes.indexOf(type) < 0) return false;
    return true;
  }
}

module.exports = Schema;
