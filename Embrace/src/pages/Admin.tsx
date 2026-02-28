import { FadeUp } from "@/components/AnimationWrappers";

export default function Admin() {
    return (
        <main className="pt-20">
            <section className="section-padding relative overflow-hidden min-h-screen">
                <div className="mx-auto max-w-7xl">
                    <FadeUp>
                        <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">System Placeholder</p>
                        <h1 className="luxury-heading mt-4 text-foreground">
                            Admin <span className="text-gold-gradient">Dashboard</span>
                        </h1>
                        <p className="luxury-body mt-6 text-muted-foreground max-w-2xl">
                            This route is prepared for the upcoming admin dashboard.
                            Authentication and protected routing scaffolding should be added here.
                        </p>
                    </FadeUp>
                </div>
            </section>
        </main>
    );
}
