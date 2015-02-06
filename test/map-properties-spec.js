'use strict';
var Glob = require("glob");
var chai = require('chai');
var _ = require('lodash');
var should = chai.should();
var expect = require('chai').expect;

var util = require("./test-utils");
var globOptions = {};

describe('mapProperties basic test', function () {
  
  it("shoult don't throw any excepcions", function(done){
    var basicTest = function(err, schemas, done){
      var data = util.handleData(schemas);
      done();
    };
    expect(function() {
      new Glob("**/*schema.json", globOptions, util.runTest(basicTest, done));
    }).not.to.throw()
  });

  it("Cat should have a references to owner", function(done){
    var test = function(err, schemas, done){
      var data = util.handleData(schemas);
      var cat = _.find(data, function(parsed){
        return parsed.className === "Cat";
      });
      var owner = _.find(cat.classMembers, function(members){
        return members.name === 'owner'
      });
      owner.type.should.be.equal("Owner");
      done();
    };
    new Glob("**/*schema.json", globOptions, util.runTest(test, done));

  });

  it("Cat should have a references to error and it must be a List", function(done){
    var test = function(err, schemas, done){
      var data = util.handleData(schemas);
      var cat = _.find(data, function(parsed){
        return parsed.className === "Cat";
      });
      var owner = _.find(cat.classMembers, function(members){
        return members.name === 'errors'
      });
      owner.type.should.be.equal("List<Error>");
      done();
    };
    new Glob("**/*schema.json", globOptions, util.runTest(test, done));

  });

  it("Cat should have a innerClass Food and must have a property name", function(done){
    var test = function(err, schemas, done){
      var data = util.handleData(schemas);
      var cat = _.find(data, function(parsed){
        return parsed.className === "Cat";
      });
      var innerClass = _.find(cat.innerClasses, function(innerClass){
        return innerClass.className === 'Food'
      });

      innerClass.classMembers.should.have.length(1);
      innerClass.classMembers[0].name.should.equal("name");
      done();
    };
    new Glob("**/*schema.json", globOptions, util.runTest(test, done));

  });

});
