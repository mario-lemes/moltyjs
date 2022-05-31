const { EventEmitter } = require("events");
const Events = new EventEmitter();

const crypto = require("crypto");
const moment = require("moment");

const Molty = require("../index");

const { Schema, model, connect } = Molty;

const options = {
  engine: "mongodb",
  uri: "",
  connection: {
    useUnifiedTopology: true,
  },
  tenants: {
    noListener: true,
  },
};

const conn = connect(options);

const testSchema2 = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    activationToken: {
      type: String,
      required: true,
      unique: true,
      maxlength: 150,
      default: () => crypto.randomBytes(20).toString("hex"),
    },
    activationTokenExpires: {
      type: Date,
      default: () => moment().add(24, "hours").utc().format(),
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "error"],
      default: "pending",
    },
    tenantId: {
      type: Schema.types().ObjectId,
      ref: "ModelRef",
    },
    companyData: {},
  },
  {
    timestamps: true,
  }
);

const testSchemaRefArray = new Schema(
  {
    email: {
      type: String,
    },
    tenantId: {
      type: [Schema.types().ObjectId],
      ref: "ModelRef",
    },
  },
  {
    timestamps: true,
  }
);

const testSchema = {
  test: {
    type: [String],
  },
  email: {
    type: String,
    required: true,
    maxlength: 150,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    default: "",
  },
  lastName: {
    type: String,
    default: "LEMES",
  },
  birthdate: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  confirmationToken: {
    type: String,
    default: () => "test",
  },
  confirmationTokenExpires: {
    type: Date,
    default: () => Date.now(),
  },
  emergencyContactInfo: {
    location: {
      type: String,
    },
    contact: {
      type: String,
      default: "NESTED",
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
    discriminatorKey: "kind",
  },
  mongoDBIndexes: [
    {
      key: { test: 1 },
      unique: true,
    },
    {
      key: { isActive: 1 },
      name: "customindex",
    },
  ],
  elasticSearchIndexes: {
    firstName: {
      type: "text",
    },
    lastName: {
      type: "text",
    },
  },
};

const s = new Schema(testSchema, testOptions);
const s2 = new Schema(testSchema, testOptions);
const s3 = new Schema(testSchema, testOptions);

// Pre hooks
s2.pre("insertOne", function (dbClient, tenant, meta, next) {
  this._data.password = "ENCRYPTED";
  console.log("PRE: Insert World 1!");
  return next();
});
s2.pre("insertOne", function (dbClient, tenant, meta, next) {
  this._data.lastName = "CHANGEEEED";
  console.log("PRE: Insert World 2!");
  return next();
});

s2.pre("updateOne", (dbClient, tenant, meta, next) => {
  console.log("PRE: Update World!");
  return next();
});
s2.pre("deleteOne", (dbClient, tenant, meta, next) => {
  console.log("PRE: Delete World!");
  return next();
});

async function executeExternalFunctionOnEvent(tenant, post) {
  const result = await conn.find(
    tenant,
    "TestModel3",
    {},
    { moltyClass: false }
  );
  console.log("FROM " + post);
}

Events.on("EVENT_A", async (tenant, post) => {
  await executeExternalFunctionOnEvent(tenant, post);
});

// Post hooks
s3.post("insertOne", async function (dbClient, tenant, meta, next) {
  const r = this.newMethod1();
  console.log(r);
  console.log("POST 1: Insert World!");
  await executeExternalFunctionOnEvent(tenant, "POST 1");
  return next();
});
s3.post("insertOne", function (dbClient, tenant, meta, next) {
  Events.emit("EVENT_A", tenant, "EVENT ON POST 2");
  console.log("POST 2: Insert World!");
  return next();
});
s3.post("insertOne", async function (dbClient, tenant, meta, next) {
  console.log("POST 3: Insert World!");
  const result = await conn.find(
    tenant,
    "TestModel3",
    {},
    { moltyClass: false }
  );
  console.log("RESULTS ");
  return next();
});
s3.post("updateOne", function (dbClient, tenant, meta, next) {
  console.log("UPDATE 1: Updated Gender!");
  Events.emit("EVENT_A", tenant, "EVENT ON UPDATE 1");
  return next();
});
s3.post("updateOne", async function (dbClient, tenant, meta, next) {
  console.log("UPDATE 2: Updated Gender!");
  await executeExternalFunctionOnEvent(tenant, "UPDATE 2");
  return next();
});
s2.post("updateOne", (dbClient, tenant, meta, next) => {
  console.log("POST: Update World!");
  return next();
});
s2.post("deleteOne", (dbClient, tenant, meta, next) => {
  console.log("POST: Delete World!");
  return next();
});
s2.post("deleteMany", (dbClient, tenant, meta, next) => {
  console.log("POST: Delete Many World!");
  return next();
});

// Static methods
s3.methods.newMethod1 = function () {
  this.test = ["YESSSSSSSSSSSSSSSSSSS"];
  return "Static method 1!";
};
s2.methods.newMethod2 = function () {
  return "Static method 2!";
};
s2.methods.newMethod3 = function () {
  return "Static method 3!";
};
s2.methods.newMethod4 = function () {
  return "Static method 4!";
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
    discriminatorKey: "kind",
    merge: ["methods", "preHooks", "postHooks"],
  },
  elasticSearchIndexes: {
    notes: {
      type: "text",
    },
  },
  mongoDBIndexes: [
    {
      key: { institution: 1 },
      unique: true,
    },
    {
      key: { test: -1 },
      unique: true,
    },
  ],
};

