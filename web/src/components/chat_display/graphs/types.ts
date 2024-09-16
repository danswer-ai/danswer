export interface Data {
  title: string;
}

export interface PlotData extends Data {
  data: Array<{
    x: number[];
    y: number[];
    label: string;
    color: string;
  }>;
  xlabel: string;
  ylabel: string;
}

export interface ChartDataPoint {
  x: number;
  y: number;
}
export interface PolarPlotData extends Data {
  data: Array<{
    theta: number[];
    r: number[];
    label: string;
    color: string;
  }>;
  rmax: number;
  rticks: number[];
  rlabel_position: number;
}

export interface PolarChartDataPoint {
  angle: number;
  radius: number;
}

export type ChartType = "line" | "bar" | "radial" | "other";
