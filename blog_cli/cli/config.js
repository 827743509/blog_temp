import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_PATH = join(homedir(), '.blog-cli', 'config.json');
const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:8080',
  token: null,
  user: null
};

export async function loadConfig() {
  try {
    const content = await readFile(CONFIG_PATH, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ...DEFAULT_CONFIG };
    }
    throw new Error(`读取配置失败：${error.message}`);
  }
}

export async function saveConfig(config) {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify({ ...DEFAULT_CONFIG, ...config }, null, 2)}\n`, 'utf8');
}

export async function clearConfig() {
  await rm(CONFIG_PATH, { force: true });
}

export function getConfigPath() {
  return CONFIG_PATH;
}
