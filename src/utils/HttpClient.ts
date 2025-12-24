// src/utils/HttpClient.ts

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Config } from '../core/Config';
import { DevPayrException, HttpRequestException } from '../support/Exceptions';

export class HttpClient {
    private client: AxiosInstance;
    private config: Config;

    constructor(config: Config) {
        this.config = config;

        this.client = axios.create({
            baseURL: this.config.get('base_url'),
            timeout: this.config.get('timeout', 1000),
        });
    }

    /**
     * Core request dispatcher.
     */
    public async request(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        uri: string,
        options: AxiosRequestConfig = {}
    ): Promise<any> {
        const userHeaders = (options.headers ?? {}) as Record<string, string>;

        // Start with defaults, then user headers, then enforced headers (auth/domain) last.
        const headers: Record<string, string> = {
            Accept: 'application/json',
            ...userHeaders,
        };

        // Ensure Content-Type when sending a body unless user explicitly set it.
        if (
            ['POST', 'PUT', 'PATCH'].includes(method) &&
            !('Content-Type' in headers) &&
            !(options.data instanceof FormData)
        ) {
            headers['Content-Type'] = 'application/json';
        }

        // Always send domain header
        // Config guarantees domain exists (hostname or fingerprint)
        const domain = this.config.get<string>('domain');
        if (domain) {
            headers['X-Devpayr-Domain'] = domain;
        }

        // Inject authentication headers (these should win over user headers)
        if (this.config.isApiKeyMode()) {
            headers['X-API-KEY'] = this.config.get('api_key');
        }

        if (this.config.isLicenseMode()) {
            headers['X-LICENSE-KEY'] = this.config.get('license');
        }

        // Append global query params
        const query: Record<string, any> = {
            ...(options.params ?? {}),
        };

        if (this.config.get('injectables')) {
            query['include'] = 'injectables';
        }

        if (this.config.get('action')) {
            query['action'] = this.config.get('action');
        }

        if (this.config.get('per_page')) {
            query['per_page'] = this.config.get('per_page');
        }

        try {
            const response = await this.client.request({
                ...options,
                method,
                url: uri,
                headers,
                params: query,
            });

            if (response.status >= 400 || typeof response.data !== 'object') {
                throw new HttpRequestException(
                    (response.data as any)?.message ?? 'API Error',
                    response.status,
                    response.data ?? { raw: response.data }
                );
            }

            return response.data;
        } catch (error: any) {
            const res = error.response;
            const status = res?.status ?? 500;
            const data = res?.data ?? { raw: res?.data };

            if (res?.data?.message) {
                throw new HttpRequestException(res.data.message, status, data);
            }

            throw new DevPayrException(`Request failed [${error.code}]: ${error.message}`);
        }
    }

    public get(uri: string, query: Record<string, any> = {}, extra: AxiosRequestConfig = {}): Promise<any> {
        return this.request('GET', uri, { ...extra, params: query });
    }

    public post(uri: string, data: Record<string, any> = {}, extra: AxiosRequestConfig = {}): Promise<any> {
        return this.request('POST', uri, { ...extra, data });
    }

    public put(uri: string, data: Record<string, any> = {}, extra: AxiosRequestConfig = {}): Promise<any> {
        return this.request('PUT', uri, { ...extra, data });
    }

    public patch(uri: string, data: Record<string, any> = {}, extra: AxiosRequestConfig = {}): Promise<any> {
        return this.request('PATCH', uri, { ...extra, data });
    }

    public delete(uri: string, query: Record<string, any> = {}, extra: AxiosRequestConfig = {}): Promise<any> {
        return this.request('DELETE', uri, { ...extra, params: query });
    }
}
