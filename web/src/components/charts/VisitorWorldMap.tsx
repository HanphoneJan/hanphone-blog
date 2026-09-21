'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import worldJson from '@/assets/world.json';
import { ENDPOINTS } from "@/lib/api";
import apiClient from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeProvider';
import { API_CODE } from '@/lib/constants';
import { toZhCountry } from '@/lib/countryZh';

interface WorldArea { name: string; visitorCount: number; totalVisits: number; }

interface VisitorWorldMapProps { style?: React.CSSProperties; refreshKey?: number; }

const VisitorWorldMap: React.FC<VisitorWorldMapProps> = ({ style, refreshKey = 0 }) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<echarts.ECharts | null>(null);
  const [data, setData] = useState<WorldArea[]>([]);
  const [loading, setLoading] = useState(true);

  const getThemeColors = () => {
    const base = {
      light: { bg: 'transparent', border: 'rgba(100,116,139,0.5)', label: '#475569', tooltipBg: 'rgba(255,255,255,0.9)', tooltipText: '#1e293b' },
      dark: { bg: 'transparent', border: 'rgba(148,163,184,0.5)', label: '#cbd5e1', tooltipBg: 'rgba(15,23,42,0.9)', tooltipText: '#f8fafc' },
      macaron: { bg: 'transparent', border: 'rgba(219,39,119,0.3)', label: '#762995', tooltipBg: 'rgba(255,245,250,0.9)', tooltipText: '#4c1d95' },
      cyber: { bg: 'transparent', border: 'rgba(34,211,238,0.4)', label: '#f1f5f9', tooltipBg: 'rgba(15,25,40,0.9)', tooltipText: '#f1f5f9' },
    } as const;
    return base[theme as keyof typeof base] ?? base.light;
  };

  // 纯 option 构造，供初次初始化与主题切换复用
  const buildOption = () => {
    const c = getThemeColors();
    return {
      backgroundColor: c.bg,
      tooltip: {
        trigger: 'item',
        backgroundColor: c.tooltipBg,
        borderColor: c.border,
        textStyle: { color: c.tooltipText },
        formatter: (p: any) => {
          const d = p.data as WorldArea | undefined;
          if (!d) return p.name ? toZhCountry(String(p.name)) : '';
          return `<div style="font-weight:600">${toZhCountry(d.name)}</div>访客IP数: ${d.visitorCount ?? 0}<br/>访问次数: ${d.totalVisits ?? 0}`;
        },
      },
      visualMap: { min: 0, max: 50, hoverLink: false, textStyle: { color: c.label }, inRange: { color: ['#e0e7ff', '#818cf8', '#4338ca'] } },
      series: [{
        type: 'map',
        map: 'world',
        roam: true,
        data: data.map((d) => ({ name: d.name, value: d.visitorCount, ...d })),
        animationDuration: 2800,
        animationEasing: 'cubicInOut',
      }],
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(ENDPOINTS.ADMIN.VISITOR_AREA_LIST);
      setLoading(false);
      if (res.data?.code === API_CODE.SUCCESS && Array.isArray(res.data.data)) {
        const list: WorldArea[] = res.data.data.map((r: any) => ({
          name: r.name, visitorCount: r.visitorCount, totalVisits: r.totalVisits,
        }));
        setData(list);
      } else {
        setData([]);
      }
    } catch {
      setLoading(false);
      setData([]);
    }
  };

  // 初始化 + 主题变化重建（与 VisitorMap 一致）
  useEffect(() => {
    if (!ref.current) return;
    // world.json 为标准 GeoJSON，ECharts registerMap 原生支持，无需手动预编码
    echarts.registerMap('world', worldJson as any);
    const instance = echarts.init(ref.current);
    instance.setOption(buildOption());
    setChart(instance);
    const onResize = () => instance.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      instance.dispose();
      setChart(null);
    };
  }, [theme]);

  // 数据更新时刷新 series
  useEffect(() => {
    if (chart) {
      chart.setOption({ series: [buildOption().series[0]] });
    }
  }, [data, chart]);

  useEffect(() => { fetchData(); }, [refreshKey]);

  return (
    <div style={style} className="relative">
      <div ref={ref} className="w-full h-full" />
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--overlay))]/0.6 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary))]" />
      </div>}
    </div>
  );
};

export default VisitorWorldMap;