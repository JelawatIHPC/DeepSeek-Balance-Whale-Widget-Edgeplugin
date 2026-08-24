# DSH 小鲸鱼余额挂件 · Edge 浏览器扩展

浏览器右下角的常驻小鲸鱼挂件（Microsoft Edge / Chromium，Manifest V3）。它是 DSH 插件版的浏览器扩展移植，现在可以独立运行，同时支持显示 **Deepseek 余额** 与 **本地 Opencode 用量**。

## 特性

- 🐋 所有网页右下角常驻（可拖拽、四边吸附、左侧镜像翻转、按压 Q 弹）
- 💰 **Deepseek 模式**：余额 + 今日已用（小鲸鱼记账 / 实时·令牌 两种口径）
- 📊 **Opencode 模式**：点击鲸鱼弹出本地 Opencode 用量，**三页自动轮播**：
  - 今日已用 Token / 今日金额（USD）/ 本月已用 Token
  - 每页附 Top 模型小字（如 `DeepSeek V4 Flash: 34.1M`），播完自动收起
- ⚡ **秒开缓存**：30 秒内置缓存，popup 与气泡打开即显示，后台静默刷新
- 🎛️ 汉堡菜单：大小 / 音效 / 音量 / 用量 / 记账 / 峰谷文案 / 气泡 / 避让滚动条
- 🖱️ 工具栏 popup：余额与用量速览、**隐藏本站**、**全局暂停**（即时生效）
- 🛠️ 设置页：API Key 录入校验、站点黑名单、恢复默认
- 🔊 音效 / 💬 随机台词气泡 / 🎨 浅色深色主题自适应
- 📦 零第三方依赖（原生宿主仅用 Windows 自带 PowerShell + winsqlite3）

## 环境要求

- Windows 10 1607 及以上 / Windows 11
- Microsoft Edge（Chromium 内核，任意渠道版本）
- 可选：本机安装 Opencode（用于 Opencode 数据源；读取用系统组件，不需要 Python）

---

## 安装（开发人员模式）

> 面向测试小伙伴的完整步骤。共 4 步，约 1 分钟。

### 方法 A：手动安装（推荐给测试）

1. **下载仓库**：GitHub 页面点 **Code → Download ZIP** 并解压（或 `git clone`）
2. 打开 Edge，地址栏输入并回车：
   ```
   edge://extensions
   ```
3. 打开左下角 **「开发人员模式」** 开关
4. 点击 **「加载解压缩的扩展」**，选择解压后的**仓库根目录**（就是包含 `manifest.json` 的那一层文件夹）
5. 完成 🎉 所有网页右下角出现小鲸鱼。**已打开的网页需要刷新（F5）** 才会出现

### 方法 B：安装脚本（仓库内执行）

```powershell
.\scripts\install-edge.ps1
```

脚本会：校验扩展文件 → 把仓库路径复制到剪贴板 → 显示完整图文指引 → **按任意键**后自动打开 `edge://extensions`，再按指引「开发人员模式 → 加载解压缩的扩展 → 粘贴路径」即可。

---

## 启用 Opencode 用量（可选，本地 AI 用量看板）

1. 在仓库目录执行：
   ```powershell
   .\scripts\install-edge.ps1 -Mode native
   ```
   这会注册一个读取 Opencode 数据库的本地宿主（仅使用 Windows 自带组件，无任何依赖）
2. **完全退出 Edge 并重新打开**（任务管理器结束所有 `msedge.exe`，或重启电脑）
3. 点鲸鱼 → 汉堡菜单 →「用量」→ 选 **Opencode**
4. 点击鲸鱼弹出三页轮播：今日已用 Token → 今日金额 → 本月已用（每页带 Top 模型小字）
5. 不想用了：`.\scripts\install-edge.ps1 -Mode native -Remove`

> 该模式读取的是本机 Opencode 的用量数据库（`~/.local/share/opencode/opencode.db`），金额为 OpenCode 官方口径（USD）。

## 配置 Deepseek 余额（可选）

1. 右键工具栏鲸鱼图标 → **扩展选项**（或 popup →「设置」）
2. 填入 `DEEPSEEK_API_KEY` →「保存并校验」
3. 保存成功即显示余额与今日已用

说明：
- 没配 Key 时：Deepseek 模式余额显示 `--`；**Opencode 模式完全不受影响**
- 「实时·令牌」口径可选，需在平台网页 F12 获取会话令牌（详见旧版 README 教程，见 `legacy/README.md`）

---

## 日常使用

| 操作 | 效果 |
|---|---|
| 点击鲸鱼 | 刷新数据 + 弹出气泡（Deepseek 模式显示余额信息；Opencode 模式显示用量并轮播） |
| 拖拽鲸鱼 | 移动；松手按屏幕四分之一吸附边缘；贴左边缘自动镜像翻转 |
| 悬停鲸鱼右上角 | 汉堡菜单（大小 / 音效 / 音量 / 用量 / 记账 / 峰谷 / 气泡 / 避让滚动条） |
| 点击工具栏鲸鱼图标 | popup：余额与用量速览、隐藏本站、全局暂停 |
| 点击气泡 | Deepseek 模式切换随机台词；Opencode 模式手动切页 |
| 刷新数据 | 仅用户触发（点击鲸鱼 / 打开 popup / 切换模式），无后台轮询 |

## 目录结构

```text
├── manifest.json              # MV3 清单（含固定 key，扩展 ID 稳定）
├── src/
│   ├── background/sw.js       # 后台：余额服务、数据源、30s 缓存、配置
│   ├── content/whale.js+css   # 页面注入的鲸鱼本体
│   ├── shared/                # 定价 / 记账 / 数据源 / 协议（纯逻辑，可单测）
│   ├── options/               # 设置页
│   └── popup/                 # 工具栏弹窗
├── native-host/               # Opencode 读取宿主（PowerShell + winsqlite3，零依赖）
├── scripts/install-edge.ps1   # 安装 / native 注册 / 打包 / 体检脚本
├── tests/                     # 自检测试（node 直接运行）
└── legacy/                    # 原 DSH 插件版（参考）
```

## 开发

- 改了 `src/background/` → `edge://extensions` 里点「重新加载」
- 改了 `src/content/`（鲸鱼本体）→ **刷新网页（F5）**
- 自测：`node tests\test-pricing.mjs` / `node tests\test-ledger.mjs` / `node tests\test-native-host.mjs`
- 体检：`.\scripts\install-edge.ps1 -Mode doctor`
- 完整设计与决策记录见 [PLAN.md](PLAN.md)，变更历史见 [CHANGELOG.md](CHANGELOG.md)

## 常见问题

- **网页上没有鲸鱼**：确认扩展已加载；设置页「隐藏站点 / 全局暂停」是否开启；刷新页面（F5）
- **Opencode 显示「已回落」**：打开 popup 看「状态」行的回落原因。常见：宿主未注册（跑 `-Mode native` 后**完整重启 Edge**）；扩展 ID 变化（重新跑 `-Mode native` 自动校正白名单）
- **余额显示 `--`**：未配置 `DEEPSEEK_API_KEY`（设置页录入）
- **卸载**：`edge://extensions` → 移除扩展；数据源宿主：`.\scripts\install-edge.ps1 -Mode native -Remove`

## 许可证

MIT，详见 [LICENSE](LICENSE)。
