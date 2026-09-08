# image-upload-compress

上传图片服务端压缩 + 存量批压，解决小程序加载慢 / 详情白屏 / 分享封面失败。

## 已完成

- [x] `server/src/lib/imageCompress.ts`：sharp 压缩工具（最长边 1920、质量 80、JPEG、EXIF 旋转）（2026-09-08）
- [x] `server/src/routes/admin.upload.ts`：上传后压再落盘；gif/svg 不压；压缩失败回退原图；上限仍 1GB（2026-09-08）
- [x] `server/scripts/compress-uploads.ts`：存量批压；png/webp→jpg 时 REPLACE articles.cover/content URL（2026-09-08）
- [x] 依赖 `sharp`；`npm run compress:uploads`（2026-09-08）

## 关键决策

- **压后落盘而非拒绝大图**：保留 1GB 上传上限（手机可选原图），服务器统一压成展示友好体积，兼顾客户操作习惯与小程序性能。
- **最长边 1920**：壁纸/摄影展示需要比商品图（常 1280）更清晰；质量 80 + mozjpeg。
- **磁盘落盘再压**：不用 memoryStorage，避免 1GB 文件把 4G 内存打满。
- **gif/svg 不压**：动图 / 矢量有损或无意义。
- **PNG→JPG 必须改库**：批压改扩展名后同步 REPLACE 文章 cover/content，否则前端仍指向已删文件。

## 已知限制 / 待办

- [ ] 未做独立「分享专用缩略图」（更小尺寸）；压后封面一般够用，若仍有分享失败再加
- [ ] 详情页仍用 `rich-text` 一次性渲染多图；体积下来后白屏应明显缓解，若不够再换 mp-html + 懒加载
- [ ] 压缩失败时回退原图，极端大图仍可能慢（有日志）

## 踩坑记录

- ⚠️ **现象**：客户反馈加载慢、详情白、分享封面不出
  **根因**：原图直出，单张可达 4MB / 3140×5120，一篇详情 8 张图十几 MB
  **修复**：上传压缩 + 存量批压（本模块）
