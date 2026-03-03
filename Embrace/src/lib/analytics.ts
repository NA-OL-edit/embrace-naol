/**
 * Generic Analytics wrapper.
 * This can be connected to Google Analytics, Mixpanel, Plausible, etc.
 */

export const analytics = {
    trackEvent: (eventName: string, properties?: Record<string, unknown>) => {
        // TODO: Connect to real analytics provider
        if (import.meta.env.DEV) {
            console.log(`[Analytics] Event: ${eventName}`, properties);
        }
    },

    trackPageView: (path: string) => {
        // TODO: Connect to real analytics provider
        if (import.meta.env.DEV) {
            console.log(`[Analytics] Page View: ${path}`);
        }
    },

    identifyUser: (userId: string, traits?: Record<string, unknown>) => {
        // TODO: Connect to real analytics provider
        if (import.meta.env.DEV) {
            console.log(`[Analytics] Identify: ${userId}`, traits);
        }
    }
};
