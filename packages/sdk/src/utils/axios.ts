import axios from "axios";

import { DEFAULT_TIMEOUT } from "../constants";

export const getHttpClient = (baseURL: string, timeout?: number): any => {
    return axios.create({
        baseURL,
        headers: { "Content-Type": "application/json" },
        timeout: timeout || DEFAULT_TIMEOUT, // 5 seconds
    });
};