const sDiscriminator = new Schema(discriminatorSchema, discriminatorOptions);
const sDiscriminator2 = new Schema(discriminatorSchema, discriminatorOptions);
const sDiscriminator3 = new Schema(discriminatorSchema, discriminatorOptions);

// Pre hooks
sDiscriminator.pre("insertOne", function (dbClient, tenant, meta, next) {
  this._data.password = "ENCRYPTED";
  console.log("PRE DISCRIMINATOR: Insert World 1!");
  return next();
});

// Post hooks
sDiscriminator.post("insertOne", function (dbClient, tenant, meta, next) {
  const r = this.newDiscriminatorMethod1();
  console.log(r);
  console.log("POST DISCRIMINATOR: Insert World!");
  return next();
});

// Pre hooks
sDiscriminator.pre("insertMany", function (dbClient, tenant, meta, next) {
  this[0]._data.lastName = "2PAC2FURIUS";
  console.log("PRE DISCRIMINATOR: Insert Many World 1!");
  return next();
});

// Post hooks
sDiscriminator.post("insertMany", function (dbClient, tenant, meta, next) {
  console.log("POST DISCRIMINATOR: Insert Many World!");
  return next();
});

// Static methods
sDiscriminator.methods.newDiscriminatorMethod1 = function () {
  this.test = ["YESSSSSSSSSSSSSSSSSSS"];
  return "Static method 1!";
};

// Static methods
sDiscriminator2.methods.newDiscriminatorMethod1 = function () {
  this.test = ["YESSSSSSSSSSSSSSSSSSS"];
  return "Static method 1!";
};

// Static methods
sDiscriminator3.methods.newDiscriminatorMethod1 = function () {
  this.test = ["YESSSSSSSSSSSSSSSSSSS"];
  return "Static method 1!";
};

const veryNewSchema = new Schema(
  {
    email: {
      type: String,
      maxlength: 100,
    },
    tenantId: {
      type: Schema.types().ObjectId,
      ref: "ModelRef",
      validate: (payload) => {
        if (!payload) return false;
        return true;
      },
    },
  },
  {
    timestamps: true,
  }
);

veryNewSchema.methods.newMethod = function (testArg, testArg2) {
  if (testArg === "NEW VAR" && testArg2 === "NEW VAR 2") return true;
  return false;
};

const emailSchema = new Schema(
  {
    email: {
      type: String,
    },
    files: {
      type: [Schema.types().ObjectId],
      ref: "Files",
    },
  },
  {
    timestamps: true,
    elasticSearchIndexes: {
      email: {
        type: "text",
      },
    },
  }
);

const fileSchema = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: Schema.types().ObjectId,
      ref: "Emails",
    },
  },
  {
    timestamps: true,
    elasticSearchIndexes: {
      name: {
        type: "text",
      },
    },
  }
);

// Post hooks
fileSchema.post("insertOne", async function (dbClient, tenant, meta, next) {
  try {
    const res = await dbClient.updateOne(
      tenant,
      "Emails",
      {
        _id: Schema.types().ObjectId(this._data.email),
      },
      { $push: { files: this._data._id } }
    );
  } catch (error) {
    throw error;
  }
  return next();
});

