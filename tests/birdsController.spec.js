const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");

const sandbox = sinon.createSandbox();

let controller = require("../controllers/birdController");

describe("Testing birds controller", () => {
  afterEach(() => {
    controller = require("../controllers/birdController");
    sandbox.restore();
  });

  describe("getBirdsV2", () => {
    beforeEach(() => {
      sampleItemVal =[[
        {
          images: [
            "https://images.unsplash.com/photo-1643650997626-0124dbb98261",
            "https://images.unsplash.com/photo-1644610901347-b05ec91bb9b2",
            "https://images.unsplash.com/photo-1641995171363-9bc67bfb1b7c",
          ],
          lengthMin: "47",
          lengthMax: "51",
          name: "Black-bellied Whistling-Duck",
          id: 1,
          sciName: "Dendrocygna autumnalis",
          region: ["North America"],
          family: "Anatidae",
          order: "Anseriformes",
          status: "Low Concern",
        },
        {
          images: [
            "https://images.unsplash.com/photo-1631526821452-cb0d2396f5ce",
            "https://images.unsplash.com/photo-1631526820134-d898f32d101a",
          ],
          lengthMin: "35",
          lengthMax: "43",
          name: "Fake Hawk",
          wingspanMin: "56",
          id: 46,
          wingspanMax: "62",
          sciName: "Fakus jamaicensis",
          region: ["North America", "Western Europe"],
          family: "Fakidae",
          order: "Fakiformes",
          status: "Very Concerned",
        },
      ]];

      sandbox.stub(Datastore.prototype, "runQuery").resolves(sampleItemVal);
    });

    it("should filter by name", (done) => {
      let jsonSpy = sandbox.spy();
      controller.getBirdsV2({ query: { name: "Hawk" } }, { json: jsonSpy }).then(() => {
        expect(jsonSpy.called).to.be.true;
        let calledArg = jsonSpy.getCall(0).args[0];
        expect(calledArg).to.exist;
        expect(calledArg["entities"][0]["name"]).to.equal("Fake Hawk");
        done();
      });
    });

    it("should filter by family", (done) => {
      let jsonSpy = sandbox.spy();
      controller.getBirdsV2({ query: { family: "fakidae" } }, { json: jsonSpy }).then(() => {
        expect(jsonSpy.called).to.be.true;
        let calledArg = jsonSpy.getCall(0).args[0];
        expect(calledArg).to.exist;
        expect(calledArg["entities"][0]["name"]).to.equal("Fake Hawk");
        done();
      });
    });

    it("should filter by multi AND", (done) => {
      let jsonSpy = sandbox.spy();
      controller.getBirdsV2({ query: { region: "North America", name: "Duck" } }, { json: jsonSpy }).then(() => {
        expect(jsonSpy.called).to.be.true;
        let calledArg = jsonSpy.getCall(0).args[0];
        expect(calledArg).to.exist;
        expect(calledArg["entities"].length).to.equal(1);
        expect(calledArg["entities"][0]["name"]).to.equal("Black-bellied Whistling-Duck");
        done();
      });
    });

    it("should filter by multi OR", (done) => {
      let jsonSpy = sandbox.spy();
      controller.getBirdsV2({ query: { name: "Duck", sciName: "Fakus", operator: "OR" } }, { json: jsonSpy }).then(() => {
        expect(jsonSpy.called).to.be.true;
        let calledArg = jsonSpy.getCall(0).args[0];
        expect(calledArg).to.exist;
        expect(calledArg["entities"].length).to.equal(2);
        expect(calledArg["entities"][0]["name"]).to.equal("Black-bellied Whistling-Duck");
        expect(calledArg["entities"][1]["name"]).to.equal("Fake Hawk");
        done();
      });
    });
  });
});
