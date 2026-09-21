#!/usr/bin/env bash
#
# 自动更新 DB-IP City Lite 离线 IP 定位库（每月 1 次）
# - 从 db-ip 官方下载最新 mmdb
# - 校验为有效 MaxMind DB 文件
# - 覆盖服务器上的 mmdb
# - 重启 blog 后端服务
#
# 部署：
#   1. 按下方"配置区"改好 MMDB_PATH（必须与 server/.env 的 GEO_DB_PATH 一致）
#   2. 复制到服务器：sudo cp server/scripts/update-dbip.sh /home/hanphone/bin/update-dbip.sh
#   3. 加执行权限：sudo chmod +x /home/hanphone/bin/update-dbip.sh
#   4. 加入 crontab（每月 1 号凌晨 3 点）：
#        sudo crontab -e
#        0 3 1 * *  /home/hanphone/bin/update-dbip.sh >> /var/log/update-dbip.log 2>&1

set -euo pipefail

# ================= 配置区 =================
# mmdb 落地路径（必须与 server/.env 的 GEO_DB_PATH 一致）
MMDB_PATH="${GEO_DB_PATH:-/home/hanphone/GeoLite2-City.mmdb}"
# 下载缓存目录
TMP_DIR="/tmp/dbip-update"
# 后端服务名（systemd）
SERVICE_NAME="blog"
# ==========================================

mkdir -p "${TMP_DIR}"

# 当前月份，用于拼下载文件名（db-ip 每月发布，如 2026-09）
YEAR_MONTH="$(date +%Y-%m)"
URL="https://download.db-ip.com/free/dbip-city-lite-${YEAR_MONTH}.mmdb.gz"
GZ="${TMP_DIR}/dbip-city-lite.mmdb.gz"
NEW="${TMP_DIR}/dbip-city-lite.mmdb"

echo "[$(date)] 开始更新 DB-IP City Lite (${YEAR_MONTH})"
echo "[$(date)] 下载: ${URL}"

# 下载
curl -fsSL --retry 3 -o "${GZ}" "${URL}" || { echo "[$(date)] 下载失败"; exit 1; }

# 解压
gzip -df "${GZ}" || { echo "[$(date)] 解压失败"; exit 1; }

# 校验为有效 MaxMind DB 文件（metadata marker: ab cd ef 在文件尾部附近）
if ! tail -c 512 "${NEW}" | grep -q $'\xab\xcd\xef'; then
  echo "[$(date)] 校验失败：文件不是有效的 MaxMind DB 格式，中止更新"
  exit 1
fi
echo "[$(date)] 校验通过，文件大小: $(du -h "${NEW}" | cut -f1)"

# 覆盖目标文件（先备份旧的）
if [ -f "${MMDB_PATH}" ]; then
  cp -f "${MMDB_PATH}" "${MMDB_PATH}.bak.$(date +%Y%m%d)"
fi
mv -f "${NEW}" "${MMDB_PATH}"
echo "[$(date)] 已覆盖: ${MMDB_PATH}"

# 重启后端以重新加载新库
echo "[$(date)] 重启服务: ${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

# 清理临时目录
rm -rf "${TMP_DIR}"

echo "[$(date)] 更新完成"