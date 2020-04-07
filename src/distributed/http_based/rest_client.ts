import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export interface IApiClient {
    get(path: string, params?: any): Promise<any>;
    post(path: string, params: any): Promise<any>;
    put(path: string, params: any): Promise<any>;
    delete(path: string, params: any): Promise<any>;
}

export type RestConfig = AxiosRequestConfig;
export type RestClientInstance = AxiosInstance;
export type RestCreateFunction = (config?: AxiosRequestConfig) => AxiosInstance;

/** Factory function for REST client. Uses the Axios library internally.
 * This way we expose Axios interfaces but leave the implementation open to mocking.
 */
export function create(config: RestConfig): RestClientInstance {
    if (config) {
        config.maxContentLength = Infinity;
        config["Cache-Control"] = "no-cache";
    }
    return axios.create(config);
}
