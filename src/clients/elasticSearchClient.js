const elasticsearch = require('elasticsearch');

class ElasticSearchClient {
  constructor(options) {
    if (!options.host) throw new Error('Elasticsearch host is missing');
    try {
      this.esClient = new elasticsearch.Client({
        host: options.host,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * deleteIndex(): Delete an index from ES instance
   *
   * @param {String} index
   *
   * @returns {Promise}
   */
  deleteIndex(index) {
    return this.esClient.indices.delete({
      index,
    });
  }

  /**
   * createIndex(): Create a new index into ES instance
   *
   * @param {String} index
   *
   * @returns {Promise}
   */
  createIndex(index) {
    return this.esClient.indices.create({
      index,
    });
  }

  /**
   * refreshIndex(): Explicitly refresh one or more index,
   * making all operations performed since the last refresh
   * available for search.
   *
   * @param {String} index
   *
   * @returns {Promise}
   */
  refreshIndex(index) {
    return this.esClient.indices.refresh({
      index,
    });
  }

  /**
   * indexExists(): Check if the index exists
   *
   * @param {String} index
   *
   * @returns {Promise}
   */
  indexExists(index) {
    return this.esClient.indices.exists({
      index,
    });
  }

  /**
   * getMapping(): Retrieve mapping definition of index
   * or index/type.
   *
   * @param {String} index
   *
   * @returns {Promise}
   */
  getMapping(index, type) {
    return this.esClient.indices.getMapping({
      index,
      type,
    });
  }

  /**
   * putMapping(): Register specific mapping definition
   * for a specific type.
   *
   * @param {String} index
   * @param {String} type
   * @param {Object} properties
   *
   * @returns {Promise}
   */
  putMapping(index, type, properties) {
    const mapping = {
      index,
      type,
      body: {
        properties: {
          type: { type: 'keyword' },
          ...properties,
          suggest: {
            type: 'completion',
            analyzer: 'simple',
            search_analyzer: 'simple',
            payloads: true,
          },
        },
      },
    };
    console.log(mapping);
    return this.esClient.indices.putMapping(mapping);
  }

  /**
   * addDocument(): Add a document into the ES
   * instance
   *
   * @param {String} index
   * @param {String} type
   * @param {String} id
   * @param {Object} body
   *
   * @returns {Promise}
   */
  addDocument(index, type, id, body) {
    return this.esClient.index({
      index,
      type,
      id,
      body,
      refresh: true,
    });
  }

  /**
   * updateDocument(): Update parts of a document in ES
   *
   * @param {String} index
   * @param {String} type
   * @param {String} id
   * @param {Object} body
   *
   * @returns {Promise}
   */
  updateDocument(index, type, id, payload) {
    return this.esClient.update({
      index,
      type,
      id,
      body: {
        doc: {
          ...payload,
        },
      },
      refresh: true,
    });
  }

  /**
   * deleteDocument(): Delete a document from ES
   *
   * @param {String} index
   * @param {String} type
   * @param {String} id
   *
   * @returns [Promise]
   */
  deleteDocument(index, type, id) {
    return this.esClient.delete({
      index,
      type,
      id,
      refresh: true,
    });
  }

  /**
   * search(): Get Documents from ES based on
   * a query
   *
   * @param {String} index
   * @param {String} type
   * @param {Object} query
   *
   * @returns {Promise}
   */
  search(index, type, query) {
    return this.esClient.search({
      index,
      type,
      body: {
        query,
      },
    });
  }
}

module.exports = ElasticSearchClient;
