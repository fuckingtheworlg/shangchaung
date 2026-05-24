const { request } = require('../../utils/request.js');

Page({
  data: {
    item: null,
    loading: true,
    images: [], // 用于点击图片大图预览
  },

  onLoad(query) {
    const id = query.id;
    if (!id) {
      wx.showToast({ title: '缺少参数', icon: 'none' });
      return;
    }
    this.fetchDetail(id);
  },

  async fetchDetail(id) {
    this.setData({ loading: true });
    try {
      const data = await request({ url: `/api/articles/${id}` });
      wx.setNavigationBarTitle({ title: data.title || '详情' });
      data.content = this.normalizeHtml(data.content || '');
      this.setData({
        item: data,
        images: this.extractImages(data.content),
      });
    } catch (e) {
      // 已提示
    } finally {
      this.setData({ loading: false });
    }
  },

  // 让富文本里的图片自适应宽度，并保证段落有基础间距
  normalizeHtml(html) {
    if (!html) return '';
    let out = html;
    // 给所有 img 强制加 max-width:100%; height:auto; display:block;
    out = out.replace(/<img([^>]*?)>/gi, (full, attrs) => {
      const cleaned = attrs.replace(/\sstyle=("[^"]*"|'[^']*')/i, '');
      return `<img${cleaned} style="max-width:100%;height:auto;display:block;margin:12rpx auto;">`;
    });
    return out;
  },

  extractImages(html) {
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    const urls = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      urls.push(m[1]);
    }
    return urls;
  },

  onImgTap(e) {
    const src = e.detail.src || (e.currentTarget.dataset && e.currentTarget.dataset.src);
    if (!src) return;
    wx.previewImage({
      current: src,
      urls: this.data.images.length ? this.data.images : [src],
    });
  },
});
