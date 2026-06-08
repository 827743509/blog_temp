# 简单博客系统

这是一个基于 Spring Boot、MyBatis、MySQL 的简单博客后端，支持用户注册、登录、JWT 鉴权，以及文章的创建、查询、修改、删除。

## 技术栈

- Java 17
- Spring Boot 3.3.6
- Spring Security
- MyBatis
- MySQL
- JWT

## 启动前准备

1. 创建数据库和表：

```sql
source sql/schema.sql;
```

也可以直接复制 `sql/schema.sql` 中的 SQL 到 MySQL 客户端执行。

2. 修改数据库连接：

编辑 `src/main/resources/application.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/blog_temp?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false
    username: root
    password: root
```

3. 设置 JWT 密钥：

开发环境可以使用默认值。生产环境建议通过环境变量设置：

```powershell
$env:JWT_SECRET="请替换为至少32字节的随机密钥"
```

## 启动项目

```bash
mvn spring-boot:run
```

默认服务地址：

```text
http://localhost:8080
```

## 接口说明

### 注册

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "123456",
  "nickname": "管理员"
}
```

### 登录

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "123456"
}
```

登录成功后返回 `token`，后续需要登录的接口在请求头中携带：

```http
Authorization: Bearer <token>
```

### 获取当前用户

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 公开文章列表

```http
GET /api/posts
```

### 公开文章详情

```http
GET /api/posts/{id}
```

### 我的文章

```http
GET /api/posts/mine
Authorization: Bearer <token>
```

### 创建文章

```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "title": "第一篇博客",
  "content": "这是博客正文",
  "summary": "这是摘要",
  "status": 1,
  "tags": ["Java", "Spring Boot"]
}
```

`status` 可选值：

- `0`：草稿
- `1`：发布

### 修改文章

```http
PUT /api/posts/{id}
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "title": "更新后的标题",
  "content": "更新后的正文",
  "summary": "更新后的摘要",
  "status": 1,
  "tags": ["Java", "MyBatis"]
}
```

### 删除文章

```http
DELETE /api/posts/{id}
Authorization: Bearer <token>
```

## Node CLI 客户端

项目内置一个 Node CLI 客户端，代码位于 `blog_cli/` 目录，用于在命令行中新增、修改、删除博客。

### 安装依赖

```bash
cd blog_cli
npm install
```

开发环境可以使用 `npm link` 注册全局命令：

```bash
cd blog_cli
npm link
```

也可以不注册全局命令，直接使用：

```bash
cd blog_cli
npm run cli -- --help
```

### 配置后端地址

CLI 默认请求 `http://localhost:8080`。如果后端地址不同，可以持久设置：

```bash
blog-cli config set-base-url http://localhost:8080
```

也可以在单次命令中临时指定：

```bash
blog-cli --base-url http://localhost:8080 post list
```

### 登录和退出

新增、修改、删除博客需要先登录。登录成功后，JWT 会保存到本机用户目录下的 `.blog-cli/config.json`。

```bash
blog-cli login --username admin --password 123456
blog-cli me
blog-cli logout
```

### 查看博客

```bash
blog-cli post list
blog-cli post mine
```

### 新增博客

直接传入正文：

```bash
blog-cli post create --title "第一篇博客" --content "这是博客正文" --summary "这是摘要" --status 1 --tags Java,Spring
```

从文件读取正文：

```bash
blog-cli post create --title "第一篇博客" --content-file ./post.md --status 1 --tags Java,Spring
```

`status` 可选值：

- `0`：草稿
- `1`：发布

### 修改博客

```bash
blog-cli post update 1 --title "更新后的标题" --content-file ./post.md --summary "更新后的摘要" --status 1 --tags Java,MyBatis
```

### 删除博客

删除时默认需要确认：

```bash
blog-cli post delete 1
```

脚本中可以使用 `--yes` 跳过确认：

```bash
blog-cli post delete 1 --yes
```
