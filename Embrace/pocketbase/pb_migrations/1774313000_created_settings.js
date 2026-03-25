migrate((app) => {
  try {
    const collection = new Collection({
      "id": "pbc_settings",
      "name": "settings",
      "type": "base",
      "system": false,
      "schema": [
        { "name": "site_name", "type": "text" },
        { "name": "domain", "type": "text" },
        { "name": "email_on_upload", "type": "bool" },
        { "name": "weekly_summary", "type": "bool" },
        { "name": "failed_login_alerts", "type": "bool" }
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": "",
      "updateRule": "",
      "deleteRule": ""
    });

    app.save(collection);

    // Create default record if none exists
    try {
      const record = new Record(collection);
      record.set("id", "site_config_id");
      record.set("site_name", "Embrace Refreshing");
      record.set("domain", "embracerefreshingandcast");
      record.set("email_on_upload", true);
      record.set("weekly_summary", false);
      record.set("failed_login_alerts", true);
      app.save(record);
    } catch(e) {}

  } catch (err) {
    // Collection already exists
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings");
  return app.delete(collection);
})
