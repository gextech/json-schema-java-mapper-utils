'use strict';
var testRun = require("raml2code-fixtures").loadSchemasAndRun;
var chai = require('chai');
var _ = require('lodash');
var should = chai.should();
var expect = require('chai').expect;

var util = require("./test-utils");


describe('inline ref ', function () {

  it("ref without title should be inner classes", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var inline = _.find(data, function (parsed) {
        return parsed.className === "WidgetInlineProperty";
      });

      var compositeType = _.find(inline.classMembers, function (it) {
        return it.name === "composite"
      });

      var composite = _.find(inline.innerClasses, function (it) {
       return it.className === 'Composite';
      });
      expect(compositeType.classType).to.be.equal("Composite");
      expect(composite.classMembers.length).to.be.at.least(1);
      done();
    };
    testRun(test, done);
  });


});
