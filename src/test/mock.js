const Molty = require('../index');

const { Schema, model } = Molty;

const testSchema = {
  test: {
    type: [String],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    default: '',
  },
  lastName: {
    type: String,
    default: 'LEMES',
  },
  birthdate: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
  },
  confirmationToken: {
    type: String,
    default: () => 'test',
  },
  confirmationTokenExpires: {
    type: Date,
    default: () => Date.now(),
  },
  // TODO: Change it
  emergencyContactInfo: {
    location: {
      type: String,
    },
    contact: {
      type: String,
      default: 'NESTED',
    },
    relation: {
      type: String,
      maxlength: 150,
    },
  },
  isActive: {
    type: Boolean,
    default: false,
  },
};
const testOptions = {
  timestamps: true,
  inheritOptions: {
    discriminatorKey: '__kind',
  },
};

const s = new Schema(testSchema, testOptions);
const s2 = new Schema(testSchema, testOptions);
const s3 = new Schema(testSchema, testOptions);

// Pre hooks
s2.pre('insert', function(next) {
  this._data.password = 'ENCRYPTED';
  console.log('PRE: Insert World 1!');
  return next();
});
s2.pre('insert', function(next) {
  this._data.lastName = 'CHANGEEEED';
  console.log('PRE: Insert World 2!');
  return next();
});

s2.pre('update', next => {
  console.log('PRE: Update World!');
  return next();
});
s2.pre('delete', next => {
  console.log('PRE: Delete World!');
  return next();
});

// Post hooks
s3.post('insert', function(next) {
  const r = this.newMethod1();
  console.log(r);
  console.log('POST: Insert World!');
  return next();
});
s2.post('update', next => {
  console.log('POST: Update World!');
  return next();
});
s2.post('delete', next => {
  console.log('POST: Delete World!');
  return next();
});

// Static methods
s3.methods.newMethod1 = function() {
  this.test = ['YESSSSSSSSSSSSSSSSSSS'];
  return 'Static method 1!';
};
s2.methods.newMethod2 = function() {
  return 'Static method 2!';
};
s2.methods.newMethod3 = function() {
  return 'Static method 3!';
};
s2.methods.newMethod4 = function() {
  return 'Static method 4!';
};

const discriminatorSchema = {
  jobTitle: {
    type: String,
    unique: true,
    required: true,
    //maxlength: 100,
  },
  admonitions: {
    type: Boolean,
  },
  notes: {
    type: String,
  },
  // TODO: Change it
  rotations: {
    type: [String],
  },
  credentials: {
    type: String,
    //maxlength: 150,
  },
  // TODO: Change it
  institution: {
    type: String,
  },
  customFields: {
    type: [String],
  },
};

const discriminatorOptions = {
  timestamps: true,
  inheritOptions: {
    discriminatorKey: '__kind',
    merge: ['methods', 'preHooks', 'postHooks'],
  },
};

const sDiscriminator = new Schema(discriminatorSchema, discriminatorOptions);

// Pre hooks
sDiscriminator.pre('insert', function(next) {
  this._data.password = 'ENCRYPTED';
  console.log('PRE DISCRIMINATOR: Insert World 1!');
  return next();
});

// Post hooks
sDiscriminator.post('insert', function(next) {
  const r = this.newDiscriminatorMethod1();
  console.log(r);
  console.log('POST DISCRIMINATOR: Insert World!');
  return next();
});

// Static methods
sDiscriminator.methods.newDiscriminatorMethod1 = function() {
  this.test = ['YESSSSSSSSSSSSSSSSSSS'];
  return 'Static method 1!';
};

module.exports = { testSchema, testOptions, s, s2, s3, sDiscriminator };
