migrate((app) => {
  const collection = new Collection({
    "id": "pbc_categories01",
    "name": "categories",
    "type": "base",
    "system": false,
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\"",
    "fields": [
      {
        "name": "id",
        "type": "text",
        "required": true,
        "primaryKey": true,
        "system": true
      },
      {
        "name": "name",
        "type": "text",
        "required": true,
        "system": false
      },
      {
        "name": "type",
        "type": "select",
        "system": false,
        "required": true,
        "values": ["Diamond", "Metal cert", "Album"]
      },
      {
        "name": "status",
        "type": "select",
        "system": false,
        "required": true,
        "values": ["Active", "Draft"]
      },
      {
        "name": "image",
        "type": "file",
        "system": false,
        "maxSelect": 1,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp"]
      }
    ]
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_categories01");
  return app.delete(collection);
})
