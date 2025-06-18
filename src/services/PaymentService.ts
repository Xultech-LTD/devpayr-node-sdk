// src/services/PaymentService.ts

import { Config } from '../core/Config';
import { HttpClient } from '../utils/HttpClient';
import { DevPayrException } from '../support/Exceptions';

export class PaymentService {
    private config: Config;
    private http: HttpClient;

    constructor(config: Config) {
        this.config = config;
        this.http = new HttpClient(config);
    }

    /**
     * Check payment status using API key with a specific project ID.
     */
    public async checkWithApiKey(projectId: string | number, queryParams: Record<string, any> = {}): Promise<any> {
        if (!projectId) {
            throw new DevPayrException('Project ID is required for API key validation.');
        }

        const url = `project/${projectId}/has-paid`;
        return this.http.get(url, queryParams);
    }

    /**
     * Check payment status using a license key (no project ID needed).
     */
    public async checkWithLicenseKey(queryParams: Record<string, any> = {}): Promise<any> {
        const url = 'project/has-paid';
        return this.http.post(url, queryParams);
    }
}
