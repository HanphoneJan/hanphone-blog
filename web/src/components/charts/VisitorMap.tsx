'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import chinaJson from '@/assets/china.json';
import { ENDPOINTS } from "@/lib/api";
import apiClient from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeProvider';

import { API_CODE } from '@/lib/constants'
// 定义用户数据类型
interface UserData {
  loginProvince: string;
  avatar: string;
  nickname: string;
  // 其他可能的用户属性
}

// 定义地图数据类型
interface MapDataItem {
  name: string;
  value: number;
  users: UserData[];
}

interface VisitorMapProps {
  style?: React.CSSProperties;
}

// 手动实现GeoJSON预处理函数，生成encodeOffsets
const processGeoJson = (geoJson: any) => {
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
          coords.forEach((coord, index) => {
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

const VisitorMap: React.FC<VisitorMapProps> = ({ style }) => {
  const { theme } = useTheme()
  const visitRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [allData, setAllData] = useState<MapDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 根据主题获取配色方案
  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        // 白日主题配色
        return {
          backgroundColor: 'transparent',
          areaColor: 'rgba(248, 250, 252, 0.8)',
          borderColor: 'rgba(100, 116, 139, 0.5)',
          emphasisAreaColor: 'rgba(59, 130, 246, 0.3)',
          emphasisShadowColor: 'rgba(59, 130, 246, 0.3)',
          labelColor: '#475569',
          legendColor: '#475569',
          visualMapColor: '#475569',
          tooltipBg: 'rgba(255, 255, 255, 0.9)',
          tooltipBorder: 'rgba(59, 130, 246, 0.5)',
          tooltipText: '#1e293b',
          pieces: [
            { gte: 50, label: '>= 50', color: '#dc2626' },
            { gte: 30, lte: 49, label: '30 - 49', color: '#ea580c' },
            { gte: 10, lte: 29, label: '10 - 29', color: '#2563eb' },
            { gte: 1, lte: 9, label: '1 - 9', color: '#16a34a' },
            { gte: 0, lte: 0, label: '0', value: 0, color: 'rgba(241, 245, 249, 0.5)' }
          ]
        };
      case 'dark':
        // 黑夜主题配色
        return {
          backgroundColor: 'transparent',
          areaColor: 'rgba(15, 23, 42, 0.8)',
          borderColor: 'rgba(148, 163, 184, 0.5)',
          emphasisAreaColor: 'rgba(59, 130, 246, 0.4)',
          emphasisShadowColor: 'rgba(59, 130, 246, 0.5)',
          labelColor: '#cbd5e1',
          legendColor: '#cbd5e1',
          visualMapColor: '#cbd5e1',
          tooltipBg: 'rgba(15, 23, 42, 0.9)',
          tooltipBorder: 'rgba(59, 130, 246, 0.5)',
          tooltipText: '#f8fafc',
          pieces: [
            { gte: 50, label: '>= 50', color: '#ff416c' },
            { gte: 30, lte: 49, label: '30 - 49', color: '#ff8c00' },
            { gte: 10, lte: 29, label: '10 - 29', color: '#38bdf8' },
            { gte: 1, lte: 9, label: '1 - 9', color: '#4ade80' },
            { gte: 0, lte: 0, label: '0', value: 0, color: 'rgba(30, 41, 59, 0.5)' }
          ]
        };
      case 'macaron':
        // 马卡龙主题配色
        return {
          backgroundColor: 'transparent',
          areaColor: 'rgba(255, 245, 250, 0.8)',
          borderColor: 'rgba(219, 39, 119, 0.3)',
          emphasisAreaColor: 'rgba(219, 39, 119, 0.3)',
          emphasisShadowColor: 'rgba(219, 39, 119, 0.4)',
          labelColor: '#762995',
          legendColor: '#762995',
          visualMapColor: '#762995',
          tooltipBg: 'rgba(255, 245, 250, 0.9)',
          tooltipBorder: 'rgba(219, 39, 119, 0.5)',
          tooltipText: '#4c1d95',
          pieces: [
            { gte: 50, label: '>= 50', color: '#dc2626' },
            { gte: 30, lte: 49, label: '30 - 49', color: '#ec4899' },
            { gte: 10, lte: 29, label: '10 - 29', color: '#f472b6' },
            { gte: 1, lte: 9, label: '1 - 9', color: '#a855f7' },
            { gte: 0, lte: 0, label: '0', value: 0, color: 'rgba(255, 240, 245, 0.5)' }
          ]
        };
      case 'cyber':
        // 赛博朋克主题配色
        return {
          backgroundColor: 'transparent',
          areaColor: 'rgba(15, 25, 40, 0.8)',
          borderColor: 'rgba(34, 211, 238, 0.4)',
          emphasisAreaColor: 'rgba(34, 211, 238, 0.4)',
          emphasisShadowColor: 'rgba(34, 211, 238, 0.6)',
          labelColor: '#f1f5f9',
          legendColor: '#f1f5f9',
          visualMapColor: '#f1f5f9',
          tooltipBg: 'rgba(15, 25, 40, 0.9)',
          tooltipBorder: 'rgba(34, 211, 238, 0.5)',
          tooltipText: '#f1f5f9',
          pieces: [
            { gte: 50, label: '>= 50', color: '#f43f5e' },
            { gte: 30, lte: 49, label: '30 - 49', color: '#f97316' },
            { gte: 10, lte: 29, label: '10 - 29', color: '#06b6d4' },
            { gte: 1, lte: 9, label: '1 - 9', color: '#22d3ee' },
            { gte: 0, lte: 0, label: '0', value: 0, color: 'rgba(8, 10, 20, 0.5)' }
          ]
        };
      default:
        return {
          backgroundColor: 'transparent',
          areaColor: 'rgba(248, 250, 252, 0.8)',
          borderColor: 'rgba(100, 116, 139, 0.5)',
          emphasisAreaColor: 'rgba(59, 130, 246, 0.3)',
          emphasisShadowColor: 'rgba(59, 130, 246, 0.3)',
          labelColor: '#475569',
          legendColor: '#475569',
          visualMapColor: '#475569',
          tooltipBg: 'rgba(255, 255, 255, 0.9)',
          tooltipBorder: 'rgba(59, 130, 246, 0.5)',
          tooltipText: '#1e293b',
          pieces: [
            { gte: 50, label: '>= 50', color: '#dc2626' },
            { gte: 30, lte: 49, label: '30 - 49', color: '#ea580c' },
            { gte: 10, lte: 29, label: '10 - 29', color: '#2563eb' },
            { gte: 1, lte: 9, label: '1 - 9', color: '#16a34a' },
            { gte: 0, lte: 0, label: '0', value: 0, color: 'rgba(241, 245, 249, 0.5)' }
          ]
        };
    }
  };

  // 获取loading遮罩颜色
  const getLoadingColor = () => {
    switch (theme) {
      case 'light':
        return 'bg-white/50'
      case 'dark':
        return 'bg-slate-900/50'
      case 'macaron':
        return 'bg-pink-100/50'
      case 'cyber':
        return 'bg-slate-900/50'
      default:
        return 'bg-white/50'
    }
  }

  // API调用函数
  const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      setLoading(true);
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      });

      setLoading(false);
      return response.data;
    } catch (error) {
      console.log(`Error fetching ${url}:`, error);
      setLoading(false);
      return { code: 500, data: [] };
    }
  };

  // 初始化图表
  const initChart = () => {
    if (!visitRef.current) return;

    // 创建图表实例
    const instance = echarts.init(visitRef.current);
    setChartInstance(instance);

    // 使用预处理函数处理GeoJSON
    const processedChinaJson = processGeoJson(chinaJson);

    // 注册处理后的中国地图
    echarts.registerMap('china', processedChinaJson);

    // 获取当前主题配色
    const colors = getThemeColors();

    // 优化后的颜色配置
    const initOption: echarts.EChartsCoreOption = {
      backgroundColor: colors.backgroundColor,

      geo: {
        type: 'map',
        roam: true,
        map: 'china',
        itemStyle: {
          // 基础区域颜色
          areaColor: colors.areaColor,
          // 边框颜色
          borderColor: colors.borderColor,
          borderWidth: 1.5  // 增加边框宽度提升清晰度
        },
        emphasis: {
          itemStyle: {
            // 高亮区域颜色
            areaColor: colors.emphasisAreaColor,
            shadowBlur: 10,  // 增加阴影效果增强选中状态
            shadowColor: colors.emphasisShadowColor
          }
        },
        label: {
          // 省份名称颜色
          color: colors.labelColor,
          fontSize: 12  // 适当增大字体
        }
      },
      tooltip: {
        trigger: 'item',
        padding: [5, 10],
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        textStyle: {
          color: colors.tooltipText
        },
        formatter: function (params: any) {
          let html = `<div class="font-medium mb-1">${params.name}</div>`;
          if (!params.data) return html;

          if (Array.isArray(params.data.users)) {
            params.data.users.forEach((user: UserData) => {
              html += `<div style="display: flex; align-items: center; margin: 3px 0">
                        <img style="width: 18px; border-radius: 50%" src="${user.avatar}" alt="${user.nickname}"/>
                        <span style="font-size: x-small; margin-left: 5px; color: ${colors.tooltipText}">${user.nickname}</span>
                      </div>`;
            });
          }
          return html;
        }
      },
      legend: {
        left: '5%',
        bottom: '5%',
        orient: 'vertical',
        textStyle: {
          color: colors.legendColor
        }
      },
      visualMap: {
        itemWidth: 4,
        min: 0,
        max: 50,
        hoverLink: false,
        textStyle: {
          color: colors.visualMapColor
        },
        // 使用主题适配的颜色梯度
        pieces: colors.pieces
      },
      series: [
        {
          type: 'map',
          geoIndex: 0,
          data: [],
          animationDuration: 2800,
          animationEasing: 'cubicInOut'
        }
      ]
    };

    instance.setOption(initOption);
  };

  // 获取用户数据
  const fetchUserData = async () => {
    const res = await fetchData(ENDPOINTS.ADMIN.USER_AREA_LIST);

    if (res?.code === API_CODE.SUCCESS && Array.isArray(res.data)) {
      const provinceMap: Record<string, UserData[]> = {};

      res.data.forEach((item: UserData) => {
        if (item?.loginProvince) {
          if (!provinceMap[item.loginProvince]) {
            provinceMap[item.loginProvince] = [];
          }
          provinceMap[item.loginProvince].push(item);
        }
      });

      const mapData: MapDataItem[] = Object.entries(provinceMap).map(([province, users]) => ({
        name: province,
        value: users.length,
        users
      }));

      setAllData(mapData);
    } else {
      console.log('获取用户数据错误或数据格式不正确!');
      setAllData([]);
    }
  };

  // 更新图表数据
  const updateChart = () => {
    if (chartInstance) {
      chartInstance.setOption({
        series: [
          {
            data: allData || []
          }
        ]
      });
    }
  };

  // 屏幕适配
  const screenAdapter = () => {
    chartInstance?.resize();
  };

  // 主题变化时重新初始化图表
  useEffect(() => {
    if (chartInstance) {
      chartInstance.dispose();
    }
    initChart();
    updateChart();
  }, [theme]);

  // 组件挂载时初始化
  useEffect(() => {
    initChart();
    fetchUserData();

    const handleResize = () => screenAdapter();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance?.dispose();
    };
  }, []);

  // 数据更新时更新图表
  useEffect(() => {
    if (allData && allData.length > 0) {
      updateChart();
    }
  }, [allData, theme]);

  return (
    <div style={style} className="relative">
      <div
        ref={visitRef}
        className="w-full h-full"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--overlay))]/0.6 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary))]"></div>
        </div>
      )}
    </div>
  );
};

export default VisitorMap;