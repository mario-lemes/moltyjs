## [Unreleased]

* Fix english misspelling in the documentation.
* Populate documents with references to other documments.
* Add deleteOne() document
* Add embedded documents features
* Add query operations ([mquery](https://github.com/aheckmann/mquery) query builder))
* Add cursor options ([MongoDB Doc](https://docs.mongodb.com/manual/reference/method/js-cursor/)).
  * .skip(1) // Skip 1
  * .limit(10) // Limit 10
  * .batchSize(5) // Set batchSize on cursor to 5
  * .filter({a:1}) // Set query on the cursor
  * .comment('add a comment') // Add a comment to the query, allowing to correlate queries
  * .addCursorFlag('tailable', true) // Set cursor as tailable
  * .addCursorFlag('oplogReplay', true) // Set cursor as oplogReplay
  * .addCursorFlag('noCursorTimeout', true) // Set cursor as noCursorTimeout
  * .addCursorFlag('awaitData', true) // Set cursor as awaitData
  * .addCursorFlag('exhaust', true) // Set cursor as exhaust
  * .addCursorFlag('partial', true) // Set cursor as partial
  * .addQueryModifier('$orderby', {a:1}) // Set $orderby {a:1}
  * .max(10) // Set the cursor maxScan
  * .maxScan(10) // Set the cursor maxScan
  * .maxTimeMS(1000) // Set the cursor maxTimeMS
  * .min(100) // Set the cursor min
  * .returnKey(10) // Set the cursor returnKey
  * .setReadPreference(ReadPreference.PRIMARY) // Set the cursor readPreference
  * .setCursorOption(field, value) // Set a node.js specific cursor option
  * .showRecordId(true) // Set the cursor showRecordId
  * .snapshot(true) // Set the cursor snapshot
  * .sort([['a', 1]]) // Sets the sort order of the cursor query
  * .stream(options) // Return a modified Readable stream including a possible transform method.
  * .hint('a_1') // Set the cursor hint

## [0.3.1] - 2017-12-21

### Added

* New method insertMany()
* New hook for insert many ('insertMany') where this is refered to the Documents Array
* Option parameter to inserOne() and to insertMany()
* 'moltyClass' option to findOne()
* Documentation about changes on insertOne(), insertMany() and hooks.

### Removed

* Hooks from Document instances and keep it just in Model instances

### Changed

* 'insert' hook is now called 'inserOne'

## [0.2.1] - 2017-12-20

### Added

* Options 'projection' to just exclude or include specific field in the documents results

### Changed

* Documentation about find() method

## [0.2.0] - 2017-12-18

### Added

* Options 'limit' to limit the results with the find() function
* Options 'moltyClass' to wrap the result on Molty Document class instead of MongoDB Document class
* Info abot the find() function and its options

### Changed

* findOne() by find(). findOne() is already deprecated on MongoDB Native Driver
* Added Cursor support options to 'limit' on find()
* Unit test suites

### Fixed

* Fix documentation style glitches

## [0.1.6] - 2017-12-18

### Added

* CHANGELOG
* Improoved documentation: Added advise about using the library in production environments.
* Added options behaviours for tenants (noListener, returnNonCachedInstance) [MongoDB Native Driver API](http://mongodb.github.io/node-mongodb-native/2.0/api/Db.html#db)

### Changed

* Documet methods are now binded to the entire document not only to the payload data.

## [0.1.5] - 2017-12-17

### Added

* Standarized handler for discriminated documents.
* Improoved documentation:
  * Schema field properties.
  * Create a new Model.
  * Hooks middlewares.
  * CRUD Operations

### Changed

* Unit testing suites: Models, Discriminators, Hooks, References.

## [0.1.4] - 2017-12-16

### Added

* Saving and recovering functions documentation.

### Fixed

* Bad initialization on dropped databases.

## [0.1.3] - 2017-12-16

### Added

* Improoved MongoClient with a better Model handler.

### Changed

* Unit testing suites: CRUD Operations, Discriminators, Indexes.

## [0.1.2] - 2017-12-16

### Added

* Improoved documentation:
  * Create a new Documet.
  * Create a new Model.

### Changed

* Model creation moved to Model constructor class.
* Unit testing suites: Models, Discriminators, Hooks, References.

## [0.1.1] - 2017-12-16

### Added

* Referencing documents to the documentation.

## [0.1.0] - 2017-12-16

### Added

* updateOne() method.
* Improoved Mongo ObjectID validation.
* Payload validation updating documents.
* Binded hooks to the document on 'save' middleware and to the query on 'update'

## [0.0.9] - 2017-12-14

### Added

* Model documentation.

### Fixed

* Unit testing suites for CRUD Operations, Discriminators, Hooks and Models.

## [0.0.8] - 2017-12-14

### Removed

* Print log on each connection created.

## [0.0.7] - 2017-12-14

### Fixed

* Unit testing suites.

## [0.0.6] - 2017-12-14

### Added

* Schema documentation

## [0.0.5] - 2017-12-14

### Added

* Improoved properties field validation on the schema creation proccess.

## [0.0.4] - 2017-12-14

### Added

* maxlength property to schema fields.

## [0.0.3] - 2017-12-14

### Fixed

* regeneratorRuntime transpiling error (babel).

## 0.0.2 - 2017-12-14

### Added

* findOne() method.
* Document inheritence support.

[0.2.1]: https://github.com/Yonirt/moltyjs/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Yonirt/moltyjs/compare/v0.1.6...v0.2.0
[0.1.6]: https://github.com/Yonirt/moltyjs/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/Yonirt/moltyjs/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/Yonirt/moltyjs/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Yonirt/moltyjs/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Yonirt/moltyjs/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Yonirt/moltyjs/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Yonirt/moltyjs/compare/v0.0.9...v0.1.0
[0.0.9]: https://github.com/Yonirt/moltyjs/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/Yonirt/moltyjs/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/Yonirt/moltyjs/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/Yonirt/moltyjs/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/Yonirt/moltyjs/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/Yonirt/moltyjs/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/Yonirt/moltyjs/compare/v0.0.2...v0.0.3

## Type of changes

* **Added** for new features.
* **Changed** for changes in existing functionality.
* **Deprecated** for soon-to-be removed features.
* **Removed** for now removed features.
* **Fixed** for any bug fixes.
* **Security** in case of vulnerabilities.

_This CHANGELOG is following a better changelog convention from [keepachangelog.com (Olivier Lacan)](http://keepachangelog.com/en/1.0.0/) project._
