<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  apiRequest,
  clearSession,
  getBaseUrl,
  getToken,
  getStoredUser,
  saveSession,
  setBaseUrl
} from './api.js';

const activeTab = ref('public');
const loading = ref(false);
const message = ref('');
const error = ref('');
const posts = ref([]);
const minePosts = ref([]);
const selectedPost = ref(null);
const user = ref(getStoredUser());
const baseUrlInput = ref(getBaseUrl());
const cliLogin = getCliLoginParams();

const authMode = ref('login');
const authForm = reactive({
  username: '',
  password: '',
  nickname: ''
});

const postForm = reactive({
  id: null,
  title: '',
  summary: '',
  content: '',
  status: 1,
  tagsText: ''
});

const isLoggedIn = computed(() => Boolean(user.value));
const isEditing = computed(() => Boolean(postForm.id));
const visiblePosts = computed(() => activeTab.value === 'mine' ? minePosts.value : posts.value);

onMounted(async () => {
  if (cliLogin.baseUrl) {
    baseUrlInput.value = cliLogin.baseUrl;
    setBaseUrl(cliLogin.baseUrl);
  }
  if (cliLogin.callback && isLoggedIn.value) {
    try {
      await notifyCliLogin(getStoredAuthForCli());
    } catch (err) {
      error.value = err.message;
    }
    return;
  }
  await loadPublicPosts();
  if (isLoggedIn.value) {
    await loadMinePosts(false);
  }
});

async function withLoading(task) {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    await task();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function loadPublicPosts() {
  await withLoading(async () => {
    posts.value = await apiRequest('/api/posts', { auth: false });
  });
}

async function loadMinePosts(showTab = true) {
  if (!isLoggedIn.value) {
    error.value = '请先登录后查看我的文章';
    return;
  }
  await withLoading(async () => {
    minePosts.value = await apiRequest('/api/posts/mine');
    if (showTab) {
      activeTab.value = 'mine';
    }
  });
}

async function submitAuth() {
  await withLoading(async () => {
    const path = authMode.value === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = {
      username: authForm.username,
      password: authForm.password
    };
    if (authMode.value === 'register') {
      body.nickname = authForm.nickname;
    }
    const auth = await apiRequest(path, { method: 'POST', auth: false, body });
    saveSession(auth);
    user.value = getStoredUser();
    const successMessage = authMode.value === 'login' ? '登录成功' : '注册成功，已自动登录';
    authForm.password = '';
    await loadMinePosts(false);
    if (cliLogin.callback) {
      await notifyCliLogin(auth);
    } else {
      message.value = successMessage;
    }
  });
}

function logout() {
  clearSession();
  user.value = null;
  minePosts.value = [];
  activeTab.value = 'public';
  resetPostForm();
  message.value = '已退出登录';
}

function saveBaseUrl() {
  setBaseUrl(baseUrlInput.value);
  message.value = '后端地址已保存';
}

async function submitPost() {
  if (!isLoggedIn.value) {
    error.value = '请先登录后再保存文章';
    return;
  }
  await withLoading(async () => {
    const payload = {
      title: postForm.title,
      content: postForm.content,
      summary: postForm.summary || null,
      status: Number(postForm.status),
      tags: parseTags(postForm.tagsText)
    };
    if (isEditing.value) {
      await apiRequest(`/api/posts/${postForm.id}`, { method: 'PUT', body: payload });
      message.value = '文章已更新';
    } else {
      await apiRequest('/api/posts', { method: 'POST', body: payload });
      message.value = '文章已创建';
    }
    resetPostForm();
    await loadPublicPosts();
    await loadMinePosts(false);
    activeTab.value = 'mine';
  });
}

function editPost(post) {
  postForm.id = post.id;
  postForm.title = post.title || '';
  postForm.summary = post.summary || '';
  postForm.content = post.content || '';
  postForm.status = post.status ?? 1;
  postForm.tagsText = (post.tags || []).join(', ');
  selectedPost.value = post;
}

async function deletePost(post) {
  if (!confirm(`确认删除《${post.title}》？`)) {
    return;
  }
  await withLoading(async () => {
    await apiRequest(`/api/posts/${post.id}`, { method: 'DELETE' });
    message.value = '文章已删除';
    if (postForm.id === post.id) {
      resetPostForm();
    }
    await loadPublicPosts();
    await loadMinePosts(false);
  });
}

function resetPostForm() {
  postForm.id = null;
  postForm.title = '';
  postForm.summary = '';
  postForm.content = '';
  postForm.status = 1;
  postForm.tagsText = '';
}

function parseTags(value) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function statusText(status) {
  return status === 0 ? '草稿' : '发布';
}

function getCliLoginParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    callback: params.get('cliCallback'),
    state: params.get('state'),
    baseUrl: params.get('baseUrl')
  };
}

