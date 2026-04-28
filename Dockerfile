# 使用 Node.js 官方镜像作为基础镜像
FROM node:20-slim AS base

# 设置工作目录
WORKDIR /app

# 安装构建依赖（如果需要编译原生模块）
# RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# --- 构建阶段 ---
FROM base AS builder

# 复制 package.json 和 lock 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm install

# 复制源代码
COPY . .

# 执行前端构建
RUN npm run build

# --- 运行阶段 ---
FROM base AS runner

# 设置为生产环境
ENV NODE_ENV=production

# 复制运行所需文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
# 如果有其他静态资源或配置文件也需要复制
# COPY --from=builder /app/public ./public 

# 仅安装生产环境依赖
# 注意：由于我们需要运行 server.ts (TypeScript)，我们需要 tsx
# 或者你可以将 server.ts 编译为 JS。这里为了保持简单且兼容，我们安装所需工具。
RUN npm install --omit=dev && npm install -g tsx

# 暴露端口（与 server.ts 中的 3000 保持一致）
EXPOSE 3000

# 启动命令
CMD ["tsx", "server.ts"]
