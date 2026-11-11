# ISLAND

一个用 Three.js 构建的交互式 3D 海岛。可以环视海湾、切换昼夜和天气，也可以在凉亭点蜡烛、许愿、看烟花。

- 在线体验：[ISLAND](https://aurelia-warm-island.zxin0408g.chatgpt.site/)
- 离线体验：下载并解压仓库 ZIP，用支持 WebGL 2 的浏览器打开 `dist/index.html`。
- 编辑源码：主要文件在 `src/`。构建后的页面与原版对照页面在 `dist/`。

## 送礼前

- 收礼人的名字：在 `src/main.js` 顶部的 `giftName` 里填上，重新构建后，烟花标题和蛋糕旁的小卡片会写成「名字，生日快乐」。
- 发送时只需要 `dist/index.html` 这一个文件，可离线打开。
- 电影感改版之前的源码与页面保存在 `snapshots/src-before-cinematic/` 和 `snapshots/before-cinematic.html`。

## 构建与检查

```sh
npm ci
npm run build
npm test
```

Three.js 的许可证见 [LICENSE-THREE.txt](LICENSE-THREE.txt)。
