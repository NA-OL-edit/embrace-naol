/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4092854851");
  
  collection.fields.add(new Field({
    "hidden": false,
    "id": "text_add_name",
    "name": "name",
    "type": "text"
  }));
  collection.fields.add(new Field({
    "hidden": false,
    "id": "text_add_shape",
    "name": "shape",
    "type": "text"
  }));
  collection.fields.add(new Field({
    "hidden": false,
    "id": "text_add_color",
    "name": "color",
    "type": "text"
  }));
  collection.fields.add(new Field({
    "hidden": false,
    "id": "text_add_clarity",
    "name": "clarity",
    "type": "text"
  }));
  collection.fields.add(new Field({
    "hidden": false,
    "id": "text_add_carat",
    "name": "carat",
    "type": "text"
  }));
  
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4092854851");
  
  collection.fields.removeByName("name");
  collection.fields.removeByName("shape");
  collection.fields.removeByName("color");
  collection.fields.removeByName("clarity");
  collection.fields.removeByName("carat");
  
  return app.save(collection);
})
