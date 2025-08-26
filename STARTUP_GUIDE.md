# Sparkle LLM 启动指南

## 🚀 **统一启动方式**

### **后端启动**
```bash
cd backend
npm run build  # 构建TypeScript代码
npm start       # 启动应用
```

### **前端启动**
```bash
cd frontend
npm run build   # 构建前端代码
npm run preview # 预览构建结果（可选）
```

## 📋 **可用脚本**

### **后端脚本**
- `npm run build` - 构建TypeScript代码到dist目录
- `npm start` - 启动应用（生产模式）
- `npm run start:prod` - 启动应用（明确指定生产环境）
- `npm run clean` - 清理构建文件
- `npm run lint` - 代码检查
- `npm run lint:fix` - 自动修复代码问题
- `npm run migrate` - 运行数据库迁移

### **前端脚本**
- `npm run build` - 构建前端应用
- `npm run preview` - 预览构建结果
- `npm run lint` - 代码检查

## 🔧 **开发工作流**

### **代码修改后的步骤**
1. **修改后端代码**：
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **修改前端代码**：
   ```bash
   cd frontend
   npm run build
   ```

3. **全量重启**：
   ```bash
   # 停止后端服务 (Ctrl+C)
   cd backend && npm run build && npm start
   ```

## 📊 **启动验证**

### **后端启动成功标志**
- ✅ 服务注册完成
- ✅ 向量数据库服务初始化成功
- ✅ Socket服务初始化成功
- ✅ 工具服务初始化成功
- ✅ 模型服务初始化成功
- ✅ 记忆服务初始化成功
- ✅ 应用服务协调器初始化成功
- 🚀 所有服务初始化完成
- Server started on port 3001

### **访问地址**
- **应用主页**: http://localhost:3001
- **API文档**: http://localhost:3001/api-docs

## ⚠️ **注意事项**

1. **统一使用npm start** - 不再支持开发模式（npm run dev）
2. **先构建再启动** - 修改代码后必须先运行npm run build
3. **端口占用** - 确保3001端口未被其他应用占用
4. **依赖安装** - 首次运行前确保已安装依赖（npm install）

## 🛠️ **故障排除**

### **常见问题**
1. **端口被占用**：
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

2. **构建失败**：
   ```bash
   npm run clean
   npm run build
   ```

3. **依赖问题**：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📈 **性能优化**

- **生产环境**：使用 `npm run start:prod`
- **内存优化**：定期重启应用释放内存
- **日志管理**：定期清理日志文件

---

**简化后的启动方式让开发和部署更加统一和可靠！** 🚀
