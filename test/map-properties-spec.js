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
      owner.classType.should.be.equal("Owner");
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
      var errors = _.find(cat.classMembers, function(members){
        return members.name === 'errors'
      });
      errors.classType.should.be.equal("List<Error>");
      done();
    };
    new Glob("**/*schema.json", globOptions, util.runTest(test, done));

  });

  it("Cat should have and owner and it shouldn't be part of a innerClass", function(done){
    var test = function(err, schemas, done){
      var data = util.handleData(schemas);
      var cat = _.find(data, function(parsed){
        return parsed.className === "Cat";
      });

      var owner = _.find(cat.classMembers, function(it){
        return it.classType === 'Owner'
      });
      var ownerClass = _.find(cat.innerClasses, function(innerClass){
        return innerClass.className === 'Owner'
      });

      expect(owner).to.be.an('object');
      expect(ownerClass).to.be.an('undefined');
      done();
    };
    new Glob("**/*schema.json", globOptions, util.runTest(test, done));
  });

  it("Cat should have a innerClass Food and must have a property names", function(done){
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


  it("should map List of primitives", function(done){
    var test = function(err, schemas, done){
      var data = util.handleData(schemas);
      var primitivesArray = _.find(data, function(parsed){
        return parsed.className === "PrimitiveArray";
      });
      expect(_.find(primitivesArray.classMembers, function(it){
        return it.name === "strings";
      }).classType).to.be.equal("List<String>");

      expect(_.find(primitivesArray.classMembers, function(it){
        return it.name === "booleans";
      }).classType).to.be.equal("List<Boolean>");

      expect(_.find(primitivesArray.classMembers, function(it){
        return it.name === "numbers";
      }).classType).to.be.equal("List<BigDecimal>");

      expect(_.find(primitivesArray
        .classMembers, function(it){
        return it.name === "longs";
      }).classType).to.be.equal("List<Long>");
      
      done();
    };
    new Glob("**/*schema.json", globOptions, util.runTest(test, done));

  });




});
