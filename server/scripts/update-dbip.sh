#!/usr/bin/env bash
#
# 自动更新 DB-IP City Lite 离线 IP 定位库（每月 1 次）
#
# 用途：
#   - 从 db-ip 官方下载最新 mmdb
#   - 校验为有效 MaxMind DB 格式
#   - 覆盖目标 mmdb 文件（自动保留 .bak 备份）
#   - 重启后端服务
#
# 本脚本不硬编码任何服务器路径/服务名，全部通过命令行参数传入，
# 避免在仓库中暴露部署信息。
#
# 用法：
#   update-dbip.sh [-p <mmdb落地路径>] [-s <systemd服务名>] [-y <YYYY-MM>] [-n]
#
# 参数：
#   -p PATH   mmdb 落地路径（可选；不传则下载到脚本所在目录，文件名 dbip-city-lite.mmdb）
#   -s NAME   后端 systemd 服务名（可选，默认跳过重启）
#   -y YM     指定月份，如 2026-09（可选，默认当前月）
#   -n        仅下载校验，不覆盖不重启（预演）
#
# 示例：
#   update-dbip.sh                          # 下载到脚本当前目录
#   update-dbip.sh -p /srv/geo/dbip-city-lite.mmdb -s blog
#   update-dbip.sh -n                       # 预演，仅下载校验
#
# crontab（每月 1 号 3 点，脚本放服务器某目录即可）：
#   0 3 1 * *  /path/to/update-dbip.sh -s blog >> /var/log/update-dbip.log 2>&1

set -euo pipefail

MMDB_PATH=""
SERVICE_NAME=""
YEAR_MONTH="$(date +%Y-%m)"
DRY_RUN=0

usage() {
  echo "用法: $0 [-p <mmdb路径>] [-s <服务名>] [-y <YYYY-MM>] [-n]"
  exit 1
}

while getopts "p:s:y:n" opt; do
  case "$opt" in
    p) MMDB_PATH="$OPTARG" ;;
    s) SERVICE_NAME="$OPTARG" ;;
    y) YEAR_MONTH="$OPTARG" ;;
    n) DRY_RUN=1 ;;
    *) usage ;;
  esac
done

# 未指定 -p 时，默认下载到脚本所在目录
if [ -z "${MMDB_PATH}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  MMDB_PATH="${SCRIPT_DIR}/dbip-city-lite.mmdb"
  echo "[$(date)] 未指定 -p，默认落地到脚本目录: ${MMDB_PATH}"
fi

TMP_DIR="/tmp/dbip-update-$$"

mkdir -p "${TMP_DIR}"

URL="https://download.db-ip.com/free/dbip-city-lite-${YEAR_MONTH}.mmdb.gz"
GZ="${TMP_DIR}/dbip-city-lite.mmdb.gz"
NEW="${TMP_DIR}/dbip-city-lite.mmdb"

echo "[$(date)] 开始更新 DB-IP City Lite (${YEAR_MONTH})"
echo "[$(date)] 下载: ${URL}"

curl -fsSL --retry 3 -o "${GZ}" "${URL}" || { echo "[$(date)] 下载失败"; rm -rf "${TMP_DIR}"; exit 1; }
gzip -df "${GZ}" || { echo "[$(date)] 解压失败"; rm -rf "${TMP_DIR}"; exit 1; }

# 校验为有效 MaxMind DB 文件（metadata marker: ab cd ef 在文件尾部附近）
if ! tail -c 512 "${NEW}" | grep -q $'\xab\xcd\xef'; then
  echo "[$(date)] 校验失败：文件不是有效的 MaxMind DB 格式，中止更新"
  rm -rf "${TMP_DIR}"
  exit 1
fi
echo "[$(date)] 校验通过，文件大小: $(du -h "${NEW}" | cut -f1)"

if [ "${DRY_RUN}" -eq 1 ]; then
  echo "[$(date)] 预演模式：跳过覆盖与重启。新库: ${NEW}"
  rm -rf "${TMP_DIR}"
  exit 0
fi

# 覆盖目标文件（先备份旧的）
if [ -f "${MMDB_PATH}" ]; then
  cp -f "${MMDB_PATH}" "${MMDB_PATH}.bak.$(date +%Y%m%d)"
fi
mv -f "${NEW}" "${MMDB_PATH}"
echo "[$(date)] 已覆盖: ${MMDB_PATH}"

# 重启后端以重新加载新库（未指定服务名则跳过）
if [ -n "${SERVICE_NAME}" ]; then
  echo "[$(date)] 重启服务: ${SERVICE_NAME}"
  sudo systemctl restart "${SERVICE_NAME}"
fi

rm -rf "${TMP_DIR}"
echo "[$(date)] 更新完成"