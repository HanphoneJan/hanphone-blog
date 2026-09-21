// 手动实现GeoJSON预处理函数，生成encodeOffsets（原样迁移自 VisitorMap.tsx）
export const processGeoJson = (geoJson: any) => {
  if (!geoJson?.features) return geoJson;

  // 计算边界
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // 遍历所有坐标点计算边界
  const traverseCoordinates = (coords: any[]) => {
    if (Array.isArray(coords)) {
      coords.forEach((coord) => {
        if (Array.isArray(coord[0])) {
          traverseCoordinates(coord);
        } else {
          const x = coord[0];
          const y = coord[1];
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      });
    }
  };

  // 处理每个要素
  geoJson.features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.coordinates) {
      traverseCoordinates(feature.geometry.coordinates);
    }
  });

  // 计算偏移量和缩放比例
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height);

  // 为每个要素添加encodeOffsets
  geoJson.features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.coordinates) {
      feature.geometry.encodeOffsets = [];
      const encodeOffsets = feature.geometry.encodeOffsets;

      // 处理坐标
      const processCoord = (coords: any[], isMulti: boolean = false) => {
        const result: any[] = [];
        if (Array.isArray(coords)) {
          coords.forEach((coord) => {
            if (Array.isArray(coord[0])) {
              result.push(processCoord(coord, true));
              if (isMulti) {
                encodeOffsets.push([
                  Math.round((cx) / scale * 1024),
                  Math.round((cy) / scale * 1024)
                ]);
              }
            } else {
              const x = coord[0];
              const y = coord[1];
              result.push([
                Math.round((x - cx) / scale * 1024),
                Math.round((y - cy) / scale * 1024)
              ]);
            }
          });
        }
        return result;
      };

      feature.geometry.coordinates = processCoord(feature.geometry.coordinates);
    }
  });

  // 添加坐标系信息
  geoJson.encodeOffsets = {
    cx: Math.round(cx / scale * 1024),
    cy: Math.round(cy / scale * 1024),
    scale: Math.round(scale / 1024 * 1024)
  };

  return geoJson;
};