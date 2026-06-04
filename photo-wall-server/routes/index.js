const express = require('express');
const router = express.Router();

const visitCountController = require('../controller/visitCount');
const showController = require('../controller/show');
const uploadController = require('../controller/upload');
const likesController = require('../controller/likes');
const searchController = require('../controller/search');
const getTagController = require('../controller/getTag');

// 基础路由
router.get('/visitCount', visitCountController.visitCount);
router.get('/show', showController.show);
router.post('/upload', uploadController.upload);
router.post('/likes', likesController.likes);
router.get('/userLikes', likesController.getUserLikes);
router.post('/search', searchController.search);
router.get('/getTag', getTagController.getTag);



module.exports = router;