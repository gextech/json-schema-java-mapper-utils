var Deref, handleArray, handleObject, handlePatternProperties, pascalCase, resolveInnerClass, resolveType, resolveTypeByRef, util, _;

Deref = require('deref');

_ = require('lodash');

pascalCase = require('pascal-case');

util = {};

util.mapProperties = function(expandedSchema, refMap, mapping) {
  var classDef, key, keyRef, propParsed, property, _ref;
  classDef = {};
  classDef.classMembers = [];
  classDef.patternProperties = [];
  classDef.innerClasses = [];
  classDef.className = pascalCase(expandedSchema.title);
  classDef.classDescription = (_ref = expandedSchema.description) != null ? _ref : "";
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
      if (propParsed.property) {
        classDef.classMembers.push(propParsed.property);
      }
      if (propParsed.patternProperties) {
        classDef.patternProperties = _.union(classDef.patternProperties, propParsed.patternProperties);
      }
      if (propParsed.innerClass) {
        classDef.innerClasses.push(propParsed.innerClass);
      }
    }
  }
  return classDef;
};

util.mapProperty = function(property, name, annotation, mapping, refMap) {
  var keyRef, keyRefData, objDef, propertyDef, _ref;
  propertyDef = {};
  propertyDef.property = {};
  if (property.items && property.items["$ref"]) {
    keyRef = property.items["$ref"];
    keyRefData = resolveTypeByRef(keyRef, refMap, name, true);
  } else if (property["$ref"]) {
    keyRef = property["$ref"];
    keyRefData = resolveTypeByRef(keyRef, refMap, name);
    propertyDef.property.type = keyRefData.type;
    if (keyRefData.innnerSchema.type) {
      property.type = keyRefData.innnerSchema.type;
    }
  } else if (property.patternProperties) {
    propertyDef.patternProperties = [];
    propertyDef.patternProperties = handlePatternProperties(property, name, refMap, keyRefData, mapping, annotation);
    return propertyDef;
  }
  propertyDef.property.name = name;
  propertyDef.property.comment = property.description;
  propertyDef.property.required = property.required !== void 0 ? property.required : false;
  propertyDef.property.size = [];
  if (property.minLength) {
    propertyDef.property.size.push({
      "name": "min",
      "value": property.minLength
    });
  }
  if (property.maxLength) {
    propertyDef.property.size.push({
      "name": "max",
      "value": property.maxLength
    });
  }
  switch (property.type) {
    case 'array':
      propertyDef.property.type = handleArray(keyRefData, mapping);
      break;
    case 'object':
      objDef = handleObject(property, name, refMap, keyRefData, mapping);
      propertyDef.property.type = objDef.type;
      propertyDef.innerClass = objDef.innerClass;
      break;
    default:
      if (name !== "relatedContent") {
        propertyDef.property.type = (_ref = mapping[property.type]) != null ? _ref : property.type;
      }
  }
  switch (propertyDef.property.type) {
    case "BigDecimal":
      propertyDef.property.decimalMax = property.maximum;
      propertyDef.property.decimalMin = property.minimum;
      break;
    case "Long":
      propertyDef.property.max = property.maximum;
      propertyDef.property.min = property.minimum;
  }
  propertyDef.property.kind = annotation + ("(\"" + propertyDef.property.name + "\")");
  return propertyDef;
};

handlePatternProperties = function(property, name, refMap, keyRefData, mapping, annotation) {
  var key, patternProperties, patternProperty, propertyMapped;
  patternProperties = [];
  for (key in property.patternProperties) {
    patternProperty = {};
    patternProperty.regex = key;
    propertyMapped = util.mapProperty(property.patternProperties[key], name, annotation, mapping, refMap);
    patternProperty.property = propertyMapped.property;
    patternProperties.push(patternProperty);
  }
  return patternProperties;
};

handleArray = function(keyRefData, mapping) {
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
  return auxType;
};

handleObject = function(property, name, refMap, keyRefData, mapping) {
  var innerClass, objectDesc;
  property = _.clone(property, true);
  objectDesc = {};
  if (property.properties) {
    if (keyRefData && keyRefData.type) {
      objectDesc.type = keyRefData.type;
    } else {
      objectDesc.type = resolveType(property, name);
      innerClass = resolveInnerClass(objectDesc.type, property, refMap, mapping);
      objectDesc.innerClass = innerClass;
    }
  } else if (keyRefData && keyRefData.innnerSchema && keyRefData.innnerSchema.properties) {
    objectDesc.type = keyRefData.type;
    property.properties = keyRefData.innnerSchema;
    objectDesc.innerClass = resolveInnerClass(keyRefData.type, property, refMap, mapping);
  } else {
    objectDesc.type = 'Map';
  }
  return objectDesc;
};

resolveTypeByRef = function(keyRef, refMap, propertyName, isArray) {
  var innerSchema, tipo;
  if (isArray == null) {
    isArray = false;
  }
  tipo = {};
  tipo.type = "";
  innerSchema = Deref.util.findByRef(keyRef, refMap);
  if (innerSchema) {
    if (isArray) {
      tipo.innnerSchema = {};
      tipo.innnerSchema.items = innerSchema;
    } else {
      tipo.innnerSchema = innerSchema;
    }
    tipo.type = resolveType(innerSchema, propertyName);
  } else if (keyRef) {
    console.error("$ref not found: " + keyRef + " RefMap.keys -> [" + (Object.keys(refMap)) + "]");
    console.error(JSON.stringify(refMap));
  }
  return tipo;
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
  var aux, innerClass;
  innerClass = {};
  if (property && !property.properties.title) {
    innerClass.className = pascalCase(name);
    innerClass.classDescription = property.description;
    aux = util.mapProperties(property, refMap, mapping);
    innerClass.classMembers = aux.classMembers;
    innerClass.innerClasses = aux.innerClasses;
    innerClass.patternProperties = aux.patternProperties;
  }
  return innerClass;
};

module.exports = util;
