// components/image-uploader/index.js
const api = require('../../utils/api.js');
const config = require('../../utils/config.js');

Component({
  properties: {
    // 已上传的图片列表
    images: {
      type: Array,
      value: []
    },
    // 最大上传数量
    maxCount: {
      type: Number,
      value: 9
    },
    // 提示文字
    tip: {
      type: String,
      value: ''
    }
  },

  data: {
    maxSize: config.upload.maxSize,
    allowedTypes: config.upload.allowedTypes
  },

  methods: {
    // 选择图片
    chooseImage() {
      const that = this;
      const { images, maxCount } = this.properties;
      
      const remainCount = maxCount - images.length;
      
      wx.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        maxDuration: 30,
        camera: 'back',
        success(res) {
          const tempFilePaths = res.tempFiles.map(file => file.tempFilePath);
          
          // 上传图片
          tempFilePaths.forEach(filePath => {
            that.uploadImage(filePath);
          });
        },
        fail(error) {
          console.error('选择图片失败:', error);
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
        }
      });
    },

    // 上传图片
    uploadImage(filePath) {
      const that = this;
      
      wx.showLoading({
        title: '上传中...',
        mask: true
      });

      api.uploadAccountImage(filePath)
        .then(res => {
          wx.hideLoading();
          
          const { images } = that.properties;
          const newImages = [...images, res.data.url];
          
          that.setData({
            images: newImages
          });
          
          // 触发change事件
          that.triggerEvent('change', {
            images: newImages
          });
          
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        })
        .catch(error => {
          wx.hideLoading();
          console.error('上传图片失败:', error);
          
          wx.showToast({
            title: error.error || '上传失败',
            icon: 'none'
          });
        });
    },

    // 删除图片
    deleteImage(e) {
      const { index } = e.currentTarget.dataset;
      const { images } = this.properties;
      
      wx.showModal({
        title: '提示',
        content: '确定删除这张图片吗？',
        success(res) {
          if (res.confirm) {
            const newImages = images.filter((_, i) => i !== index);
            
            that.setData({
              images: newImages
            });
            
            // 触发change事件
            that.triggerEvent('change', {
              images: newImages
            });
          }
        }
      });
    },

    // 预览图片
    previewImage(e) {
      const { index } = e.currentTarget.dataset;
      const { images } = this.properties;
      
      wx.previewImage({
        current: images[index],
        urls: images
      });
    }
  }
});
