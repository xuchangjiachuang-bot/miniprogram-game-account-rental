#!/bin/bash
# 小程序上传脚本
# 调用项目根目录的上传脚本

cd "$(dirname "$0")/.." && bash upload-miniprogram.sh "$@"
