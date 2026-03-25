migrate((app) => {
  try {
    const collection = new Collection({
      "id": "pbc_media_assets",
      "name": "media_assets",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "file_field",
          "name": "file",
          "type": "file",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "mimeTypes": [],
            "thumbs": [
              "100x100"
            ],
            "maxSelect": 1,
            "maxSize": 10485760,
            "protected": false
          }
        },
        {
          "system": false,
          "id": "title_field",
          "name": "title",
          "type": "text",
          "required": false,
          "presentable": true,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        }
      ],
      "indexes": [],
      "listRule": "",
      "viewRule": "",
      "createRule": "",
      "updateRule": "",
      "deleteRule": "",
      "options": {}
    });

    return app.save(collection);
  } catch (err) {
    // Already exists
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("media_assets");
  return app.delete(collection);
})
