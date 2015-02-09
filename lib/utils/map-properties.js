var Deref, handleArray, handleObject, handlePatternProperties, handleRef, mapInnerClass, pascalCase, resolveClassType, resolveTypeByRef, util, _;

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
  var itemsType, keyRefData, objDef, propertyDef, _ref;
  propertyDef = {};
  propertyDef.property = {};
  if (property.patternProperties) {
    propertyDef.patternProperties = [];
    propertyDef.patternProperties = handlePatternProperties(property, name, refMap, mapping, annotation);
    return propertyDef;
  }
  keyRefData = handleRef(property, refMap, name);
  if (keyRefData && keyRefData.innnerSchema.items) {
    property.type = 'array';
  } else if (keyRefData && keyRefData.innnerSchema) {
    property.type = keyRefData.innnerSchema.type ? keyRefData.innnerSchema.type : "object";
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
      if (property.items) {
        itemsType = property.items.type;
      }
      propertyDef.property.classType = handleArray(keyRefData, itemsType, mapping, name);
      break;
    case 'object':
      objDef = handleObject(property, name, refMap, keyRefData, mapping);
      propertyDef.property.classType = objDef.classType;
      propertyDef.innerClass = objDef.innerClass;
      break;
    default:
      if (name !== "relatedContent") {
        propertyDef.property.classType = (_ref = mapping[property.type]) != null ? _ref : property.type;
      }
  }
  switch (propertyDef.property.classType) {
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

handleRef = function(property, refMap, name) {
  if (property.items && property.items["$ref"]) {
    return resolveTypeByRef(property.items["$ref"], refMap, name, true);
  } else if (property["$ref"]) {
    return resolveTypeByRef(property["$ref"], refMap, name);
  }
};

handlePatternProperties = function(property, name, refMap, mapping, annotation) {
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

handleArray = function(keyRefData, itemsType, mapping, name) {
  var auxType, primitiveType;
  auxType = "List";
  if (keyRefData && keyRefData.innnerSchema.items !== void 0) {
    primitiveType = mapping[keyRefData.innnerSchema.items.type];
    if (keyRefData.innnerSchema.items.title) {
      auxType += "<" + (resolveClassType(keyRefData.innnerSchema.items, name)) + ">";
    } else if (primitiveType) {
      auxType += "<" + primitiveType + ">";
    }
  } else {
    primitiveType = mapping[itemsType];
    if (primitiveType) {
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
    objectDesc.classType = resolveClassType(property, name);
    innerClass = mapInnerClass(objectDesc.classType, property, refMap, mapping);
    objectDesc.innerClass = innerClass;
  } else if (keyRefData && !keyRefData.innnerSchema.title) {
    objectDesc.classType = resolveClassType(keyRefData.innnerSchema, name);
    objectDesc.innerClass = mapInnerClass(objectDesc.classType, keyRefData.innnerSchema, refMap, mapping);
  } else if (keyRefData) {
    objectDesc.classType = resolveClassType(keyRefData.innnerSchema, name);
  } else {
    objectDesc.classType = 'Map';
  }
  return objectDesc;
};

resolveTypeByRef = function(keyRef, refMap, propertyName, isArray) {
  var innerSchema, ref;
  if (isArray == null) {
    isArray = false;
  }
  ref = {};
  innerSchema = Deref.util.findByRef(keyRef, refMap);
  if (innerSchema) {
    if (isArray) {
      ref.innnerSchema = {};
      ref.innnerSchema.items = innerSchema;
    } else {
      ref.innnerSchema = innerSchema;
    }
  } else if (keyRef) {
    console.error("$ref not found: " + keyRef + " RefMap.keys -> [" + (Object.keys(refMap)) + "]");
    console.error(JSON.stringify(refMap));
  }
  return ref;
};

resolveClassType = function(schema, propertyName) {
  var classType, type;
  classType = "";
  if (schema) {
    if (schema.title) {
      type = pascalCase(schema.title);
    } else {
      type = pascalCase(propertyName);
    }
  }
  return type;
};

mapInnerClass = function(name, property, refMap, mapping) {
  var aux, innerClass;
  innerClass = {};
  if (property) {
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
