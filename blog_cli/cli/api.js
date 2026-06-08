import { loadConfig } from './config.js';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function request(path, options = {}) {
  const config = await loadConfig();
  const baseUrl = normalizeBaseUrl(options.baseUrl || config.baseUrl);
  const headers = {
    Accept: 'application/json',
    ...options.headers
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    if (!config.token) {
      throw new Error('请先执行 blog-cli login 登录');
    }
    headers.Authorization = `Bearer ${config.token}`;
  }

  let response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    throw new Error(`请求后端失败：${error.message}`);
  }

  const body = await parseJson(response);
  if (!response.ok || body?.success === false) {
    throw new ApiError(body?.message || `请求失败，HTTP ${response.status}`, response.status, body);
  }

  return body;
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(`后端返回了非 JSON 响应：${text.slice(0, 200)}`, response.status, text);
  }
}
