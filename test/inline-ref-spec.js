'use strict';
var Glob = require("glob");
var chai = require('chai');
var _ = require('lodash');
var should = chai.should();
var expect = require('chai').expect;

var util = require("./test-utils");
var globOptions = {};

describe('inline ref ', function () {

  it("ref without title should be inner classes", function (done) {
    var test = function (err, schemas, done) {
      var data = util.handleData(schemas);
      var inline = _.find(data, function (parsed) {
        return parsed.className === "WidgetInlineProperty";
      });
      var composite = _.find(inline.innerClasses, function (it) {
       return it.className === 'Composite';
      });
      expect(composite).not.to.be.undefined;
      done();
    };
    new Glob("**/*schema.json", globOptions, util.runTest(test, done));
  });


});
