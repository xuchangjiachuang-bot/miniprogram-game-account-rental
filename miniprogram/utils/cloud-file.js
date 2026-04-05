const config = require('./config.js');

const tempUrlCache = new Map();

function isCloudFileId(value) {
  return typeof value === 'string' && value.trim().startsWith('cloud://');
}

function chunk(list, size) {
  const result = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
}

async function fetchTempUrls(fileIds) {
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return new Map();
  }

  if (!wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
    return new Map();
  }

  const missingIds = fileIds
    .filter((item) => isCloudFileId(item))
    .filter((item, index, list) => list.indexOf(item) === index)
    .filter((item) => !tempUrlCache.has(item));

  const batches = chunk(missingIds, 20);

  for (const batch of batches) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: batch });
      const fileList = Array.isArray(res.fileList) ? res.fileList : [];
      fileList.forEach((item) => {
        const fileId = item.fileID || item.fileId;
        const tempFileURL = item.tempFileURL || item.tempFileUrl;
        if (fileId && tempFileURL) {
          tempUrlCache.set(fileId, tempFileURL);
        }
      });
    } catch (error) {
      console.error('resolve cloud file temp url failed:', error);
    }
  }

  return new Map(fileIds.map((item) => [item, tempUrlCache.get(item) || item]));
}

async function resolveImageList(imageList) {
  if (!Array.isArray(imageList) || imageList.length === 0) {
    return [];
  }

  const tempUrlMap = await fetchTempUrls(imageList);
  return imageList.map((item) => tempUrlMap.get(item) || item);
}

async function resolveAccountImages(account) {
  if (!account || !Array.isArray(account.images) || account.images.length === 0) {
    return account;
  }

  const images = await resolveImageList(account.images);
  return {
    ...account,
    images,
    screenshots: images,
  };
}

async function resolveAccountListImages(accounts) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return [];
  }

  const allImages = accounts.flatMap((item) => (Array.isArray(item.images) ? item.images : []));
  const tempUrlMap = await fetchTempUrls(allImages);

  return accounts.map((item) => {
    const images = Array.isArray(item.images)
      ? item.images.map((image) => tempUrlMap.get(image) || image)
      : [];

    return {
      ...item,
      images,
      screenshots: images,
    };
  });
}

async function resolveCarouselImages(carousels) {
  if (!Array.isArray(carousels) || carousels.length === 0) {
    return [];
  }

  const imageList = carousels.map((item) => item.imageUrl).filter(Boolean);
  const tempUrlMap = await fetchTempUrls(imageList);

  return carousels.map((item) => ({
    ...item,
    imageUrl: tempUrlMap.get(item.imageUrl) || item.imageUrl,
  }));
}

function initCloud() {
  if (!wx.cloud || typeof wx.cloud.init !== 'function') {
    return false;
  }

  try {
    wx.cloud.init({
      env: config.cloudEnvId,
      traceUser: true,
    });
    return true;
  } catch (error) {
    console.error('init cloud failed:', error);
    return false;
  }
}

module.exports = {
  initCloud,
  isCloudFileId,
  resolveImageList,
  resolveAccountImages,
  resolveAccountListImages,
  resolveCarouselImages,
};
