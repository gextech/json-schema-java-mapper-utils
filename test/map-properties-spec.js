'use strict';
var testRun = require("raml2code-fixtures").loadSchemasAndRun;
var chai = require('chai');
var _ = require('lodash');
var expect = require('chai').expect;
var util = require("./test-utils");

describe('mapProperties basic test', function () {

  it("shoult don't throw any excepcions", function (done) {
    var basicTest = function (err, schemas, done) {
      var data = util.handleData(schemas);
      done();
    };
    expect(function () {
      testRun(util.runTest(basicTest, done));
    }).not.to.throw()
  });

  it("should map primitives", function (done) {

    var test = function (err, schemas, done) {
      //console.log(schemas);
      var data = util.handleData(schemas);
      var catBasic = _.find(data, function (parsed) {
        return parsed.className === "CatBasic";
      });
      expect(_.find(catBasic.classMembers, function (it) {
        return it.name === "name";
      }).classType).to.be.equal("String");

      expect(_.find(catBasic.classMembers, function (it) {
        return it.name === "weight";
      }).classType).to.be.equal("BigDecimal");

      expect(_.find(catBasic
        .classMembers, function (it) {
        return it.name === "age";
      }).classType).to.be.equal("Long");

      done();
    };
    testRun(util.runTest(test, done));

  });

  it("Cat should have a references to owner", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var cat = _.find(data, function (parsed) {
        return parsed.className === "ComplexCat";
      });
      var owner = _.find(cat.classMembers, function (members) {
        return members.name === 'owner'
      });
      owner.classType.should.be.equal("Owner");
      done();
    };
    testRun(util.runTest(test, done));

  });


  it("Cat should have and owner and it shouldn't be part of a innerClass", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var cat = _.find(data, function (parsed) {
        return parsed.className === "ComplexCat";
      });

      var owner = _.find(cat.classMembers, function (it) {
        return it.classType === 'Owner'
      });
      var ownerClass = _.find(cat.innerClasses, function (innerClass) {
        return innerClass.className === 'Owner'
      });

      expect(owner).to.be.an('object');
      expect(ownerClass).to.be.an('undefined');
      done();
    };
    testRun(util.runTest(test, done));
  });

  it("Cat should have a innerClass Food and must have a property names", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var cat = _.find(data, function (parsed) {
        return parsed.className === "ComplexCat";
      });
      var innerClass = _.find(cat.innerClasses, function (innerClass) {
        return innerClass.className === 'Food'
      });

      innerClass.classMembers.should.have.length(1);
      innerClass.classMembers[0].name.should.equal("name");
      done();
    };
    testRun(util.runTest(test, done));

  });

  it("Cat should have a abstract property sings and should be mapped to a Map", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var cat = _.find(data, function (parsed) {
        return parsed.className === "ComplexCat";
      });
      var signs = _.find(cat.classMembers, function (it) {
        return it.name === 'sings'
      });
      expect(signs.classType).to.be.equal('Map');
      done();
    };
    testRun(util.runTest(test, done));

  });

  it("Cat should have a list of friends and should be a generic List", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var cat = _.find(data, function (parsed) {
        return parsed.className === "ComplexCat";
      });
      var friends = _.find(cat.classMembers, function (it) {
        return it.name === 'friends'
      });
      expect(friends.classType).to.be.equal('List');
      done();
    };
    testRun(util.runTest(test, done));

  });

  it("should map List of primitives", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var primitivesArray = _.find(data, function (parsed) {
        return parsed.className === "PrimitiveArray";
      });
      expect(_.find(primitivesArray.classMembers, function (it) {
        return it.name === "strings";
      }).classType).to.be.equal("List<String>");

      expect(_.find(primitivesArray.classMembers, function (it) {
        return it.name === "booleans";
      }).classType).to.be.equal("List<Boolean>");

      expect(_.find(primitivesArray.classMembers, function (it) {
        return it.name === "numbers";
      }).classType).to.be.equal("List<BigDecimal>");

      expect(_.find(primitivesArray
        .classMembers, function (it) {
        return it.name === "longs";
      }).classType).to.be.equal("List<Long>");

      done();
    };
    testRun(util.runTest(test, done));
  });


});