const usersSchema = new Schema(
  {
    name: {
      type: String,
    },
    test: {
      type: String,
    },
  },
  {
    timestamps: true,
    inheritOptions: {
      discriminatorKey: "kind",
    },
    elasticSearchIndexes: {
      name: {
        type: "text",
      },
    },
  }
);

const studentsSchema = new Schema(
  {
    term: {
      type: String,
    },
    teacher: {
      type: Schema.types().ObjectId,
      ref: "Users",
    },
    marks: {
      type: Number,
    },
  },
  {
    inheritOptions: {
      discriminatorKey: "kind",
    },
    elasticSearchIndexes: {
      term: {
        type: "text",
      },
    },
  }
);

const teachersSchema = new Schema(
  {
    subject: {
      type: String,
    },
    students: {
      type: [Schema.types().ObjectId],
      ref: "Users",
    },
    dept: {
      type: String,
    },
  },
  {
    inheritOptions: {
      discriminatorKey: "kind",
    },
  }
);

const directorSchema = new Schema(
  {
    name: {
      type: String,
    },
    teachers: {
      type: [Schema.types().ObjectId],
      ref: "Users",
    },
    salary: {
      type: Number,
    },
  },
  {
    inheritOptions: {
      discriminatorKey: "kind",
    },
    mongoDBIndexes: [{ key: { teachers: 1 } }],
  }
);

// Post hooks
studentsSchema.post("insertOne", async function (dbClient, tenant, meta, next) {
  try {
    const res = await dbClient.updateOne(
      tenant,
      "Teachers",
      {
        _id: Schema.types().ObjectId(this._data.teacher),
      },
      { $push: { students: this._data._id } }
    );
  } catch (error) {
    throw error;
  }
  return next();
});

// Schema fiedls
const schemaFields = new Schema(
  {
    string: {
      type: String,
    },
    buffer: {
      type: Buffer,
    },
    boolean: {
      type: Boolean,
    },
    date: {
      type: Date,
    },
    stringDate: {
      type: Date,
    },
    number: {
      type: Number,
    },
    object: {
      type: Object,
    },
    mixed: {
      type: "Mixed",
    },
    someId: {
      type: Schema.types().ObjectId,
    },
    nested: {
      stuff: {
        type: String,
        required: true,
      },
    },
    nestedDefault: {
      valueByDefault: {
        type: String,
        default: "DEFAULT",
      },
    },
    doubleNested: {
      level_1: {
        level_2: {
          level_3_1: {
            type: String,
            required: true,
            maxlength: 5,
          },
          level_3_2: {
            type: String,
          },
        },
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
    arrayOfObject: {
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
          validate: (payload) => {
            return payload.arrayOfNested[2].custom === "yes";
          },
        },
        booool: {
          type: Boolean,
          default: true,
        },
        arr: [
          {
            title: {
              type: String,
              maxlength: 15,
              required: true,
            },
            value: {
              type: String,
              maxlength: 10,
              default: null,
            },
          },
        ],
      },
    ],
    arrayOfArray: {
      type: [[]],
    },
    arrayOfArrayOfNumber: {
      type: [[Number]],
    },
  },
  {
    timestamps: true,
  }
);

const diagnosisSchema = new Schema(
  {
    classificationType: {
      type: String,
      required: true,
      maxlength: 30,
    },
    code: {
      type: String,
      maxlength: 15,
      required: true,
      unique: true,
    },
    shortDescription: {
      type: String,
      maxlength: 100,
      required: true,
    },
    longDescription: {
      type: String,
      maxlength: 400,
      required: true,
    },
  },
  {
    timestamps: true,
    elasticSearchIndexes: {
      code: {
        type: "text",
      },
      longDescription: {
        type: "text",
      },
    },
  }
);

module.exports = {
  conn,
  testSchema,
  testSchema2,
  veryNewSchema,
  testSchemaRefArray,
  testOptions,
  emailSchema,
  fileSchema,
  diagnosisSchema,
  s,
  s2,
  s3,
  sDiscriminator,
  sDiscriminator2,
  sDiscriminator3,
  usersSchema,
  studentsSchema,
  teachersSchema,
  directorSchema,
  schemaFields,
};
