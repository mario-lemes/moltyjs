const { expect } = require('chai');

const Document = require('../document');
const Molty = require('../index');
const { Schema, connect, Model } = Molty;

const Middleware = require('../middleware');

const {
  conn,
  emailSchema,
  fileSchema,
  usersSchema,
  studentsSchema,
  teachersSchema,
} = require('./mock');

describe('# aggregate() Operations', () => {
  let newEmail1,
    newEmail2,
    newFile1,
    newFile2,
    Users,
    Students,
    Teachers,
    newTeacher,
    newStudent;

  before(async () => {
    try {
      const Emails = new Model(emailSchema, 'Emails');
      const Files = new Model(fileSchema, 'Files');

      newEmail1 = await Emails.new({
        email: 'test1@test.com',
      });

      newEmail2 = await Emails.new({
        email: 'test2@test.com',
      });

      newFile1 = await Files.new({
        name: 'My first file',
        email: newEmail1._data._id,
      });

      newFile2 = await Files.new({
        name: 'My second file',
        email: newEmail1._data._id,
      });
      await conn.insertOne('test3', newEmail1);
      await conn.insertOne('test3', newEmail2);
      await conn.insertOne('test3', newFile1);
      await conn.insertOne('test3', newFile2);

      // Discriminator
      Users = new Model(usersSchema, 'Users');
      Students = Users.discriminator(studentsSchema, 'Students');
      Teachers = Users.discriminator(teachersSchema, 'Teachers');

      newTeacher = await Teachers.new({
        name: 'Teacher',
        subject: 'Math',
        test: 'both',
      });

      newStudent = await Students.new({
        name: 'Student',
        term: '1º',
        test: 'both',
        teacher: newTeacher._data._id,
      });

      await conn.insertOne('test3', newTeacher);
      await conn.insertOne('test3', newStudent);
    } catch (error) {
      throw error;
    }
  });

  it('performing aggreagation with non supported operator', async () => {
    try {
      const pipeline = [
        {
          $match: {
            _id: newEmail1._data._id,
          },
        },
        {
          $lookuptest: {
            from: 'Files',
            localField: 'files',
            foreignField: '_id',
            as: 'files',
          },
        },
        {
          $project: {
            _id: 0,
            files: 1,
          },
        },
      ];

      const aggregate = await conn.aggregate('test3', 'Emails', pipeline, {});
    } catch (error) {
      expect(error).to.have.property(
        'message',
        'The aggregate operator is not allowed, got: $lookuptest',
      );
    }
  });

  it('performing aggreagation with non supported parameter of $lookup operator', async () => {
    try {
      const pipeline = [
        {
          $match: {
            _id: newEmail1._data._id,
          },
        },
        {
          $lookup: {
            from: 'Files',
            let: 'test',
            foreignField: '_id',
            as: 'files',
          },
        },
        {
          $project: {
            _id: 0,
            files: 1,
          },
        },
      ];

      const aggregate = await conn.aggregate('test3', 'Emails', pipeline, {});
    } catch (error) {
      expect(error).to.have.property(
        'message',
        'The paramater let in $lookup aggreagate operator is not allowed',
      );
    }
  });

  it('performing aggreagation with two models (join)', async () => {
    try {
      const pipeline = [
        {
          $match: {
            _id: newEmail1._data._id,
          },
        },
        {
          $lookup: {
            from: 'Files',
            localField: 'files',
            foreignField: '_id',
            as: 'files',
          },
        },
        {
          $project: {
            _id: 0,
            files: 1,
          },
        },
      ];

      const aggregate = await conn.aggregate('test3', 'Emails', pipeline, {});

      expect(aggregate[0]).to.have.property('files');
      expect(aggregate[0].files).to.have.lengthOf(2);
      expect(aggregate[0].files[0]).to.have.property('name', 'My first file');
      expect(aggregate[0].files[0]).to.have.property('email');
      expect(aggregate[0].files[1]).to.have.property('name', 'My second file');
      expect(aggregate[0].files[1]).to.have.property('email');
    } catch (error) {
      throw error;
    }
  });

  it('performing aggreagation with one discriminator model', async () => {
    try {
      const pipeline = [
        {
          $match: {
            test: 'both',
          },
        },
      ];

      const aggregate = await conn.aggregate('test3', 'Students', pipeline, {});

      expect(aggregate).to.have.lengthOf(1);
      expect(aggregate[0]).to.have.property('name', 'Student');
      expect(aggregate[0]).to.have.property('test', 'both');
    } catch (error) {
      throw error;
    }
  });

  it('performing aggreagation with two discriminator models', async () => {
    try {
      const pipeline = [
        {
          $match: {
            _id: newTeacher._data._id,
          },
        },
        {
          $lookup: {
            from: 'Students',
            localField: 'students',
            foreignField: '_id',
            as: 'students',
          },
        },
        {
          $project: {
            _id: 0,
            students: 1,
          },
        },
      ];

      const aggregate = await conn.aggregate('test3', 'Teachers', pipeline, {});

      expect(aggregate[0]).to.have.property('students');
      expect(aggregate[0].students).to.have.lengthOf(1);
      expect(aggregate[0].students[0]).to.have.property('name', 'Student');
      expect(aggregate[0].students[0]).to.have.property('test', 'both');
      expect(aggregate[0].students[0]).to.have.property('term', '1º');
    } catch (error) {
      throw error;
    }
  });
});
