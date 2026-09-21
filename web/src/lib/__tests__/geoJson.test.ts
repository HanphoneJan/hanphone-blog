import { describe, it, expect } from 'vitest'
import { processGeoJson } from '@/lib/geoJson'

describe('processGeoJson', () => {
  it('跳过空坐标环，避免产生 NaN 导致地图崩溃', () => {
    // 复现 world.json 中 China 的空环（南海诸岛）结构
    const geoJson = {
      features: [
        {
          type: 'Feature',
          properties: { name: 'China' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
              [], // 空环
            ],
          },
        },
      ],
    }

    const result = processGeoJson(geoJson)
    // 边界缩放应为有限值
    expect(Number.isFinite(result.encodeOffsets.scale)).toBe(true)
    // 坐标无 NaN
    const chinaCoords = result.features[0].geometry.coordinates
    const flat: number[] = JSON.parse(JSON.stringify(chinaCoords)).flat(Infinity)
    expect(flat.every((n) => Number.isFinite(n))).toBe(true)
  })

  it('保留正常坐标环', () => {
    const geoJson = {
      features: [
        {
          type: 'Feature',
          properties: { name: 'A' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [0, 10], [0, 0]]],
          },
        },
      ],
    }
    const result = processGeoJson(geoJson)
    expect(result.features[0].geometry.coordinates.length).toBe(1)
    expect(Number.isFinite(result.encodeOffsets.scale)).toBe(true)
  })
})