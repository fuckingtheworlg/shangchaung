# settings

全局系统设置模块（KV 表，便于扩展任意配置项）。当前承载：

- `cover_aspect_ratio`：小程序首页卡片封面长宽比

## 已完成

- [x] `server/prisma/schema.prisma`：新增 `Setting` model（id=key, value, updatedAt）（2026-05-25）
- [x] `server/src/routes/admin.settings.ts`：GET/PUT 后台读写，带 key 白名单与值校验（2026-05-25）
- [x] `server/src/routes/public.settings.ts`：GET 公开读取，带默认值兜底（2026-05-25）
- [x] `server/src/index.ts`：挂载 `/api/admin/settings` 与 `/api/settings`（2026-05-25）
- [x] `admin/src/api/settings.ts`：前端 API 封装 + `COVER_RATIO_OPTIONS` 常量（2026-05-25）
- [x] `admin/src/components/SettingsModal.tsx`：长宽比单选弹窗（2026-05-25）
- [x] `admin/src/components/Layout.tsx`：头部右上角加齿轮按钮触发弹窗（2026-05-25）
- [x] `miniprogram/pages/index/index.js`：onLoad/下拉刷新时拉 `/api/settings`，按 ratio 计算高度（2026-05-25）
- [x] `miniprogram/pages/index/index.wxml`：image 元素动态注入 width/height 内联样式（2026-05-25）
- [x] `miniprogram/pages/index/index.wxss`：移除写死的 200×200 尺寸，只留兜底背景色（2026-05-25）

## 关键决策

- **KV 表 vs 文章字段**：选 KV 表（`Setting`）。理由：后续扩展任意全局配置（站点名、客服微信、首页 banner 等）零破坏性，给文章表加字段相反每加一项就动 schema。
- **后端校验白名单**：`SCHEMAS` 字典限定允许写入的 key，每个 key 一个 Zod schema 限定取值。理由：避免前端误传或攻击者乱写脏数据进表。
- **公开接口加默认值兜底**：`public.settings.ts` 用 `DEFAULTS` 常量与 DB 结果合并，即使数据库无记录也返回完整设置。小程序端因此可以放心读 `data.cover_aspect_ratio`。
- **封面尺寸约束方式**：宽度固定 200rpx，高度按 ratio 计算（W:H → height = 200×H/W）。理由：保证首页卡片左侧宽度一致、整体布局不抖；改变 ratio 只调高度。
- **生效时机**：小程序端只在 `onLoad` 和 `onPullDownRefresh` 时拉一次设置（已在弹窗里写明），不每次进入都拉。理由：低频配置无需实时；下拉刷新是约定俗成的手动同步入口。
- **未做实时推送**：没用 WebSocket / 轮询。理由：单管理员场景，配置变化频率极低，简单胜过完美。

## 已知限制 / 待办

- [ ] 已经打开小程序的用户不会立即看到新 ratio，需要下拉刷新或重新进入首页；后台弹窗里已用文字提示
- [ ] 详情页顶部封面 `mode="widthFix"` 仍按原图比例显示，**没有跟随 ratio**（按本次需求"3a 只影响首页列表"约定）
- [ ] 后台预览缩略图仍是固定 `64×64`，没跟随 ratio
- [ ] 未做 ratio 自定义输入（仅 4 个预设）。需要时把 `SCHEMAS.cover_aspect_ratio` 从 `z.enum` 改为 `z.string().regex(/^\d+:\d+$/)` 即可
- [ ] 未做 Prisma migration，依赖 install.sh / update.sh 里的 `db push` 兜底直接同步表结构

## 踩坑记录

本次开发流程顺利，无踩坑。
