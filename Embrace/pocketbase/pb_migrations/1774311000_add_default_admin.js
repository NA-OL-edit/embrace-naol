migrate((app) => {
    try {
        // v0.36.7 migration syntax for superusers
        const su = new Superuser();
        su.email = "admin@embracerefreshing.com";
        su.setPassword("admin123456");
        return app.save(su);
    } catch (err) {
      console.log("Superuser creation skipped: account may already exist or syntax mismatch.", err);
    }
}, (app) => {
    try {
        const su = app.findAdminByEmail("admin@embracerefreshing.com");
        if (su) return app.delete(su);
    } catch (err) {
      // Ignored
    }
})
