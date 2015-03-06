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

  if property.patternProperties
    propertyDef.patternProperties = []
    propertyDef.patternProperties  = handlePatternProperties(property, name, refMap, mapping, annotation)
    return propertyDef

  #if property has $ref resolve
  keyRefData = handleRef(property, refMap, name)

  if keyRefData and keyRefData.innnerSchema.items
    property.type = 'array'
  else if keyRefData and  keyRefData.innnerSchema
    property.type = if keyRefData.innnerSchema.type then  keyRefData.innnerSchema.type else "object"

  propertyDef.property.name = name
  propertyDef.property.comment = property.description
  propertyDef.property.required = if property.required isnt undefined then property.required else false
  propertyDef.property.size = []

  if property.default isnt undefined then data.property.default = property.default

  propertyDef.property.size.push {"name": "min", "value": property.minLength} if property.minLength
  propertyDef.property.size.push {"name": "max", "value": property.maxLength} if property.maxLength

  switch property.type
    when 'array'
      itemsType = property.items.type if property.items
      propertyDef.property.classType = handleArray( keyRefData, itemsType, mapping, name)
    when 'object'
      objDef = handleObject(property, name, refMap, keyRefData, mapping )
      propertyDef.property.classType = objDef.classType
      propertyDef.innerClass = objDef.innerClass
    else
      if name isnt "relatedContent"
        propertyDef.property.classType = mapping[property.type] ? property.type

  switch propertyDef.property.classType
    when "BigDecimal"
      propertyDef.property.decimalMax = property.maximum
      propertyDef.property.decimalMin = property.minimum
    when "Long"
      propertyDef.property.max = property.maximum
      propertyDef.property.min = property.minimum

  propertyDef.property.kind = annotation + "(\"#{propertyDef.property.name}\")"
  propertyDef

handleRef = (property, refMap, name)->
  if property.items and property.items["$ref"]
    return resolveTypeByRef(property.items["$ref"], refMap, name, true)
  else if property["$ref"]
    return resolveTypeByRef(property["$ref"], refMap, name)

handlePatternProperties = (property, name, refMap, mapping, annotation) ->
  patternProperties = []
  for key of property.patternProperties
    patternProperty = {}
    patternProperty.regex = key
    #should a patternProperty have innerClass
    propertyMapped = util.mapProperty(property.patternProperties[key], name, annotation, mapping, refMap)
    patternProperty.property = propertyMapped.property
    patternProperties.push patternProperty
  patternProperties

handleArray = (keyRefData, itemsType, mapping, name) ->
  auxType = "List"

  if keyRefData and keyRefData.innnerSchema.items isnt undefined
    primitiveType = mapping[keyRefData.innnerSchema.items.type]
    #if property doesn't has title we use primitive types
    if keyRefData.innnerSchema.items.title
      auxType += "<#{(resolveClassType(keyRefData.innnerSchema.items, name))}>"

    else if primitiveType
      auxType += "<#{primitiveType}>"

  else
    primitiveType = mapping[itemsType]
    auxType += "<#{primitiveType}>" if primitiveType


  auxType

handleObject = (property, name, refMap, keyRefData, mapping ) ->
  property = _.clone(property, true)
  objectDesc = {}
  if property.properties
    objectDesc.classType = resolveClassType(property, name)
    innerClass = mapInnerClass(objectDesc.classType, property, refMap, mapping)
    objectDesc.innerClass = innerClass
    #If the schema doesn't have title it need a innerClass
  else if keyRefData and keyRefData.innnerSchema and not keyRefData.innnerSchema.title
    objectDesc.classType = resolveClassType(keyRefData.innnerSchema, name)
    objectDesc.innerClass = mapInnerClass(objectDesc.classType,{title: objectDesc.classType, properties:keyRefData.innnerSchema}, refMap, mapping)
  else if keyRefData and keyRefData.innnerSchema and  keyRefData.innnerSchema.properties
    objectDesc.classType = resolveClassType(keyRefData.innnerSchema, name)
  else
    objectDesc.classType = 'Map'
  objectDesc


resolveTypeByRef = (keyRef, refMap, propertyName, isArray = false) ->
  ref = {}
  innerSchema = Deref.util.findByRef(keyRef, refMap)
  if innerSchema
    if isArray
      ref.innnerSchema = {}
      ref.innnerSchema.items = innerSchema
    else
      ref.innnerSchema = innerSchema

  else if keyRef
    console.error "$ref not found: #{keyRef} RefMap.keys -> [#{Object.keys(refMap)}]"
    console.error JSON.stringify(refMap)

  ref


resolveClassType = (schema, propertyName) ->
  classType = ""
  if schema
    if schema.title
      type = pascalCase(schema.title)
    else
      type = pascalCase(propertyName)

  type

mapInnerClass = (name, property, refMap, mapping) ->
  innerClass = {}

  if property
    innerClass.className = pascalCase(name)
    innerClass.classDescription = property.description
    aux = util.mapProperties(property, refMap, mapping)
    innerClass.classMembers = aux.classMembers
    innerClass.innerClasses = aux.innerClasses
    innerClass.patternProperties = aux.patternProperties
  innerClass

module.exports = util
