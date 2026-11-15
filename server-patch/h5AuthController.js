// 可选后端补丁：为 H5 端提供设备号登录
// 放置到 vocab-server/src/controllers/h5AuthController.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../../models');
const { success, fail, error } = require('../utils/response');

async function h5Login(req, res) {
  try {
    const { deviceId, userInfo } = req.body || {};
    if (!deviceId) {
      return res.json(fail(400, '缺少设备标识 deviceId'));
    }

    // 设备 ID 哈希成稳定的 openid，同一个浏览器重复登录会落到同一个账号
    const hash = crypto.createHash('sha256').update(String(deviceId)).digest('hex');
    const openid = `h5_${hash.slice(0, 40)}`;

    const now = new Date();
    let user = await User.findOne({ where: { openid } });

    if (user) {
      await user.update({
        nickname: userInfo?.nickName || userInfo?.nickname || user.nickname,
        avatar: userInfo?.avatarUrl || userInfo?.avatar || user.avatar,
        updatedAt: now,
      });
    } else {
      user = await User.create({
        openid,
        nickname: userInfo?.nickName || userInfo?.nickname || '',
        avatar: userInfo?.avatarUrl || userInfo?.avatar || '',
        level: 1,
        checkInDays: 0,
        vocabCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    const token = jwt.sign({ openid }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    return res.json(success({
      token,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level,
        checkInDays: user.checkInDays,
        vocabCount: user.vocabCount,
      },
    }, '登录成功'));
  } catch (err) {
    console.error('H5 登录失败：', err);
    return res.json(error('H5 登录失败', err));
  }
}

module.exports = { h5Login };
