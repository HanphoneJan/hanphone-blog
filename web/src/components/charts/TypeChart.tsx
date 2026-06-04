'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as echarts from 'echarts';
import { ENDPOINTS } from "@/lib/api";
import apiClient from '@/lib/utils'; // 导入axios实例
import { useTheme } from '@/contexts/ThemeProvider';
import { CHART_COLORS, CHART_TOOLTIP_THEMES, CHART_CONFIG, API_CODE, TIME } from '@/lib/constants';
import { CHART_OTHERS_LABEL } from '@/lib/labels';

// 定义类型接口
interface TypeItem {
  name: string;
  blogs: { length: number }[];
}

interface ChartData {
  name: string;
  value: number;
}

interface TypeProps {
  style?: React.CSSProperties;
}

const Type: React.FC<TypeProps> = ({ style }) => {
  const { theme } = useTheme()
  // DOM引用
  const typeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [typeList, setTypeList] = useState<TypeItem[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [loading, setLoading] = useState(true);

  // 根据主题获取颜色方案
  const getColorMap = () => {
    switch (theme) {
      case 'light':
        return CHART_COLORS.light
      case 'dark':
        return CHART_COLORS.dark
      case 'macaron':
        return CHART_COLORS.macaron
      case 'cyber':
        return CHART_COLORS.cyber
      default:
        return CHART_COLORS.light
    }
  }

  const colorMap = getColorMap()

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

  // 获取图表颜色配置
  const getThemeColors = () => {
    const themeKey = theme in CHART_TOOLTIP_THEMES ? theme : 'light'
    return CHART_TOOLTIP_THEMES[themeKey as keyof typeof CHART_TOOLTIP_THEMES]
  }

  // API调用函数（使用axios重构）
  const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      setLoading(true);
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined // GET请求参数放在params
      });

      setLoading(false);
      return response.data;
    } catch (error) {
      console.log(`Error fetching ${url}:`, error);
      setLoading(false);
      return { code: API_CODE.SERVER_ERROR, data: [] };
    }
  };

  // 屏幕适配 - 图表 resize
  const screenAdapter = () => {
    if (chartInstance && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;

      chartInstance.resize({
        width: containerWidth,
        height: containerHeight
      });
    }
  };

  // 比较函数 - 用于排序
  const compare = (property: keyof TypeItem) => {
    return (a: TypeItem, b: TypeItem) => {
      const value1 = Array.isArray(a[property])
        ? (a[property] as Array<{ length: number }>).length
        : 0;
      const value2 = Array.isArray(b[property])
        ? (b[property] as Array<{ length: number }>).length
        : 0;
      return value2 - value1;
    };
  };

  // 初始化图表（核心修改：检查并清除已存在的实例）
  const initChart = () => {
    if (!typeRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    // 关键修改：先检查并清除已存在的实例
    if (chartInstance) {
      chartInstance.dispose();
      setChartInstance(null);
    }

    // 检查DOM上是否有残留的实例并清除
    const existingInstance = echarts.getInstanceByDom(typeRef.current);
    if (existingInstance) {
      existingInstance.dispose();
    }

    // 设置容器尺寸
    typeRef.current.style.width = `${containerWidth}px`;
    typeRef.current.style.height = `${containerHeight}px`;

    // 初始化新实例
    const instance = echarts.init(typeRef.current);
    setChartInstance(instance);

    const themeColors = getThemeColors()

    const initOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b} : {c} ({d}%)',
        padding: [5, 10],
        backgroundColor: themeColors.tooltipBg,
        borderColor: themeColors.tooltipBorder,
        borderWidth: 1,
        textStyle: {
          color: themeColors.tooltipText
        }
      },
      // 删除了图例配置
      series: [
        {
          name: '分类',
          type: 'pie',
          roseType: 'radius',
          radius: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? ['15%', '55%'] : ['15%', '80%'],
          center: ['50%', containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? '40%' : '50%'], // 调整中心位置，因为删除了图例
          data: [],
          itemStyle: {
            color: (params: any) => colorMap[params.dataIndex % colorMap.length],
            borderColor: themeColors.itemBorder,
            borderWidth: 1
          },
          animationDuration: CHART_CONFIG.ANIMATION_DURATION,
          animationEasing: CHART_CONFIG.ANIMATION_EASING,
          label: {
            position: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? 'outer' : 'inner',
            alignTo: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? 'edge' : undefined,
            // 使用edgeDistance替代margin，解决deprecated警告
            edgeDistance: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? 12 : 8,
            // 移除textStyle层级，解决deprecated警告
            fontSize: CHART_CONFIG.SMALL_FONT_SIZE
          }
        }
      ]
    };

    instance.setOption(initOption);
  };

  // 更新图表数据
  const updateChart = () => {
    if (!chartInstance || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const themeColors = getThemeColors()

    chartInstance.setOption({
      // 删除了图例配置
      series: [
        {
          data: chartData,
          radius: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? ['15%', '55%'] : ['15%', '80%'],
          center: ['50%', containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? '40%' : '50%'],
          label: {
            position: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? 'outer' : 'inner',
            alignTo: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? 'edge' : undefined,
            edgeDistance: containerWidth < CHART_CONFIG.SMALL_SCREEN_BREAKPOINT ? 12 : 8,
            fontSize: CHART_CONFIG.SMALL_FONT_SIZE
          },
          itemStyle: {
            color: (params: any) => colorMap[params.dataIndex % colorMap.length],
            borderColor: themeColors.itemBorder,
            borderWidth: 1
          }
        }
      ]
    });
  };

  // 获取数据并更新图表
  const fetchTypeData = async () => {
    const res = await fetchData(ENDPOINTS.ADMIN.FULL_TYPE_LIST);
    if (res.code === API_CODE.SUCCESS) {
      const resData = res.data as TypeItem[];
      const sortedList = resData.sort(compare('blogs'));
      setTypeList(sortedList);

      const maxCategories = CHART_CONFIG.MAX_CATEGORIES_DISPLAY;
      const processedData = sortedList.slice(0, maxCategories).map(item => ({
        name: item.name,
        value: item.blogs.length
      }));

      const othersValue = sortedList.slice(maxCategories).reduce(
        (sum, item) => sum + item.blogs.length,
        0
      );
      processedData.push({ name: CHART_OTHERS_LABEL, value: othersValue });

      setChartData(processedData);
      updateChart();
    } else {
      console.log('获取分类数据失败');
    }
  };

  // 组件挂载时初始化
  useEffect(() => {
    initChart();
    fetchTypeData();

    // 监听窗口大小变化（优化：只在resize时更新尺寸，避免重新初始化）
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        screenAdapter();
        // 关键修改：resize时不再重新初始化，只更新配置
        updateChart();
      }, TIME.DEBOUNCE_DELAY);
    };

    window.addEventListener('resize', debouncedResize);

    // 清理函数：确保组件卸载时销毁实例
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (chartInstance) {
        chartInstance.dispose();
        setChartInstance(null);
      }
    };
  }, [theme]);

  // 数据变化时更新图表
  useEffect(() => {
    if (chartData.length > 0) {
      updateChart();
    }
  }, [chartData, theme]);

  return (
    <div ref={containerRef} style={style} className="relative w-full h-full">
      <div ref={typeRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--overlay))]/0.6 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary))]"></div>
        </div>
      )}
    </div>
  );
};

export default Type;