function getStoredAuthForCli() {
  const storedUser = getStoredUser();
  return {
    token: getToken(),
    userId: storedUser?.id,
    username: storedUser?.username,
    nickname: storedUser?.nickname
  };
}

async function notifyCliLogin(auth) {
  if (!cliLogin.callback || !cliLogin.state) {
    return;
  }
  if (!auth?.token || !auth?.userId || !auth?.username) {
    throw new Error('当前登录信息不完整，请重新登录');
  }
  const response = await fetch(cliLogin.callback, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: auth.token,
      userId: auth.userId,
      username: auth.username,
      nickname: auth.nickname,
      state: cliLogin.state
    })
  });
  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'CLI 登录回传失败');
  }
  message.value = 'CLI 登录成功，可以关闭此页面';
}
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Blog Console</p>
        <h1>博客管理</h1>
      </div>
      <div class="session">
        <template v-if="isLoggedIn">
          <span>{{ user.nickname || user.username }}</span>
          <button class="ghost" type="button" @click="logout">退出</button>
        </template>
        <span v-else>未登录</span>
      </div>
    </header>

    <section class="toolbar">
      <label>
        后端地址
        <input v-model="baseUrlInput" type="url" placeholder="http://localhost:8080" />
      </label>
      <button type="button" @click="saveBaseUrl">保存</button>
      <button class="ghost" type="button" @click="loadPublicPosts">刷新公开文章</button>
    </section>

    <p v-if="message" class="notice success">{{ message }}</p>
    <p v-if="error" class="notice error">{{ error }}</p>
    <p v-if="cliLogin.callback" class="notice info">正在为 CLI 登录，请在此页面完成账号登录。</p>

    <div class="workspace">
      <section class="panel auth-panel">
        <div class="panel-head">
          <h2>账号</h2>
          <div class="segmented">
            <button :class="{ active: authMode === 'login' }" type="button" @click="authMode = 'login'">登录</button>
            <button :class="{ active: authMode === 'register' }" type="button" @click="authMode = 'register'">注册</button>
          </div>
        </div>
        <form class="form" @submit.prevent="submitAuth">
          <label>
            用户名
            <input v-model.trim="authForm.username" required autocomplete="username" />
          </label>
          <label>
            密码
            <input v-model="authForm.password" required type="password" autocomplete="current-password" />
          </label>
          <label v-if="authMode === 'register'">
            昵称
            <input v-model.trim="authForm.nickname" required />
          </label>
          <button type="submit" :disabled="loading">{{ authMode === 'login' ? '登录' : '注册' }}</button>
        </form>
      </section>

      <section class="panel editor-panel">
        <div class="panel-head">
          <h2>{{ isEditing ? '修改博客' : '新增博客' }}</h2>
          <button v-if="isEditing" class="ghost" type="button" @click="resetPostForm">新建</button>
        </div>
        <form class="form" @submit.prevent="submitPost">
          <div class="field-row">
            <label>
              标题
              <input v-model.trim="postForm.title" required maxlength="120" />
            </label>
            <label>
              状态
              <select v-model.number="postForm.status">
                <option :value="1">发布</option>
                <option :value="0">草稿</option>
              </select>
            </label>
          </div>
          <label>
            摘要
            <input v-model.trim="postForm.summary" maxlength="240" />
          </label>
          <label>
            标签
            <input v-model.trim="postForm.tagsText" placeholder="Java, Spring Boot" />
          </label>
          <label>
            正文
            <textarea v-model.trim="postForm.content" required rows="10"></textarea>
          </label>
          <button type="submit" :disabled="loading">{{ isEditing ? '保存修改' : '发布文章' }}</button>
        </form>
      </section>
    </div>

    <section class="posts-section">
      <div class="tabs">
        <button :class="{ active: activeTab === 'public' }" type="button" @click="activeTab = 'public'">公开文章</button>
        <button :class="{ active: activeTab === 'mine' }" type="button" @click="loadMinePosts()">我的文章</button>
      </div>

      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="!visiblePosts.length" class="empty">暂无文章</div>
      <div v-else class="post-grid">
        <article v-for="post in visiblePosts" :key="post.id" class="post-card">
          <div class="post-meta">
            <span>{{ statusText(post.status) }}</span>
            <span v-if="post.authorName">{{ post.authorName }}</span>
          </div>
          <h3>{{ post.title }}</h3>
          <p>{{ post.summary || post.content }}</p>
          <div v-if="post.tags?.length" class="tags">
            <span v-for="tag in post.tags" :key="tag">{{ tag }}</span>
          </div>
          <div v-if="activeTab === 'mine'" class="post-actions">
            <button class="ghost" type="button" @click="editPost(post)">编辑</button>
            <button class="danger" type="button" @click="deletePost(post)">删除</button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
