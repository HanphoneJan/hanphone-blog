// API接口地址配置
// 通过修改API_BASE_URL来切换不同的环境
// export const API_BASE_URL = 'http://localhost:4000';
export const PICTURE_BASE_URL = 'https://hanphone.top'
export const API_BASE_URL = 'https://hanphone.cn/nodejs/atlas';
export const BLOG_BASE_URL = 'https://hanphone.cn/api';
// 通过修改ENDPOINTS可以修改API接口路径
export const ENDPOINTS = {
  LOGIN: `${BLOG_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  WECHATREGISTER: `${API_BASE_URL}/wechatRegister`,
  SENDVERICATIONCODE: `${API_BASE_URL}/sendVerificationCode`,
  VISITCOUNT: `${API_BASE_URL}/visitCount`,
  SHOW: `${API_BASE_URL}/show`,
  FILE: {
    UPLOAD: `${PICTURE_BASE_URL}/upload/`,
    DELETE: `${PICTURE_BASE_URL}/delete/`,
    GET_FILE: `${PICTURE_BASE_URL}/file/`,
    GET_FILES: `${PICTURE_BASE_URL}/files/`,
    DIRECTORY: `${PICTURE_BASE_URL}/directory/`
  },
  UPLOAD: `${API_BASE_URL}/upload`,
  LIKES: `${API_BASE_URL}/likes`,
  SEARCH: `${API_BASE_URL}/search`,
  FORGOTPASSWORD: `${API_BASE_URL}/forgotPassword`,
  ADMINSHOW: `${API_BASE_URL}/admin/adminShow`,
  CHANGEPHOTOTYPE: `${API_BASE_URL}/admin/changePhotoType`,
  DELETEPHOTO: `${API_BASE_URL}/admin/deletePhoto`,
  ADMINUPDATE: `${API_BASE_URL}/admin/adminUpdate`,
  GETUSER: `${API_BASE_URL}/admin/getUser`,
  DELETEUSER: `${API_BASE_URL}/admin/deleteUser`,
  CHANGEUSER: `${API_BASE_URL}/admin/changeUser`,
  DELETETAG: `${API_BASE_URL}/admin/deleteTag`,
  CREATETAG: `${API_BASE_URL}/admin/createTag`,
  GETTAG: `${API_BASE_URL}/getTag`,
  GETADMINTAG: `${API_BASE_URL}/admin/getAdminTag`,
  ADDTAG: `${API_BASE_URL}/admin/addTag`,
  DELETEPHOTOTAG: `${API_BASE_URL}/admin/deletePhotoTag`,
};
