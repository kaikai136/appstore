# Cockpit App Store

[English](README.md) | 简体中文

**Cockpit App Store** 是一个基于 Git 数据源的静态开源应用目录。本项目采用**单一 Git 仓库**管理应用元数据、网站前端以及构建部署流程，适合检索、筛选和了解自托管应用。

> 这是独立维护的社区应用目录，**不是 Cockpit 官方项目或已认证插件**。目前仅提供应用展示和技术资料查看，不提供 Cockpit 内的一键安装，也不保证原有 Docker Compose 模板可以直接在 Cockpit 中部署。

## 项目目录

```text
.
├── apps/                    # 应用 YAML、README、图标和版本模板
├── data.yaml                # 项目名称及应用分类
├── website/                 # Astro 静态网站
│   ├── src/                 # 页面、组件、布局、配置
│   ├── scripts/             # 索引生成、校验、品牌审计
│   ├── public/              # 网站素材及生成的图标/JSON
│   └── dist/                # 构建结果（不提交 Git）
├── .github/workflows/
│   ├── cockpit-site.yml     # 网站构建与可选发布
│   └── ...                  # 保留原有应用维护流程
├── docs/ARCHITECTURE.md
├── package.json             # 根目录统一命令
└── LICENSE
```

## 快速开始

需要 **Node.js 22 或以上**。从仓库根目录执行：

```bash
npm run setup            # 安装 website/ 依赖
npm run dev              # 本地开发
npm run check            # YAML、品牌、类型检查
npm run build            # 生成纯静态网站
npm run preview          # 预览 website/dist/
```

生成器默认直接读取同一仓库中的 `apps/` 和 `data.yaml`，不再需要第二个仓库、Git Submodule、跨仓库通知或额外的 APPSTORE_SOURCE 配置。

构建产物位于 `website/dist/`，可以直接由 Nginx、CDN 或 GitHub Pages 托管；运行时不需要 Node.js 服务或数据库。

## 应用数据维护

`apps/<key>/` 存放一个应用的基础元数据 `data.yml`、图标、README 和不同版本的配置模板。新增或修改这些文件后，CI 会重新生成静态索引和详情页，无须手动维护前端应用列表。

`ai-gateway` 和 `ai-portal` 是原平台专属应用，目前在网页中排除。展示规则集中在 `website/src/config/catalog-overrides.yaml`。

## 自动构建与发布

根目录的 `.github/workflows/cockpit-site.yml` 在应用数据或网站代码变更时进行检查和构建，并上传可下载的静态产物。

GitHub Pages 默认**不自动启用**。如需发布，先启用 GitHub Pages 的 Actions 来源，然后配置仓库变量 `COCKPIT_DEPLOY_PAGES=true`、`SITE_URL`、`SITE_BASE`。完整规则参见 [架构文档](docs/ARCHITECTURE.md)。

## 格式来源与兼容性

部分应用包沿用 [1Panel App Store](https://github.com/1Panel-dev/appstore) 的目录格式和元数据，其 Compose 中仍可能存在 `PANEL_*` 环境变量、`1panel-network` 等原平台依赖。**这些是原始部署参数，不代表已适配 Cockpit。** 为避免破坏应用逻辑，暂不进行全局字符串替换；未来安装功能需要独立适配、测试和安全审查。

保留原有 [GPL-3.0 许可证](LICENSE)和必要的来源说明；第三方应用名称、商标、图标等仍属于相应权利人。
