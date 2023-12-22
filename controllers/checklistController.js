const { pagedResponse, readPagingParams } = require("../paging");
const { randomUUID } = require("crypto");
const { matchedData } = require("express-validator");
// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

let getChecklists = async (req, res) => {
  const query = datastore
    .createQuery("nh_checklist")
    .filter("api_key", "=", req.get("API-Key"));
  let [checklists] = await datastore.runQuery(query);
  checklists = checklists.map((u) => {
    return {
      name: u.name,
      id: u.id,
    };
  });
  res.json(pagedResponse(checklists, 1, 25));
};

let postChecklist = async (req, res) => {
  const query = datastore
    .createQuery("nh_checklist")
    .filter("api_key", "=", req.get("API-Key"));
  let [checklists] = await datastore.runQuery(query);
  if (checklists.length >= 25) {
    res.status = 400;
    res.json({ message: "25 checklist limit exceeded" });
    return;
  }

  const guid = randomUUID();
  const checklistKey = datastore.key(["nh_checklist", guid]);
  const entity = {
    key: checklistKey,
    data: [
      {
        name: "id",
        value: guid,
      },
      {
        name: "name",
        value: req.body.name,
      },
      {
        name: "api_key",
        value: req.get("API-Key"),
      },
    ],
  };
  await datastore.save(entity);
  res.json(entity.data);
};

let deleteChecklist = async (req, res) => {
  //Delete checklist
  const checklistKey = datastore.key(["nh_checklist", req.params.checklistId]);
  await datastore.delete(checklistKey);
  //Delete any checklist entries
  const query = datastore
    .createQuery("nh_checklist")
    .filter("checklistId", "=", req.params.checklistId);
  let [checks] = await datastore.runQuery(query);
  await checks.map((check) => {
    return datastore.delete(check);
  });
  res.json();
};

let getChecklistEntries = async (req, res) => {
  let pageParams = readPagingParams(req, 100);
  const query = datastore
    .createQuery("nh_checklist_entry")
    .filter("checklistId", "=", req.params.checklistId);
  let [checks] = await datastore.runQuery(query);
  res.json(pagedResponse(checks, pageParams.page, pageParams.pageSize));
};

let postChecklistEntry = async (req, res) => {
  const allData = matchedData(req);

  const checkKey = datastore.key([
    "nh_checklist_entry",
    allData.checklistId + ":" + allData.birdId,
  ]);
  const entity = {
    key: checkKey,
    data: [
      {
        name: "checklistId",
        value: allData.checklistId,
      },
      {
        name: "birdId",
        value: allData.birdId,
      },
      {
        name: "description",
        value: allData.description,
      },
      {
        name: "date-time",
        value: new Date().toISOString(),
      },
      {
        name: "location",
        value: allData.location,
      },
    ],
  };
  await datastore.save(entity);
  res.json(
    entity.data.reduce((set, x) => {
      set[x.name] = x.value;
      return set;
    }, {})
  );
};

module.exports = { getChecklists, postChecklist, deleteChecklist, getChecklistEntries, postChecklistEntry};
