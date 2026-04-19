/**
 * Live2D Widget 类型定义
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'trace';

export interface TimeConfig {
  hour: string;
  text: string;
}

export interface MessageConfig {
  default: string[];
  console: string;
  copy: string;
  visibilitychange: string;
  changeSuccess: string;
  changeFail: string;
  photo: string;
  goodbye: string;
  hitokoto: string;
  welcome: string;
  referrer: string;
  hoverBody: string | string[];
  tapBody: string | string[];
}

export interface MouseEventConfig {
  selector: string;
  text: string | string[];
}

export interface SeasonConfig {
  date: string;
  text: string | string[];
}

export interface ModelInfo {
  name: string;
  paths: string[];
  message: string;
}

export interface TipsConfig {
  message: MessageConfig;
  time: TimeConfig[];
  mouseover: MouseEventConfig[];
  click: MouseEventConfig[];
  seasons: SeasonConfig[];
  models: ModelInfo[];
}

export interface ModelListCDN {
  messages: string[];
  models: string[] | string[][];
}

export interface Live2DConfig {
  waifuPath?: string;
  apiPath?: string;
  cdnPath?: string;
  cubism2Path?: string;
  cubism5Path?: string;
  modelId?: number;
  tools?: string[];
  drag?: boolean;
  logLevel?: LogLevel;
  models?: ModelInfo[];
}

export interface ToolItem {
  icon: React.ReactNode;
  callback: () => void;
}

export interface Tools {
  [key: string]: ToolItem;
}
