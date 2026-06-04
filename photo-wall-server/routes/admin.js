const express = require('express');
const router = express.Router();

// 导入管理员相关控制器
const adminShowController = require('../controller/admin/adminShow');
const changePhotoTypeController = require('../controller/admin/changePhotoType');
const deletePhotoController = require('../controller/admin/deletePhoto');
const adminUpdateController = require('../controller/admin/adminUpdate');
const getUserController = require('../controller/admin/getUser');
const deleteUserController = require('../controller/admin/deleteUser');
const changeUserController = require('../controller/admin/changeUser');
const deleteTagController = require('../controller/admin/deleteTag');
const createTagController = require('../controller/admin/createTag');
const getAdminTagController = require('../controller/admin/getAdminTag');
const addTagController = require('../controller/admin/addTag');
// const updateTagController = require('../controller/admin/updateTag');
const deletePhotoTagController = require('../controller/admin/deletePhotoTag');

// 管理员路由定义
router.get('/adminShow', adminShowController.adminShow);
router.post('/changePhotoType', changePhotoTypeController.changePhotoType);
router.post('/deletePhoto', deletePhotoController.deletePhoto);
router.post('/adminUpdate', adminUpdateController.adminUpdate);
router.get('/getUser', getUserController.getUser);
router.post('/deleteUser', deleteUserController.deleteUser);
router.post('/changeUser', changeUserController.changeUser);
router.post('/deleteTag', deleteTagController.deleteTag);
router.post('/createTag', createTagController.createTag);
router.get('/getAdminTag', getAdminTagController.getAdminTag);
router.post('/addTag', addTagController.addTag);
// router.post('/updateTag', updateTagController.updateTag);
router.post('/deletePhotoTag', deletePhotoTagController.deletePhotoTag);

module.exports = router;