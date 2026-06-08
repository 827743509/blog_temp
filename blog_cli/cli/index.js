#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Command, InvalidArgumentError } from 'commander';
import { request, ApiError } from './api.js';
import { clearConfig, getConfigPath, loadConfig, saveConfig } from './config.js';

const program = new Command();

program
  .name('blog-cli')
  .description('简单博客系统 CLI 客户端')
  .version('1.0.0')
  .option('--base-url <url>', '临时指定后端服务地址');

program
  .command('login')
  .description('登录并保存 JWT')
  .requiredOption('-u, --username <username>', '用户名')
  .requiredOption('-p, --password <password>', '密码')
  .action(run(async (options) => {
    const globalOptions = program.opts();
    const response = await request('/api/auth/login', {
      method: 'POST',
      auth: false,
      baseUrl: globalOptions.baseUrl,
      body: {
        username: options.username,
        password: options.password
      }
    });
    const config = await loadConfig();
    await saveConfig({
      ...config,
      baseUrl: globalOptions.baseUrl || config.baseUrl,
      token: response.data.token,
      user: {
        id: response.data.userId,
        username: response.data.username,
        nickname: response.data.nickname
      }
    });
    console.log(`登录成功：${response.data.nickname || response.data.username}`);
    console.log(`配置文件：${getConfigPath()}`);
  }));

program
  .command('logout')
  .description('清除本地登录态')
  .action(run(async () => {
    await clearConfig();
    console.log('已退出登录');
  }));

program
  .command('me')
  .description('查看当前登录用户')
  .action(run(async () => {
    const response = await request('/api/auth/me', { baseUrl: program.opts().baseUrl });
    console.log(formatJson(response.data));
  }));

const configCommand = program.command('config').description('管理 CLI 配置');

configCommand
  .command('set-base-url')
  .description('持久设置后端服务地址')
  .argument('<url>', '后端服务地址，例如 http://localhost:8080')
  .action(run(async (url) => {
    const config = await loadConfig();
    await saveConfig({ ...config, baseUrl: url });
    console.log(`后端服务地址已设置为：${url}`);
  }));

configCommand
  .command('show')
  .description('查看当前 CLI 配置')
  .action(run(async () => {
    const config = await loadConfig();
    console.log(formatJson({
      ...config,
      token: config.token ? '<已保存>' : null
    }));
  }));

const postCommand = program.command('post').description('管理博客文章');

postCommand
  .command('list')
  .description('查看公开文章列表')
  .action(run(async () => {
    const response = await request('/api/posts', { auth: false, baseUrl: program.opts().baseUrl });
    printPosts(response.data);
  }));

postCommand
  .command('mine')
  .description('查看我的文章')
  .action(run(async () => {
    const response = await request('/api/posts/mine', { baseUrl: program.opts().baseUrl });
    printPosts(response.data);
  }));

postCommand
  .command('create')
  .description('新增博客')
  .requiredOption('-t, --title <title>', '标题')
  .option('-c, --content <content>', '正文')
  .option('-f, --content-file <path>', '从文件读取正文')
  .option('-s, --summary <summary>', '摘要')
  .option('--status <status>', '状态：0 草稿，1 发布', parseStatus)
  .option('--tags <tags>', '标签，使用英文逗号分隔')
  .action(run(async (options) => {
    const payload = await buildPostPayload(options);
    const response = await request('/api/posts', {
      method: 'POST',
      baseUrl: program.opts().baseUrl,
      body: payload
    });
    console.log('新增博客成功');
    printPost(response.data);
  }));

postCommand
  .command('update')
  .description('修改博客')
  .argument('<id>', '博客 ID', parsePositiveInteger)
  .requiredOption('-t, --title <title>', '标题')
  .option('-c, --content <content>', '正文')
  .option('-f, --content-file <path>', '从文件读取正文')
  .option('-s, --summary <summary>', '摘要')
  .option('--status <status>', '状态：0 草稿，1 发布', parseStatus)
  .option('--tags <tags>', '标签，使用英文逗号分隔')
  .action(run(async (id, options) => {
    const payload = await buildPostPayload(options);
    const response = await request(`/api/posts/${id}`, {
      method: 'PUT',
      baseUrl: program.opts().baseUrl,
      body: payload
    });
    console.log('修改博客成功');
    printPost(response.data);
  }));

postCommand
  .command('delete')
  .description('删除博客')
  .argument('<id>', '博客 ID', parsePositiveInteger)
  .option('-y, --yes', '跳过删除确认')
  .action(run(async (id, options) => {
    if (!options.yes) {
      const confirmed = await confirm(`确认删除博客 ${id}？输入 yes 继续：`);
      if (!confirmed) {
        console.log('已取消删除');
        return;
      }
    }
    await request(`/api/posts/${id}`, {
      method: 'DELETE',
      baseUrl: program.opts().baseUrl
    });
    console.log(`删除博客成功：${id}`);
  }));

program.parseAsync();

function run(action) {
  return async (...args) => {
    try {
      await action(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`错误：${error.message}`);
      } else {
        console.error(`错误：${error.message}`);
      }
      process.exitCode = 1;
    }
  };
}

async function buildPostPayload(options) {
  const content = await readContent(options);
  const payload = {
    title: options.title,
    content
  };

  if (options.summary !== undefined) {
    payload.summary = options.summary;
  }
  if (options.status !== undefined) {
    payload.status = options.status;
  }
  if (options.tags !== undefined) {
    payload.tags = parseTags(options.tags);
  }

  return payload;
}

async function readContent(options) {
  if (options.content && options.contentFile) {
    throw new Error('--content 和 --content-file 只能二选一');
  }
  if (options.contentFile) {
    return readFile(resolve(options.contentFile), 'utf8');
  }
  if (options.content) {
    return options.content;
  }
  throw new Error('请通过 --content 或 --content-file 提供正文');
}

function parseTags(tags) {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseStatus(value) {
  const status = Number(value);
  if (!Number.isInteger(status) || (status !== 0 && status !== 1)) {
    throw new InvalidArgumentError('状态只能是 0 或 1');
  }
  return status;
}

function parsePositiveInteger(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new InvalidArgumentError('ID 必须是正整数');
  }
  return id;
}

async function confirm(question) {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${question} `);
    return answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

function printPosts(posts) {
  if (!posts?.length) {
    console.log('暂无文章');
    return;
  }
  for (const post of posts) {
    printPost(post);
    console.log('');
  }
}

function printPost(post) {
  console.log(`ID：${post.id}`);
  console.log(`标题：${post.title}`);
  console.log(`状态：${formatStatus(post.status)}`);
  if (post.summary) {
    console.log(`摘要：${post.summary}`);
  }
  if (post.authorName) {
    console.log(`作者：${post.authorName}`);
  }
  if (post.tags?.length) {
    console.log(`标签：${post.tags.join(', ')}`);
  }
  if (post.createdAt) {
    console.log(`创建时间：${post.createdAt}`);
  }
  if (post.updatedAt) {
    console.log(`更新时间：${post.updatedAt}`);
  }
}

function formatStatus(status) {
  if (status === 0) {
    return '草稿';
  }
  if (status === 1) {
    return '发布';
  }
  return String(status);
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}
