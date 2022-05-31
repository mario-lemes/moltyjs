const { expect } = require("chai");

const Molty = require("../index");

const Mongoconn = require("../clients/mongoClient");
const ConnectionManager = require("../clients/connectionManager");

const { Schema, connect } = Molty;

const { testSchema, testOptions, s, m, conn } = require("./mock");

describe("# Connection", () => {
  before(() => {});

  it.only("Creating a new connection", async () => {
    try {
      expect(conn).to.have.property("_connectionManager");
      expect(conn._connectionManager).to.be.an.instanceof(ConnectionManager);
      expect(conn._connectionManager).to.have.property("_pool");
      expect(conn._connectionManager._pool).to.have.property("_started", true);
      expect(conn._connectionManager._pool._factory).to.be.an.instanceof(
        Object
      );
      expect(conn._connectionManager._pool._factory).to.have.property("create");
      expect(conn._connectionManager._pool._factory).to.have.property(
        "destroy"
      );
      expect(conn._connectionManager._pool._factory.create).to.be.an.instanceof(
        Function
      );
      expect(
        conn._connectionManager._pool._factory.destroy
      ).to.be.an.instanceof(Function);
    } catch (error) {
      throw error;
    }
  });
});
