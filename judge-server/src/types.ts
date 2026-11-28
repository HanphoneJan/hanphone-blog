export type Verdict =
  | 'AC'
  | 'WA'
  | 'TLE'
  | 'MLE'
  | 'RE'
  | 'CE'
  | 'OLE'
  | 'IE';

export type JudgeMode = 'stdin' | 'function' | 'script';

export interface TestFlags {
  orderAgnostic?: boolean;
  multiAnswer?: boolean;
  textCompare?: boolean;
}

export interface TestCase {
  /** 1-based test point number */
  seq: number;
  /** stdin mode */
  stdin?: string;
  /** function mode: Python literal source for each positional argument */
  args?: string[];
  /** Expected value, normalized to text */
  expected: string;
  flags?: TestFlags;
}

export interface ProblemMeta {
  id: string;
  title: string;
  platform: string;
  url?: string;
  mode: JudgeMode;
  entry?: string;
  languages: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  compare: 'text' | 'json' | 'float' | 'unordered';
  /** ML 题专用：把 numpy 2.x 的 np.float64(1.0) 归一成 1.0 再比较 */
  numpyRepr?: boolean;
  activeTestCount: number;
  fullTestCount: number;
  provenance?: Record<string, unknown>;
}

export interface LoadedProblem {
  meta: ProblemMeta;
  /** Active tests in seq order */
  tests: TestCase[];
  /** Function/script mode harness source */
  harness?: string;
}

export interface GoJudgeFile {
  content?: string;
  name?: string;
  max?: number;
  fileId?: string;
}

export interface GoJudgeCmd {
  args: string[];
  env?: string[];
  files?: Array<GoJudgeFile | null>;
  cpuLimit?: number;
  clockLimit?: number;
  memoryLimit?: number;
  stackLimit?: number;
  procLimit?: number;
  copyIn?: Record<string, {content?: string; fileId?: string}>;
  copyOut?: string[];
  copyOutCached?: string[];
  copyOutDir?: string;
}

export interface GoJudgeRequest {
  cmd: GoJudgeCmd[];
  pipeMapping?: unknown[];
}

export interface GoJudgeResult {
  status: string;
  exitStatus?: number;
  error?: string;
  time?: number;
  runTime?: number;
  memory?: number;
  procPeak?: number;
  files?: Record<string, string>;
  fileIds?: Record<string, string>;
}

export interface CaseResult {
  seq: number;
  verdict: Verdict;
  timeMs: number;
  memoryKb: number;
  message?: string;
  inputExcerpt?: string;
  expectedExcerpt?: string;
  actualExcerpt?: string;
}
