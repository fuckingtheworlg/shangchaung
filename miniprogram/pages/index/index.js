const { request } = require('../../utils/request.js');
const { shareTitle } = require('../../config.js');

// 封面宽度固定 200rpx，根据 ratio "W:H" 算高度（单位 rpx）
function calcCoverHeight(ratio) {
  const COVER_WIDTH_RPX = 200;
  const m = /^(\d+):(\d+)$/.exec(String(ratio || '1:1'));
  if (!m) return COVER_WIDTH_RPX;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return COVER_WIDTH_RPX;
  return Math.round((COVER_WIDTH_RPX * h) / w);
}

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    finished: false,
    coverWidth: 200,         // rpx
    coverHeight: 200,        // rpx
  },

  onLoad() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    this.loadSettings();
    this.loadFirst();
  },

  // 转发给好友 / 微信群
  onShareAppMessage() {
    return {
      title: shareTitle,
      path: '/pages/index/index',
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: shareTitle,
    };
  },

  onPullDownRefresh() {
    Promise.all([this.loadSettings(), this.loadFirst()])
      .then(() => wx.stopPullDownRefresh());
  },

  async loadSettings() {
    try {
      const data = await request({ url: '/api/settings' });
      const ratio = (data && data.cover_aspect_ratio) || '1:1';
      this.setData({
        coverWidth: 200,
        coverHeight: calcCoverHeight(ratio),
      });
    } catch (e) {
      // 拉取失败保持默认 1:1，不影响列表
    }
  },

  onReachBottom() {
    if (this.data.finished || this.data.loading) return;
    this.loadMore();
  },

  async loadFirst() {
    this.setData({ list: [], page: 1, total: 0, finished: false });
    return this.fetchPage(1);
  },

  async loadMore() {
    return this.fetchPage(this.data.page + 1);
  },

  async fetchPage(page) {
    this.setData({ loading: true });
    try {
      const data = await request({
        url: `/api/articles?page=${page}&pageSize=${this.data.pageSize}`,
      });
      const merged = page === 1 ? data.list : this.data.list.concat(data.list);
      this.setData({
        list: merged,
        page,
        total: data.total,
        finished: merged.length >= data.total,
      });
    } catch (e) {
      // 错误已在 request 内提示
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },
});
