const { expect } = require('chai');

const Molty = require('../index');

const { Schema } = Molty;

const { testSchema, testOptions, s, s2, s3 } = require('./mock');

describe('# Schema', () => {
  before(() => {});

  it('Creating a new schema from Schema', () => {
    // Testing Schema
    expect(s).to.be.an.instanceOf(Schema);
    expect(s).to.have.property('_schema');
    expect(s).to.have.property('_options');
    const sKeys = Object.keys(s._schema);
    const testSKeys = Object.keys(testSchema);
    expect(sKeys).to.have.lengthOf(testSKeys.length);
    expect(sKeys).to.deep.equal(testSKeys);
    sKeys.forEach(function(key) {
      if (!s._schema[key].type && Object.keys(s._schema[key]).length > 0) {
        Object.keys(s._schema[key]).forEach(function(nestedKey) {
          expect(s._schema[key][nestedKey]).to.have.property('type');
        });
      } else {
        expect(s._schema[key]).to.have.property('type');
      }
    });

    // Testing options
    const oKeys = Object.keys(s._options);
    const testOKeys = Object.keys(testOptions);
    expect(oKeys).to.have.lengthOf(testOKeys.length);
    expect(oKeys).to.deep.equal(testOKeys);
  });

  it('Append valid pre hooks to the schema', () => {
    expect(s2).to.have.property('_preHooks');
    expect(s2._preHooks).to.have.lengthOf(4);
  });

  it('Append valid post hooks to the schema', () => {
    expect(s2._postHooks).to.have.lengthOf(2);
    expect(s2).to.have.property('_postHooks');
  });

  it('Append invalid pre hooks to the schema', () => {
    try {
      s2.post('initialize', () => {
        return 'Hello World!';
      });
    } catch (error) {
      expect(s2).to.have.property('_preHooks');
      expect(s2).to.have.property('_postHooks');
      expect(s2._preHooks).to.have.lengthOf(4);
      expect(s2._postHooks).to.have.lengthOf(2);
      expect(error.message).to.be.equal('Hook "initialize" is not allowed.');
    }
  });

  it('Append static methods to the Schema', () => {
    expect(s2).to.have.property('methods');
    expect(s2.methods).to.have.property('newMethod2');
    expect(s2.methods).to.have.property('newMethod3');
    expect(s2.methods).to.have.property('newMethod4');
    expect(s2.methods.newMethod2).to.be.an.instanceOf(Function);
    expect(s2.methods.newMethod3).to.be.an.instanceOf(Function);
    expect(s2.methods.newMethod4).to.be.an.instanceOf(Function);
  });
});
