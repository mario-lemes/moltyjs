const async = require('async');
//const Backoff = require('backoff');
const { to } = require('await-to-js');

class QueueManager {
  constructor(options = {}) {
    this._queue = async.queue(this._work, 1);
  }

  async _work(item, cb) {
    const [error, result] = await to(item.fn());

    if (error && error.code === 'ECONN') {
      this._work(item);
    } else cb(error, result);
  }

  pushCommand(fn, options, cb) {
    const work = {
      fn,
      options,
    };

    this._queue.push(work, cb);
  }
}

module.exports = QueueManager;
