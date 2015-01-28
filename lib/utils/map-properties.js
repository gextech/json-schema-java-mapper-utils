var Deref, handleArray, handleObject, pascalCase, resolveInnerClass, resolveType, resolveTypeByRef, util, _;

Deref = require('deref');

_ = require('lodash');

pascalCase = require('pascal-case');

util = {};

util.mapProperties = function(expandedSchema, refMap, mapping) {
  var data, key, keyRef, propParsed, property, _ref;
  data = {};
  data.classMembers = [];
  data.innerClasses = [];
  data.className = pascalCase(expandedSchema.title);
  data.classDescription = (_ref = expandedSchema.description) != null ? _ref : "";
  if (expandedSchema.properties && expandedSchema.properties.$ref) {
    keyRef = expandedSchema.properties.$ref;
    expandedSchema.properties = Deref.util.findByRef(keyRef, refMap);
  }
  for (key in expandedSchema.properties) {
    property = expandedSchema.properties[key];
    if (typeof property !== 'string') {
      if (expandedSchema.required && _.contains(expandedSchema.required, key)) {
        property.required = true;
      }
      propParsed = util.mapProperty(property, key, '', mapping, refMap);
      data.classMembers.push(propParsed.property);
      if (propParsed.innerClass) {
        data.innerClasses.push(propParsed.innerClass);
      }
    }
  }
  return data;
};

util.mapProperty = function(property, name, annotation, mapping, refMap) {
  var data, keyRef, keyRefData, _ref;
  data = {};
  data.property = {};
  data.property.name = name;
  data.property.comment = property.description;
  data.property.required = property.required !== void 0 ? property.required : false;
  data.property.size = [];
  if (property.minLength) {
    data.property.size.push({
      "name": "min",
      "value": property.minLength
    });
  }
  if (property.maxLength) {
    data.property.size.push({
      "name": "max",
      "value": property.maxLength
    });
  }
  if (property.items && property.items["$ref"]) {
    keyRef = property.items["$ref"];
    keyRefData = resolveTypeByRef(keyRef, refMap, name, true);
  } else if (property["$ref"]) {
    keyRef = property["$ref"];
    keyRefData = resolveTypeByRef(keyRef, refMap, name);
    data.property.type = keyRefData.type;
    if (keyRefData.innnerSchema.type) {
      property.type = keyRefData.innnerSchema.type;
    } else {
      property.properties = keyRefData.innnerSchema;
      data.innerClass = resolveInnerClass(keyRefData.type, property, refMap, mapping);
      property.type = resolveType(data.innerClass, name);
    }
  }
  switch (property.type) {
    case 'array':
      handleArray(keyRefData, mapping, data);
      break;
    case 'object':
      handleObject(property, name, refMap, keyRefData, mapping, data);
      break;
    default:
      data.property.type = (_ref = mapping[property.type]) != null ? _ref : property.type;
  }
  switch (data.property.type) {
    case "BigDecimal":
      data.property.decimalMax = property.maximum;
      data.property.decimalMin = property.minimum;
      break;
    case "Long":
      data.property.max = property.maximum;
      data.property.min = property.minimum;
  }
  data.property.kind = annotation + ("(\"" + data.property.name + "\")");
  return data;
};

handleArray = function(keyRefData, mapping, data) {
  var auxType, primitiveType;
  auxType = "List";
  if (keyRefData && keyRefData.innnerSchema.items !== void 0) {
    primitiveType = mapping[keyRefData.innnerSchema.items.type];
    if (keyRefData.innnerSchema.items.title) {
      auxType += "<" + keyRefData.type + ">";
    } else if (primitiveType) {
      auxType += "<" + primitiveType + ">";
    }
  }
  return data.property.type = auxType;
};

handleObject = function(property, name, refMap, keyRefData, mapping, data) {
  var innerClass;
  if (property.properties) {
    if (keyRefData && keyRefData.type) {
      return data.property.type = keyRefData.type;
    } else {
      data.property.type = resolveType(property, name);
      innerClass = resolveInnerClass(data.property.type, property, refMap, mapping);
      return data.innerClass = innerClass;
    }
  } else if (keyRefData && keyRefData.innnerSchema && keyRefData.innnerSchema.properties) {
    data.property.type = keyRefData.type;
    property.properties = keyRefData.innnerSchema;
    return data.innerClass = resolveInnerClass(keyRefData.type, property, refMap, mapping);
  } else {
    return data.property.type = 'Map';
  }
};

resolveTypeByRef = function(keyRef, refMap, propertyName, isArray) {
  var data, innerSchema;
  if (isArray == null) {
    isArray = false;
  }
  data = {};
  data.type = "";
  innerSchema = Deref.util.findByRef(keyRef, refMap);
  if (innerSchema) {
    if (isArray) {
      data.innnerSchema = {};
      data.innnerSchema.items = innerSchema;
    } else {
      data.innnerSchema = innerSchema;
    }
    data.type = resolveType(innerSchema, propertyName);
  } else if (keyRef) {
    console.error("$ref not found: " + keyRef + " RefMap.keys -> [" + (Object.keys(refMap)) + "]");
    console.error(JSON.stringify(refMap));
  }
  return data;
};

resolveType = function(schema, propertyName) {
  var type;
  type = "";
  if (schema) {
    if (schema.title) {
      type = pascalCase(schema.title);
    } else {
      type = pascalCase(propertyName);
    }
  }
  return type;
};

resolveInnerClass = function(name, property, refMap, mapping) {
  var aux, data;
  data = null;
  if (property && !property.properties.title) {
    data = {};
    data.className = pascalCase(name);
    data.classDescription = property.description;
    aux = util.mapProperties(property, refMap, mapping);
    data.classMembers = aux.classMembers;
  }
  return data;
};

module.exports = util;
