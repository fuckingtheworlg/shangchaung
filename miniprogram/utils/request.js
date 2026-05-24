const { baseURL } = require('../config.js');

function request({ url, method = 'GET', data, header }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseURL + url,
      method,
      data,
      header: { 'content-type': 'application/json', ...(header || {}) },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data;
          if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 0) {
              resolve(body.data);
            } else {
              wx.showToast({ title: body.message || '请求失败', icon: 'none' });
              reject(body);
            }
          } else {
            resolve(body);
          }
        } else {
          wx.showToast({ title: `网络错误 ${res.statusCode}`, icon: 'none' });
          reject(res);
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}

module.exports = { request, baseURL };
