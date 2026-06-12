import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { saveConfig } from './config.js';

const DEFAULT_FRONT_URL = 'http://127.0.0.1:5173';
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export async function loginWithBrowser(options = {}) {
  const state = randomBytes(24).toString('hex');
  const server = createCallbackServer(state, options);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const callbackUrl = `http://127.0.0.1:${address.port}/callback`;
  const loginUrl = buildLoginUrl(options.frontUrl || DEFAULT_FRONT_URL, callbackUrl, state, options.baseUrl);

  const resultPromise = waitForCallback(server, CALLBACK_TIMEOUT_MS);
  await openBrowser(loginUrl);

  console.log(`已打开浏览器：${loginUrl}`);
  console.log('请在浏览器中完成登录，CLI 会自动保存 token。');

  const auth = await resultPromise;
  await saveConfig({
    baseUrl: options.baseUrl,
    token: auth.token,
    user: {
      id: auth.userId,
      username: auth.username,
      nickname: auth.nickname
    }
  });

  return auth;
}

function createCallbackServer(expectedState) {
  const server = createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method !== 'POST' || request.url !== '/callback') {
      response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ success: false, message: 'Not Found' }));
      return;
    }

    try {
      const body = await readJsonBody(request);
      if (body.state !== expectedState) {
        throw new Error('登录回调校验失败');
      }
      if (!body.token || !body.username || !body.userId) {
        throw new Error('登录回调缺少 token 或用户信息');
      }

      server.emit('cli-login', body);
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ success: true, message: 'CLI 登录成功，可以关闭此页面' }));
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ success: false, message: error.message }));
    }
  });

  return server;
}

function waitForCallback(server, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('等待浏览器登录超时'));
    }, timeoutMs);

    server.once('cli-login', (auth) => {
      clearTimeout(timeout);
      server.close();
      resolve(auth);
    });

    server.once('error', (error) => {
      clearTimeout(timeout);
      server.close();
      reject(error);
    });
  });
}

function buildLoginUrl(frontUrl, callbackUrl, state, baseUrl) {
  const url = new URL(frontUrl);
  url.searchParams.set('cliCallback', callbackUrl);
  url.searchParams.set('state', state);
  if (baseUrl) {
    url.searchParams.set('baseUrl', baseUrl);
  }
  return url.toString();
}

async function openBrowser(url) {
  const command = browserCommand(url);
  await new Promise((resolve, reject) => {
    execFile(command.file, command.args, { windowsHide: true }, (error) => {
      if (error) {
        reject(new Error(`打开浏览器失败：${error.message}`));
        return;
      }
      resolve();
    });
  });
}

function browserCommand(url) {
  if (process.platform === 'win32') {
    return { file: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] };
  }
  if (process.platform === 'darwin') {
    return { file: 'open', args: [url] };
  }
  return { file: 'xdg-open', args: [url] };
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error('登录回调数据过大'));
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('登录回调不是有效 JSON'));
      }
    });
    request.on('error', reject);
  });
}
