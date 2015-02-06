Deref = require('deref')
_ = require('lodash')
pascalCase = require('pascal-case')
util = {}

util.mapProperties = (expandedSchema, refMap, mapping) ->
  classDef = {}
  classDef.classMembers = []
  classDef.patternProperties = []
  classDef.innerClasses = []
  classDef.className = pascalCase(expandedSchema.title)
  classDef.classDescription = expandedSchema.description ? ""

  if expandedSchema.properties and expandedSchema.properties.$ref
    keyRef = expandedSchema.properties.$ref
    expandedSchema.properties = Deref.util.findByRef(keyRef, refMap)

  for key of expandedSchema.properties
    property = expandedSchema.properties[key]
    #Canonical de-referencing and inline de-referencing
    #http://json-schema.org/latest/json-schema-core.html#anchor30
    if typeof property isnt 'string'
      property.required = true if expandedSchema.required and _.contains(expandedSchema.required, key)
      propParsed = util.mapProperty(property, key, '', mapping, refMap)
      classDef.classMembers.push propParsed.property if propParsed.property
      classDef.patternProperties = _.union(classDef.patternProperties, propParsed.patternProperties) if propParsed.patternProperties
      classDef.innerClasses.push propParsed.innerClass if propParsed.innerClass
  classDef

util.mapProperty = (property, name, annotation, mapping, refMap) ->

  propertyDef = {}
  propertyDef.property = {}

  #if property has $ref resolve
  if property.items and property.items["$ref"]
    keyRef = property.items["$ref"]
    keyRefData = resolveTypeByRef(keyRef, refMap, name, true)
  else if property["$ref"]
    keyRef = property["$ref"]
    keyRefData = resolveTypeByRef(keyRef, refMap, name)
    propertyDef.property.type = keyRefData.type
    if keyRefData.innnerSchema.type
      property.type = keyRefData.innnerSchema.type
  else if property.patternProperties
    propertyDef.patternProperties = []
    propertyDef.patternProperties  = handlePatternProperties(property, name, refMap, keyRefData, mapping, annotation)
    return propertyDef

  propertyDef.property.name = name
  propertyDef.property.comment = property.description
  propertyDef.property.required = if property.required isnt undefined then property.required else false
  propertyDef.property.size = []
  propertyDef.property.size.push {"name": "min", "value": property.minLength} if property.minLength
  propertyDef.property.size.push {"name": "max", "value": property.maxLength} if property.maxLength

  switch property.type
    when 'array'
      propertyDef.property.type = handleArray( keyRefData, mapping)
    when 'object'
      objDef = handleObject(property, name, refMap, keyRefData, mapping )
      propertyDef.property.type = objDef.type
      propertyDef.innerClass = objDef.innerClass
    else
      if name isnt "relatedContent"
       propertyDef.property.type = mapping[property.type] ? property.type

  switch propertyDef.property.type
    when "BigDecimal"
      propertyDef.property.decimalMax = property.maximum
      propertyDef.property.decimalMin = property.minimum
    when "Long"
      propertyDef.property.max = property.maximum
      propertyDef.property.min = property.minimum

  propertyDef.property.kind = annotation + "(\"#{propertyDef.property.name}\")"
  propertyDef


handlePatternProperties = (property, name, refMap, keyRefData, mapping, annotation) ->
  patternProperties = []
  for key of property.patternProperties
    patternProperty = {}
    patternProperty.regex = key
    #should a patternProperty have innerClass
    propertyMapped = util.mapProperty(property.patternProperties[key], name, annotation, mapping, refMap)
    patternProperty.property = propertyMapped.property
    patternProperties.push patternProperty
  patternProperties

handleArray = (keyRefData, mapping) ->
  auxType = "List"
  if keyRefData and keyRefData.innnerSchema.items isnt undefined
    primitiveType = mapping[keyRefData.innnerSchema.items.type]

    #if property doesn't has title we use primitive types
    if keyRefData.innnerSchema.items.title
      auxType += "<#{keyRefData.type}>"
    else if primitiveType
      auxType += "<#{primitiveType}>"

  auxType

handleObject = (property, name, refMap, keyRefData, mapping ) ->
  property = _.clone(property, true)
  objectDesc = {}
  #if object has no references we made a inner class
  if property.properties
    if keyRefData and keyRefData.type
      objectDesc.type = keyRefData.type
    else
      objectDesc.type = resolveType(property, name)
      innerClass = resolveInnerClass(objectDesc.type, property, refMap, mapping)
      objectDesc.innerClass = innerClass

  else if keyRefData and keyRefData.innnerSchema and keyRefData.innnerSchema.properties
    objectDesc.type = keyRefData.type
    property.properties = keyRefData.innnerSchema
    objectDesc.innerClass = resolveInnerClass(keyRefData.type, property, refMap, mapping)
  else
    objectDesc.type = 'Map'
  objectDesc


resolveTypeByRef = (keyRef, refMap, propertyName, isArray = false) ->
  tipo = {}
  tipo.type = ""
  innerSchema = Deref.util.findByRef(keyRef, refMap)
  if innerSchema
    if isArray
      tipo.innnerSchema = {}
      tipo.innnerSchema.items = innerSchema
    else
      tipo.innnerSchema = innerSchema

    tipo.type = resolveType(innerSchema, propertyName)

  else if keyRef
    console.error "$ref not found: #{keyRef} RefMap.keys -> [#{Object.keys(refMap)}]"
    console.error JSON.stringify(refMap)

  tipo

resolveType = (schema, propertyName) ->
  type = ""
  if schema
    if schema.title
      type = pascalCase(schema.title)
    else
      type = pascalCase(propertyName)

  type

resolveInnerClass = (name, property, refMap, mapping) ->
  innerClass = {}
  #if the property has #ref and title we don't need innerClass
  #because it should be already mapped
  if property and not property.properties.title
    innerClass.className = pascalCase(name)
    innerClass.classDescription = property.description
    aux = util.mapProperties(property, refMap, mapping)
    innerClass.classMembers = aux.classMembers
    innerClass.innerClasses = aux.innerClasses
    innerClass.patternProperties = aux.patternProperties
  innerClass

module.exports = util
