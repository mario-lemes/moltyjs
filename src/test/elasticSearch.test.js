const { expect } = require("chai");

const Molty = require("../index");

const MongoClient = require("../clients/mongoClient");
const ConnectionManager = require("../clients/connectionManager");

const { Schema, connect, Model } = Molty;

const {
  testSchema,
  diagnosisSchema,
  testOptions,
  s2,
  sDiscriminator2,
  conn,
} = require("./mock");

xdescribe("# Elastic Search", () => {
  before(async () => {
    const res4 = await conn.dropDatabase("es4");

    const m2 = new Model(s2, "TestModel7_2");
    const m3 = new Model(diagnosisSchema, "Diagnoses");

    mDiscriminator = m2.discriminator(
      sDiscriminator2,
      "TestModel7Discriminator_2"
    );

    newDiscriminatorDoc5 = await mDiscriminator.new(
      {
        test: ["OOOKKA", "YEEEESA"],
        email: "5@dsfdfadsfsdf.es",
        password: "1234567890",
        jobTitle: "Web Designer",
        institution: "A",
      },
      "es4"
    );

    newDiscriminatorDoc6 = await mDiscriminator.new(
      {
        test: ["OOOKKB", "YEEEESB"],
        email: "6@dsfdfadsfsdf.es",
        password: "1234567890",
        jobTitle: "Coach",
        institution: "B",
      },
      "es4"
    );

    newDiscriminatorDoc7 = await mDiscriminator.new(
      {
        test: ["OOOKKC", "YEEEESC"],
        email: "7@dsfdfadsfsdf.es",
        password: "1234567890",
        jobTitle: "Engineer",
        institution: "C",
      },
      "es4"
    );

    newDiscriminatorDoc8 = await mDiscriminator.new(
      {
        test: ["OOOKKD", "YEEEESD"],
        email: "8@dsfdfadsfsdf.es",
        password: "1234567890",
        jobTitle: "Architect",
        institution: "D",
      },
      "es4"
    );
  });

  it("Performing operations into ES", async () => {
    try {
      // INSERT
      await conn.insertMany("es4", [
        newDiscriminatorDoc5,
        newDiscriminatorDoc6,
        newDiscriminatorDoc7,
        newDiscriminatorDoc8,
      ]);

      // UPDATE
      await conn.updateOne(
        "es4",
        "TestModel7Discriminator_2",
        { _id: newDiscriminatorDoc5._data._id },
        {
          $set: {
            firstName: "TEST",
          },
        }
      );

      await conn.updateOne(
        "es4",
        "TestModel7Discriminator_2",
        { _id: newDiscriminatorDoc6._data._id },
        {
          $set: {
            firstName: "HOLA",
          },
        }
      );

      await conn.updateOne(
        "es4",
        "TestModel7Discriminator_2",
        { _id: newDiscriminatorDoc7._data._id },
        {
          $set: {
            firstName: "COOL",
          },
        }
      );

      await conn.updateOne(
        "es4",
        "TestModel7Discriminator_2",
        { _id: newDiscriminatorDoc8._data._id },
        {
          $set: {
            firstName: "GREAT",
          },
        }
      );

      // DELETE
      await conn.deleteOne("es4", "TestModel7Discriminator_2", {
        _id: newDiscriminatorDoc5._data._id,
      });

      await conn.deleteOne("es4", "TestModel7Discriminator_2", {
        _id: newDiscriminatorDoc6._data._id,
      });

      await conn.deleteOne("es4", "TestModel7Discriminator_2", {
        firstName: "COOL",
      });

      let resFind = await conn.find(
        "es4",
        "TestModel7Discriminator_2",
        {},
        { moltyClass: false }
      );

      expect(resFind).to.have.lengthOf(1);

      expect(resFind[0]).to.have.property("email", "8@dsfdfadsfsdf.es");
      expect(resFind[0]).to.have.property("kind", "TestModel7Discriminator_2");
      expect(resFind[0]).to.have.property("firstName", "GREAT");
      expect(resFind[0]).to.have.property("lastName", "LEMES");
    } catch (error) {
      throw error;
    }
  });

  it("Get suggestions from ES", async () => {
    try {
      // GET SUGGESTIONS
      query = [
        {
          match_phrase_prefix: {
            firstName: {
              query: "Great",
              max_expansions: 100,
              slop: 10,
            },
          },
          /*wildcard: {
          name: '*',
        },*/
        },
      ];

      const res = await conn.ES.search(
        "es4",
        "TestModel7Discriminator_2",
        query
      );

      expect(res).to.have.property("hits");
      expect(res.hits).to.have.property("hits");
      expect(res.hits.hits).to.have.lengthOf(10);
      expect(res.hits.hits[0]).to.have.property("_index", "es4");
      expect(res.hits.hits[0]).to.have.property("_source");
      expect(res.hits.hits[0]._source).to.have.property("firstName", "GREAT");
    } catch (error) {
      throw error;
    }
  });
});
