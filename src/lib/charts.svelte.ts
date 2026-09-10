import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { Attachment } from 'svelte/attachments';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export interface ChartColors {
	bar: string;
	axisLine: string;
	axisLabel: string;
	splitLine: string;
}

export const LIGHT_COLORS: ChartColors = {
	bar: '#b7410e',
	axisLine: '#d1d5db',
	axisLabel: '#4b5563',
	splitLine: '#e5e7eb'
};

export const DARK_COLORS: ChartColors = {
	bar: '#dd7d51',
	axisLine: '#4b5563',
	axisLabel: '#9ca3af',
	splitLine: '#374151'
};

export interface TallyRow {
	label: string;
	count: number;
}

export function chart(getOption: () => EChartsCoreOption): Attachment<HTMLDivElement> {
	return (element) => {
		const instance = echarts.init(element);
		const observer = new ResizeObserver(() => instance.resize());
		observer.observe(element);
		$effect(() => {
			instance.setOption(getOption());
		});
		return () => {
			observer.disconnect();
			instance.dispose();
		};
	};
}

function truncateLabel(label: string): string {
	const maxChars = 22;
	return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

export function buildYearOption(rows: TallyRow[], colors: ChartColors): EChartsCoreOption {
	return {
		animation: false,
		tooltip: { trigger: 'axis' },
		grid: { left: 8, right: 8, top: 16, bottom: 0, containLabel: true },
		xAxis: {
			type: 'category',
			data: rows.map((r) => r.label),
			axisLine: { lineStyle: { color: colors.axisLine } },
			axisTick: { show: false },
			axisLabel: { color: colors.axisLabel }
		},
		yAxis: {
			type: 'value',
			minInterval: 1,
			axisLabel: { color: colors.axisLabel },
			splitLine: { lineStyle: { color: colors.splitLine } }
		},
		series: [
			{
				name: 'Papers',
				type: 'bar',
				data: rows.map((r) => r.count),
				barMaxWidth: 24,
				itemStyle: { color: colors.bar, borderRadius: [3, 3, 0, 0] }
			}
		]
	};
}

export function buildHorizontalOption(rows: TallyRow[], colors: ChartColors): EChartsCoreOption {
	return {
		animation: false,
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			formatter: (params: { name: string; value: number }[]) =>
				params.length ? `${params[0].name}<br/>Papers: ${params[0].value}` : ''
		},
		grid: { left: 8, right: 20, top: 8, bottom: 0, containLabel: true },
		xAxis: {
			type: 'value',
			minInterval: 1,
			axisLabel: { color: colors.axisLabel },
			splitLine: { lineStyle: { color: colors.splitLine } }
		},
		yAxis: {
			type: 'category',
			inverse: true,
			data: rows.map((r) => r.label),
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: {
				color: colors.axisLabel,
				fontSize: 12,
				interval: 0,
				formatter: (label: string) => truncateLabel(label)
			}
		},
		series: [
			{
				name: 'Papers',
				type: 'bar',
				data: rows.map((r) => r.count),
				barMaxWidth: 16,
				itemStyle: { color: colors.bar, borderRadius: [0, 3, 3, 0] }
			}
		]
	};
}
