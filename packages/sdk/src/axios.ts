import axios from "axios";

export const getHttpClient = (baseURL: string): any => {
    return axios.create({
        baseURL,
        headers: { "Content-Type": "application/json" },
    });
};
