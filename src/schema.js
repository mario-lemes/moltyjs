const utils = require('./utils');
const { isSupportedType, isArray, isObject } = require('./validators');

class Schema {
  /**
   * Schema(): Schema constructor
   *
   * @param {Object} schema
   * @param {Object} options
   *
   * @returns {Schema}
   */
  constructor(schema, options) {
    if (arguments.length < 1) throw new Error('Schema is missing');

    this._isValidFormatType(schema);

    this._schema = schema;

    this._options = options || {};

    this._preHooks = [];
    this._postHooks = [];

    this.methods = {};
  }

  /**
   * _isValidFormatType(): Check this._schema for a properly
   * formatting
   *
   * @param {Object} schema
   */
  _isValidFormatType(schema) {
    Object.keys(schema).forEach(key => {
      if (schema[key].type) {
        if (!isSupportedType(schema[key].type)) {
          throw new Error('Unsupported type or bad variable: ' + key);
        }
      } else {
        if (Object.keys(schema[key]).length <= 0) {
          throw new Error('Unsupported type or bad variable: ' + key);
        }
      }
    });
  }

  /**
   * pre(): Bind pre hook functions to the Schema
   *
   * @param {String} hook=['validate', 'save', 'update', 'delete']
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
   * @param {String} hook=['validate', 'save', 'update', 'delete']
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
    const validHooks = ['validate', 'insert', 'update', 'delete'];
    return validHooks.indexOf(hook) > -1;
  }
}

module.exports = Schema;
