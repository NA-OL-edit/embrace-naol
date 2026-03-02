import { useEffect, useState } from "react";
import { FadeUp } from "@/components/AnimationWrappers";
import { bulkUpsertMedia, listMedia, type MediaBatchUpsertInput } from "@/lib/media";

const EXAMPLE_PAYLOAD = `[
  {
    "title": "Heritage Ring",
    "category": "Custom",
    "description": "Bespoke ring with baguette diamonds",
    "alt": "Close-up of heritage ring",
    "tags": ["ring", "custom", "diamond"],
    "sortOrder": 10,
    "variants": {
      "thumb": "https://cdn.example.com/media/ring-thumb.webp",
      "medium": "https://cdn.example.com/media/ring-medium.webp",
      "large": "https://cdn.example.com/media/ring-large.webp"
    }
  }
]`;

export default function Admin() {
  const [adminToken, setAdminToken] = useState("");
  const [payloadText, setPayloadText] = useState(EXAMPLE_PAYLOAD);
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadCatalogCount = async () => {
      try {
        const response = await listMedia({ limit: 1 });
        setCatalogCount(response.stats.total);
      } catch {
        setCatalogCount(null);
      }
    };

    void loadCatalogCount();
  }, []);

  const handleBulkUpsert = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage("");

    if (!adminToken.trim()) {
      setStatusMessage("Provide MEDIA_ADMIN_TOKEN to upload.");
      return;
    }

    let images: MediaBatchUpsertInput[];
    try {
      const parsed = JSON.parse(payloadText);
      if (!Array.isArray(parsed)) {
        setStatusMessage("Payload must be a JSON array of image entries.");
        return;
      }
      images = parsed as MediaBatchUpsertInput[];
    } catch {
      setStatusMessage("Payload JSON is invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await bulkUpsertMedia(images, adminToken.trim());
      setStatusMessage(`Upload complete: ${response.created} created, ${response.updated} updated. Total: ${response.total}.`);
      setCatalogCount(response.total);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pt-20">
      <section className="section-padding relative overflow-hidden min-h-screen">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Admin</p>
            <h1 className="luxury-heading mt-4 text-foreground">
              Media <span className="text-gold-gradient">Ingestion</span>
            </h1>
            <p className="luxury-body mt-6 text-muted-foreground max-w-3xl">
              Use this endpoint-backed tool for bulk metadata ingest after images are uploaded to your CDN/storage.
              Current catalog size: {catalogCount ?? "unknown"}.
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <form onSubmit={handleBulkUpsert} className="mt-10 space-y-6">
              <div>
                <label className="mb-2 block font-body text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
                  Admin Token
                </label>
                <input
                  type="password"
                  value={adminToken}
                  onChange={(event) => setAdminToken(event.target.value)}
                  className="w-full border border-border bg-background px-4 py-3 font-body text-sm font-light text-foreground outline-none transition-colors focus:border-primary"
                  placeholder="MEDIA_ADMIN_TOKEN"
                />
              </div>

              <div>
                <label className="mb-2 block font-body text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
                  Bulk Payload (JSON Array)
                </label>
                <textarea
                  value={payloadText}
                  onChange={(event) => setPayloadText(event.target.value)}
                  rows={16}
                  className="w-full resize-y border border-border bg-background px-4 py-3 font-mono text-xs text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 min-h-[44px] items-center justify-center border border-primary bg-primary px-6 py-3 font-body text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-all duration-300 hover:shadow-gold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Uploading..." : "Bulk Upsert Media"}
              </button>

              {statusMessage && (
                <p className="font-body text-sm text-muted-foreground" role="status">
                  {statusMessage}
                </p>
              )}
            </form>
          </FadeUp>
        </div>
      </section>
    </main>
  );
}

