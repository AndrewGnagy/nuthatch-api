"use strict";
require("dotenv").config();
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./birds.db");

const dataKind = "Bird";

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

async function dbThing() {
  let query = "SELECT * FROM birds";
  db.all(query, [], function (err, rows) {
    if (err) {
      console.log(err);
    }
    let results = rows.map((row) => {
      return {
        id: row.id,
        name: row.name,
        sciName: row.sciName,
        status: row.conservationStatus,
        order: row.ordr,
        family: row.family,
      };
    });

    results.forEach(async (row) => {
      const birdKey = datastore.key([dataKind, row.id]);
      // Prepares the new entity
      const bird = {
        key: birdKey,
        data: {
          id: row.id,
          name: row.name,
          sciName: row.sciName,
          status: row.status,
          order: row.order,
          family: row.family,
        },
      };
      await datastore.save(bird);
    })
  });
}
dbThing();