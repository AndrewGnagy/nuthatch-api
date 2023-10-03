"use strict";
require("dotenv").config();

const router = require("express").Router();
const { checkKey } = require("./keysRoute");
const { pagedResponse, readPagingParams } = require("./paging")

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

let filterCheck = (key, bird, value) => {
  if (key == 'hasImg') {
    return ((value == "true") == (bird["images"] && bird["images"].length > 0));
  } else if (key == 'region') {
    return bird[key].indexOf(value) != -1;
  } else {
    return bird[key].toLowerCase().indexOf(value.toLowerCase()) != -1;
  }
}

//There's not that much data, we can keep it in memory for now
let birdsList = [];
router.get("/", checkKey, async (req, res) => {
  if (!birdsList.length) {
    const query = datastore.createQuery("Bird");
    [birdsList] = await datastore.runQuery(query);
  }
  let pageParams = readPagingParams(req);

  let filters = {
    name: req.query.name,
    sciName: req.query.sciName,
    conservationStatus: req.query.status,
    order: req.query.order,
    family: req.query.family,
    region: req.query.region,
    hasImg: req.query.hasImg
  };
  let sentFilterKeys = Object.keys(filters).filter(
    (n) => filters[n] !== undefined
  );
  let filteredList = [];
  if (req.query.operator === "OR") {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.some((key) => {
        return filterCheck(key, bird, filters[key]);
      });
    });
  } else {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.every((key) => {
        return filterCheck(key, bird, filters[key]);
      });
    });
  }
  res.json(pagedResponse(filteredList, pageParams.page, pageParams.pageSize));
});

module.exports = router;