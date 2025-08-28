import logger from '../../infrastructure/Logger.js';

export interface IMacVendorResolver {
    resolve(macAddress: string): Promise<string>;
}

export class MacVendorAdapter implements IMacVendorResolver {
    private readonly baseUrl = 'https://api.macvendors.com/';
    private cache = new Map<string, string>();

    public async resolve(macAddress: string): Promise<string> {
        const oui = macAddress.replace(/[:.-]/g, '').substring(0, 6).toUpperCase();

        if (this.cache.has(oui)) {
            return this.cache.get(oui) as string;
        }

        try {
            const response = await fetch(`${this.baseUrl}${macAddress}`);

            if (response.status === 200) {
                const vendor = await response.text();
                this.cache.set(oui, vendor);
                return vendor;
            }

            if (response.status === 404) {
                const vendor = 'Unknown Vendor';
                this.cache.set(oui, vendor);
                return vendor;
            }

            const errorText = `API Error: ${response.statusText}`;
            this.cache.set(oui, errorText);
            return errorText;

        } catch (error: any) {
            // THIS IS THE CORRECTED PART
            // We will log the specific 'cause' of the fetch failure for better debugging.
            logger.error(`MAC Vendor API fetch failed for ${macAddress}. Reason: ${error.cause?.code || error.message}`);
            const errorMessage = 'Resolution Failed';
            this.cache.set(oui, errorMessage);
            return errorMessage;
        }
    }
}