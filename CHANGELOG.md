## [Unreleased]

- Wrap results docs in moltyClass but not remove the metadata provided by MongoDB
- Fix english misspelling in the documentation.
- Add embedded documents features
- Add query operations ([mquery](https://github.com/aheckmann/mquery) query builder))
- Add more cursor options ([MongoDB Doc](https://docs.mongodb.com/manual/reference/method/js-cursor/)).
  - .batchSize(5) // Set batchSize on cursor to 5
  - .filter({a:1}) // Set query on the cursor
  - .addCursorFlag('oplogReplay', true) // Set cursor as oplogReplay
  - .addCursorFlag('noCursorTimeout', true) // Set cursor as noCursorTimeout
  - .addCursorFlag('awaitData', true) // Set cursor as awaitData
  - .addCursorFlag('exhaust', true) // Set cursor as exhaust
  - .addQueryModifier('$orderby', {a:1}) // Set $orderby {a:1}
  - .maxScan(10) // Set the cursor maxScan
  - .setCursorOption(field, value) // Set a node.js specific cursor option
  - .showRecordId(true) // Set the cursor showRecordId
  - .stream(options) // Return a modified Readable stream including a possible transform method.

## [0.9.8] - 2018-06-08

### Fixed

- Discriminator schemas did not inherit the timestamp option from the parent

## [0.9.7] - 2018-06-07

### Fixed

- Default values was not set on nested schema structures

## [0.9.6] - 2018-06-03

### Added

- Support for more than two level deep in nested schema objects

## [0.9.5] - 2018-05-20

### Added

- Mixes Schema type

## [0.9.4] - 2018-05-17

### Added

- New agregate pipeline stages: sort, limit, skip, sortByCount

## [0.9.3] - 2018-05-17

### Added

- New cursor options to find() method: sort, skip, hint, explain, snapshot, timeout, tailable, returnKey, maxScan, min, max, showDiskLoc, comment, raw, promoteLongs, promoteValues, promoteBuffers, readPreference, partial, maxTimeMS, collation.

## [0.9.2] - 2018-04-08

### Fixed

- Bug on schema fields of array of Id refs, only assigned the las id of the array instead the entire array (refactor)

## [0.9.1] - 2018-04-08

### Fixed

- Bug on schema fields of array of Id refs, only assigned the las id of the array instead the entire array

## [0.9.0] - 2018-03-09

### Added

- updateMany() method

### Changed

- Hooks names: 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne',

## [0.8.11] - 2018-02-22

### Fixed

- Bug when timestamps equal true in schema definition didn't update the 'updatedAt' field on update() method

## [0.8.8] - 2018-02-19

### Fixed

- Native MongoDB methods options were merged with MoltyJS options

## [0.8.7] - 2018-02-09

### Fixed

- Bug in the index mapping of Elasticsearch

## [0.8.6] - 2018-02-09

### Added

- Exposing API public to manage the Elasticseach (drop, search)

## [0.8.5] - 2018-02-02

### Added

- New aggregation pipeline stages ($count, $group, $addFields, $redact)

## [0.8.4] - 2018-01-28

### Added

- Normalization of Mongo Ids
- New aggregation pipeline stages ( $replaceRoot, $facet, $unwind, $group)

### Removed

- Validation on update Documents

### Fixed

- Bug validating empty (null) values
- Bug validating enum array values

## [0.8.3] - 2018-01-23

### Added

- Support for multiple join conditions with $lookup operator in the aggregate() method

### Changed

- Validation payload method on updated() action, now is used the same from the Model itself.

### Fixed

- Bug in aggregate() method for discriminated models

## [0.8.2] - 2018-01-22

### Fixed

- Bugs in validation Schema field names (Document payload)

## [0.8.1] - 2018-01-12

### Fixed

- Bugs in normalization and validation type methods (Document payload)

## [0.8.0] - 2018-01-12

### Added

- Support for a better scheme field layout:
  - ````javascript
        {
          nested: {
            stuff: {
              type: String,
              required: true,
            },
          },
          array: {
            type: [],
          },
          arrayOfString: {
            type: [String],
          },
          arrayOfNumber: {
            type: [Number],
          },
          arrayOfDate: {
            type: [Date],
          },
          arrayOfBuffer: {
            type: [Buffer],
          },
          arrayOfBoolean: {
            type: [Boolean],
          },
          arrayOfMixed: {
            type: [Object],
          },
          arrayOfId: {
            type: [Schema.types().ObjectId],
            required: true,
          },
          arrayOfNested: [
            {
              stuff: {
                type: String,
                required: true,
              },
              test: {
                type: String,
                maxlength: 5,
              },
              custom: {
                type: String,
                validate: payload => {
                  return payload.arrayOfNested[2].custom === 'yes';
                },
              },
            },
          ],
          arrayOfArray: {
            type: [[]],
          },
          arrayOfArrayOfNumber: {
            type: [[Number]],
          }
        }
        ```
    ````

## [0.7.0] - 2018-01-12

### Added

- MoltyJS now supports Elasticsearch integration! :)
- deleteOne() method is available to perform documents deletions
- new 'delete' hook is available

### Changed

- Schema methods now don't pass neither the 'tenant' name or the 'connection' instance
- validate property Schema field now don't pass neither the 'tenant' name or the 'connection' instance
- 'tenant' is not required in 'new Document()' anymore
- 'tenant' now is required in 'insertOne()' and in 'insertMany()'

### Fixed

- Now Schemas, Models and Documents are not copied but cloned.

## [0.6.2] - 2018-01-03

### Changed

- Now is possible to have Mongo ObjectId type field in the Schema without refferencing any model.
- Improoved way of validating payload on schemas and payloads

## [0.6.1] - 2018-01-03

### Fixed

- Order in the documentation

## [0.6.0] - 2018-01-02

### Added

- aggregate() function with support for $match, $project, and $lookup (without recursivity) stages pipeline
- Documentation about new aggreagte() function

### Fixed

- Error that cause wrong merging og prehooks, posthooks and methods of discriminated models.

## [0.5.1] - 2017-12-28

### Fixed

- Validation Schema function fields for nested objects.

## [0.5.0] - 2017-12-27

### Changed

- Document constructor now return a Promise due the validation function on the Schema fields which can be async functions. The validation checking is done at the moment you create the Document.
- Passed the entire data payload normalized to the validate function instead of the value of the field is validating. In case further checking are neccesary.
- Documentaion about:
  - Create a new Document
  - Schema option fields
  - Promise functions

## [0.4.3] - 2017-12-27

### Fixed

- Added support for async functions in the Schema fields validation function.

## [0.4.2] - 2017-12-27

### Fixed

- Documentation about static methods, parameters 'connection' and 'tenant' were missing.
- Order of Schema fields validate function.

## [0.4.1] - 2017-12-27

### Removed

- tenant param from insertOne() and insertMany() since is not needed anumore because is already attached to the Document object

## [0.4.0] - 2017-12-27

### Added

- Binded tenant and mongo client to the validate function in the Schema class, static methods and hooks in order to being able to perform querys directly to the DB from there.
- Added documentation about:
  - Document creation
  - Hooks
  - Static Method
  - Schema field validation

### Changed

- Documentation about Schema field properties

### Fixed

- Example insertMany in the documentation

## [0.3.0] - 2017-12-21

### Added

- New method insertMany()
- New hook for insert many ('insertMany') where this is refered to the Documents Array
- Option parameter to inserOne() and to insertMany()
- 'moltyClass' option to findOne()
- Documentation about changes on insertOne(), insertMany() and hooks.

### Removed

- Hooks from Document instances and keep it just in Model instances

### Changed

- 'insert' hook is now called 'inserOne'

## [0.2.1] - 2017-12-20

### Added

- Options 'projection' to just exclude or include specific field in the documents results

### Changed

- Documentation about find() method

## [0.2.0] - 2017-12-18

### Added

- Options 'limit' to limit the results with the find() function
- Options 'moltyClass' to wrap the result on Molty Document class instead of MongoDB Document class
- Info abot the find() function and its options

### Changed

- findOne() by find(). findOne() is already deprecated on MongoDB Native Driver
- Added Cursor support options to 'limit' on find()
- Unit test suites

### Fixed

- Fix documentation style glitches

## [0.1.6] - 2017-12-18

### Added

- CHANGELOG
- Improoved documentation: Added advise about using the library in production environments.
- Added options behaviours for tenants (noListener, returnNonCachedInstance) [MongoDB Native Driver API](http://mongodb.github.io/node-mongodb-native/2.0/api/Db.html#db)

### Changed

- Documet methods are now binded to the entire document not only to the payload data.

## [0.1.5] - 2017-12-17

### Added

- Standarized handler for discriminated documents.
- Improoved documentation:
  - Schema field properties.
  - Create a new Model.
  - Hooks middlewares.
  - CRUD Operations

### Changed

- Unit testing suites: Models, Discriminators, Hooks, References.

## [0.1.4] - 2017-12-16

### Added

- Saving and recovering functions documentation.

### Fixed

- Bad initialization on dropped databases.

## [0.1.3] - 2017-12-16

### Added

- Improoved MongoClient with a better Model handler.

### Changed

- Unit testing suites: CRUD Operations, Discriminators, Indexes.

## [0.1.2] - 2017-12-16

### Added

- Improoved documentation:
  - Create a new Documet.
  - Create a new Model.

### Changed

- Model creation moved to Model constructor class.
- Unit testing suites: Models, Discriminators, Hooks, References.

## [0.1.1] - 2017-12-16

### Added

- Referencing documents to the documentation.

## [0.1.0] - 2017-12-16

### Added

- updateOne() method.
- Improoved Mongo ObjectID validation.
- Payload validation updating documents.
- Binded hooks to the document on 'save' middleware and to the query on 'update'

## [0.0.9] - 2017-12-14

### Added

- Model documentation.

### Fixed

- Unit testing suites for CRUD Operations, Discriminators, Hooks and Models.

## [0.0.8] - 2017-12-14

### Removed

- Print log on each connection created.

## [0.0.7] - 2017-12-14

### Fixed

- Unit testing suites.

## [0.0.6] - 2017-12-14

### Added

- Schema documentation

## [0.0.5] - 2017-12-14

### Added

- Improoved properties field validation on the schema creation proccess.

## [0.0.4] - 2017-12-14

### Added

- maxlength property to schema fields.

## [0.0.3] - 2017-12-14

### Fixed

- regeneratorRuntime transpiling error (babel).

## 0.0.2 - 2017-12-14

### Added

- findOne() method.
- Document inheritence support.

[0.9.8]: https://github.com/Yonirt/moltyjs/compare/v0.9.7...v0.9.8
[0.9.7]: https://github.com/Yonirt/moltyjs/compare/v0.9.6...v0.9.7
[0.9.6]: https://github.com/Yonirt/moltyjs/compare/v0.9.5...v0.9.6
[0.9.5]: https://github.com/Yonirt/moltyjs/compare/v0.9.4...v0.9.5
[0.9.4]: https://github.com/Yonirt/moltyjs/compare/v0.9.3...v0.9.4
[0.9.3]: https://github.com/Yonirt/moltyjs/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/Yonirt/moltyjs/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/Yonirt/moltyjs/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Yonirt/moltyjs/compare/v0.8.11...v0.9.0
[0.8.11]: https://github.com/Yonirt/moltyjs/compare/v0.8.8...v0.8.11
[0.8.8]: https://github.com/Yonirt/moltyjs/compare/v0.8.7...v0.8.8
[0.8.7]: https://github.com/Yonirt/moltyjs/compare/v0.8.6...v0.8.7
[0.8.6]: https://github.com/Yonirt/moltyjs/compare/v0.8.5...v0.8.6
[0.8.5]: https://github.com/Yonirt/moltyjs/compare/v0.8.4...v0.8.5
[0.8.4]: https://github.com/Yonirt/moltyjs/compare/v0.8.3...v0.8.4
[0.8.3]: https://github.com/Yonirt/moltyjs/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/Yonirt/moltyjs/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/Yonirt/moltyjs/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/Yonirt/moltyjs/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/Yonirt/moltyjs/compare/v0.6.2...v0.7.0
[0.6.2]: https://github.com/Yonirt/moltyjs/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/Yonirt/moltyjs/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/Yonirt/moltyjs/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/Yonirt/moltyjs/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/Yonirt/moltyjs/compare/v0.4.3...v0.5.0
[0.4.3]: https://github.com/Yonirt/moltyjs/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/Yonirt/moltyjs/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/Yonirt/moltyjs/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/Yonirt/moltyjs/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Yonirt/moltyjs/compare/v0.2.1...v0.3.0
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

- **Added** for new features.
- **Changed** for changes in existing functionality.
- **Deprecated** for soon-to-be removed features.
- **Removed** for now removed features.
- **Fixed** for any bug fixes.
- **Security** in case of vulnerabilities.

_This CHANGELOG is following a better changelog convention from [keepachangelog.com (Olivier Lacan)](http://keepachangelog.com/en/1.0.0/) project._
