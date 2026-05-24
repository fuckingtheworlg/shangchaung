const { request } = require('../../utils/request.js');

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    finished: false,
  },

  onLoad() {
    this.loadFirst();
  },

  onPullDownRefresh() {
    this.loadFirst().then(() => wx.stopPullDownRefresh());
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
