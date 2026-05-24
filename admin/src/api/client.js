import axios from 'axios';
import { message } from 'antd';
const TOKEN_KEY = 'shangchaun_admin_token';
export function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t) {
    localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}
export const client = axios.create({
    baseURL: '/',
    timeout: 30000,
});
client.interceptors.request.use((config) => {
    const t = getToken();
    if (t) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
});
client.interceptors.response.use((resp) => {
    const data = resp.data;
    if (data && typeof data === 'object' && 'code' in data) {
        if (data.code !== 0) {
            message.error(data.message || '请求失败');
            return Promise.reject(data);
        }
    }
    return resp;
}, (err) => {
    const status = err?.response?.status;
    if (status === 401) {
        clearToken();
        message.error('登录已过期，请重新登录');
        if (location.hash !== '#/login') {
            location.hash = '#/login';
        }
    }
    else {
        message.error(err?.response?.data?.message || err.message || '网络错误');
    }
    return Promise.reject(err);
});
