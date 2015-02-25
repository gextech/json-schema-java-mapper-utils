'use strict';
var testRun = require("raml2code-fixtures").loadSchemasAndRun;
var utilMapProperty = require('../lib/utils/map-properties');
var chai = require('chai');
var _ = require('lodash');
var should = chai.should();
var expect = require('chai').expect;

var util = require("./test-utils");

describe('nested schema', function () {

  it("shoult work with nested schemas", function (done) {
    var basicTest = function (err, schemas, done) {
      var data = util.handleData(schemas);
      done();
    };
    expect(function () {
      testRun(basicTest, done, "nested/genericContentType.nested.json" );
    }).not.to.throw()
  });

  it("nested level 1 should have length of 10 ", function (done) {

    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      data[0].innerClasses[0].innerClasses.length.should.equal(11);
      done();
    };

    testRun(test, done, "nested/genericContentType.nested.json" );
  });

  it("nested level relatedContent should be a patternProperties  ", function (done) {

    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);

      var patternProperties = data[0].innerClasses[0].patternProperties;
      var relatedContent =_.find(patternProperties, function(it){
        return it.property.name === "relatedContent"
      });
      expect(relatedContent).not.to.be.null;
      expect(relatedContent).not.to.be.undefined;
      done();
    };

    testRun(test, done, "nested/genericContentType.nested.json" );

  });

});
