/**
 * 期望值比较。移植自 HanphoneJan.github.io 的 src/components/training/pyrunner/compare.ts；
 * 两边改判定口径时必须同步，并跑 judge-server/test/compare.test.ts。
 */

/**
 * 期望值比较。纯函数，单独成文件是为了能被 scripts/test-pysnippets.ts 直接测。
 *
 * （原先它和 React 组件挤在一个文件里，没法脱离浏览器验证。）
 */

/**
 * 比较实际值与期望值。
 *
 * ## 为什么不能直接字符串相等
 *
 * 题解里的期望值有多种写法，直接比必然误判：
 * - `2.00000`（力扣的浮点格式）vs Python 的 `2.0`
 * - `[0,1]`（无空格）vs `json.dumps` 产出的 `[0, 1]`
 * - `["ad","ae"]` vs `'["ad", "ae"]'`
 *
 * 所以按「结构化比较 → 去引号 → 数值容差 → 字符串」逐级降级。
 */
export function compare(
  actual: string,
  expected: string,
  opts: {orderAgnostic?: boolean; multiAnswer?: boolean} = {},
): {ok: boolean; reason?: string} {
  const a = actual.trim();
  const e = expected.trim();
  if (a === e) {
    return {ok: true};
  }

  // 1) 双方都是合法 JSON -> 结构化深比较
  const aj = tryJson(a);
  const ej = tryJson(e);
  /**
   * JSON 双方不等时**不要就地返回**，记下理由继续往下走。
   *
   * 早先在 step 1 里直接 return，于是 step 2 那几条「一边带引号一边不带」
   * 永远没机会执行 —— 而 HJ11 数字颠倒第二组正好需要它：
   * 题面写 `输出 0`，题解返回的是字符串 `"0"`。
   * 表现是「✗ 内容不符：期望 0，实际 "0"」，挂在一个**完全正确**的题解下面。
   */
  let jsonReason: string | undefined;
  if (aj.ok && ej.ok) {
    if (deepEqual(aj.value, ej.value)) {
      return {ok: true};
    }
    // 题面明说「可以按任意顺序返回」时，按多重集比。
    //
    // 0049 的期望值是 [["bat"],["nat","tan"],["ate","eat","tea"]]，
    // 而按字典序分组的实现给出 [["eat","tea","ate"],["tan","nat"],["bat"]] ——
    // 元素集合完全一样，只是顺序不同，力扣的评测也是这么算过的。
    // 顺序敏感时老老实实按序比，否则 0056 那种「区间必须有序」的题会漏判。
    if (opts.orderAgnostic && deepEqual(canon(aj.value), canon(ej.value))) {
      return {ok: true};
    }
    // 一边是「序列化的树」时，比较的是树本身（0297）
    if (sameTree(aj.value, ej.value)) {
      return {ok: true};
    }
    // 题面承认「答案不唯一」时，只比节点值的集合（0108）
    if (opts.multiAnswer && sameNodeValues(aj.value, ej.value)) {
      return {ok: true};
    }
    jsonReason = `内容不符：期望 ${JSON.stringify(ej.value)}，实际 ${JSON.stringify(aj.value)}`;
  }

  if (ej.ok && typeof ej.value === 'string' && ej.value === a) {
    return {ok: true};
  }
  if (aj.ok && typeof aj.value === 'string' && aj.value === e) {
    return {ok: true};
  }
  // 2b) 一边是「数字的字符串」、另一边是那个数字
  //
  // HJ11 数字颠倒的第二组样例是「输入 0 / 输出 0」，而题解的入口签名是
  // `reverse_number(num_str: str) -> str` —— 返回值是**字符串** `"0"`，
  // 题面写的却是裸的 `0`。判失败的话读者看到的是「✗ 内容不符：期望 0，实际 "0"」，
  // 而代码一个字都没错。
  //
  // 只认「字符串正好是那个数字的十进制写法」这一种形态：
  // `"0"` vs `0`、`"42"` vs `42` 判过，`"0"` vs `1` 照常判失败。
  if (
    aj.ok &&
    typeof aj.value === 'string' &&
    ej.ok &&
    typeof ej.value === 'number' &&
    String(ej.value) === aj.value
  ) {
    return {ok: true};
  }
  if (
    ej.ok &&
    typeof ej.value === 'string' &&
    aj.ok &&
    typeof aj.value === 'number' &&
    String(aj.value) === ej.value
  ) {
    return {ok: true};
  }

  // 3) 布尔：Python 的 str(True) 是 `True`，题面写的是 `true`
  //
  // 文本模式下返回值按 str() 序列化，HJ67 的 `can_reach_24` 返回 True，
  // 期望值却是题面抄来的 `true`。两边都不是合法 JSON（上面的分支进不来），
  // Number('True') 又是 NaN —— 不加这条就判失败，而代码是对的。
  if (/^(true|false)$/i.test(a) && /^(true|false)$/i.test(e)) {
    return a.toLowerCase() === e.toLowerCase()
      ? {ok: true}
      : {ok: false, reason: `布尔值不符：期望 ${e}，实际 ${a}`};
  }

  // 4) 数值容差（中位数这类会写成 2.00000）
  const an = Number(a);
  const en = Number(e);
  if (Number.isFinite(an) && Number.isFinite(en)) {
    return Math.abs(an - en) < 1e-6
      ? {ok: true}
      : {ok: false, reason: jsonReason ?? `数值不符：期望 ${en}，实际 ${an}`};
  }

  return {ok: false, reason: jsonReason ?? `期望 ${e}，实际 ${a}`};
}

export function tryJson(s: string): {ok: true; value: unknown} | {ok: false} {
  if (!s || !/^[[{"]|^-?\d|^true$|^false$|^null$/.test(s.trim())) {
    return {ok: false};
  }
  try {
    return {ok: true, value: JSON.parse(s)};
  } catch {
    return {ok: false};
  }
}

/**
 * 抹平顺序：数组按「规范化后的 JSON 文本」排序，递归处理。
 *
 * 只在题面明说「任意顺序」时用（见 compare 的 opts.orderAgnostic）。
 * 对象按键名排序，省得同一份数据因为字面量书写顺序不同而判成不等。
 */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) {
    return v
      .map(canon)
      .sort((x, y) => (JSON.stringify(x) < JSON.stringify(y) ? -1 : 1));
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      out[k] = canon((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/**
 * 把「带 null 的节点序列」解析出来：支持 `[1,2,null]` 与 `1,2,null` 两种写法。
 * 力扣的序列化结果有的带方括号有的不带，题解里两种都出现过。
 */
function parseNodeSeq(v: unknown): Array<number | null> | null {
  if (typeof v === 'string') {
    const t = v.trim().replace(/^\[|\]$/g, '');
    if (t === '') {
      return [];
    }
    const items = t.split(',').map((x) => x.trim());
    if (
      !items.every(
        (x) => x === 'null' || x === 'None' || /^-?\d+(\.\d+)?$/.test(x),
      )
    ) {
      return null;
    }
    return items.map((x) =>
      x === 'null' || x === 'None' ? null : Number(x),
    );
  }
  if (!Array.isArray(v)) {
    return null;
  }
  // 已经是层序数组（题面里的期望值都是这个形态）
  if (v.every((x) => x === null || typeof x === 'number')) {
    return v as Array<number | null>;
  }
  return null;
}

type Tree = {v: number; l: Tree | null; r: Tree | null} | null;

/** 按前序 + null 占位重建（DFS 序列化的形态） */
function buildPreorder(seq: Array<number | null>): Tree {
  let i = 0;
  const step = (): Tree => {
    if (i >= seq.length) {
      return null;
    }
    const x = seq[i++];
    if (x === null) {
      return null;
    }
    return {v: x, l: step(), r: step()};
  };
  return step();
}

/** 按层序 + null 占位重建（题面里的形态） */
function buildLevel(seq: Array<number | null>): Tree {
  if (!seq.length || seq[0] === null) {
    return null;
  }
  const root: NonNullable<Tree> = {v: seq[0], l: null, r: null};
  const queue: Array<{node: NonNullable<Tree>; slot: 'l' | 'r'}> = [
    {node: root, slot: 'l'},
    {node: root, slot: 'r'},
  ];
  for (let i = 1; i < seq.length && queue.length; i++) {
    const x = seq[i];
    const slot = queue.shift()!;
    if (x === null) {
      continue;
    }
    const child: NonNullable<Tree> = {v: x, l: null, r: null};
    slot.node[slot.slot] = child;
    queue.push({node: child, slot: 'l'}, {node: child, slot: 'r'});
  }
  return root;
}

/** 层序输出，末尾多余的 null 去掉（与力扣题面的写法一致） */
function encodeLevel(t: Tree): Array<number | null> {
  if (t === null) {
    return [];
  }
  const out: Array<number | null> = [t.v];
  const queue: Array<NonNullable<Tree>> = [t];
  while (queue.length) {
    const n = queue.shift()!;
    for (const c of [n.l, n.r]) {
      out.push(c === null ? null : c.v);
      if (c !== null) {
        queue.push(c);
      }
    }
  }
  while (out.length && out[out.length - 1] === null) {
    out.pop();
  }
  return out;
}

/**
 * 两边的**节点值集合**是否一样（忽略 null 与形状）。
 *
 * 0108 的示例写着「[0,-10,5,null,-3,null,9] 也将被视为正确答案」，可按中序
 * 建出来的树几乎必然与示例那棵形状不同 —— 只比形状的话必然判失败。
 *
 * 只在题面自己承认「答案不唯一」时用（见 PySample.multiAnswer）。
 */
function sameNodeValues(a: unknown, b: unknown): boolean {
  const as = parseNodeSeq(a);
  const bs = parseNodeSeq(b);
  if (!as || !bs) {
    return false;
  }
  const key = (seq: Array<number | null>): string =>
    JSON.stringify(seq.filter((x) => x !== null).sort((p, q) => p - q));
  return key(as) === key(bs);
}

/**
 * 两边描述的是不是同一棵二叉树。
 *
 * 0297 的期望值是层序 `[1,2,3,null,null,4,5]`，而题解里的 DFS 序列化输出的是
 * 前序 `"1,2,null,null,3,4,null,null,5"`：顺序完全不同、末尾 null 的个数也不同，
 * 可它们描述的是同一棵树。力扣的评测也是先反序列化再比树的。
 *
 * 做法：把两边都当「带 null 的序列」，**前序与层序各试一次**重建，
 * 只要某一种解释下两边同构就算过；两种都不成立才判失败。
 *
 * 保守：解析不出节点序列就返回 false，不会影响原有的比较路径。
 */
function sameTree(a: unknown, b: unknown): boolean {
  // 只在「一边是字符串」时才启用：字符串那一侧才是我们自己序列化出来的，
  // 遍历方式由题解代码决定（0297 的 DFS 吐前序、BFS 吐层序）。
  // 两边都是数组时（期望值本来就来自题面）上面的深比较已经比过了，
  // 再「换一个遍历解释」只会让判定变松。
  if (typeof a !== 'string' && typeof b !== 'string') {
    return false;
  }
  const as = parseNodeSeq(a);
  const bs = parseNodeSeq(b);
  if (!as || !bs) {
    return false;
  }
  const builders = [buildPreorder, buildLevel];
  return builders.some((mkA) =>
    builders.some((mkB) => {
      try {
        return deepEqual(encodeLevel(mkA(as)), encodeLevel(mkB(bs)));
      } catch {
        return false;
      }
    }),
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        deepEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
      )
    );
  }
  return false;
}

/**
 * 题解里的期望值常带省略号（「输出：[0,1,2,...]」），这种没法判定，
 * py-samples 抽取阶段就会丢掉；这里再挡一次，防止手工输入的样例混进来。
 *
 * 还要挡**散文**：0095 的 `输出：5 棵不同的 BST`、0118 的
 * `输出：5 行不同的组合` —— 那是人写的解释，不是返回值。
 * 拿它去比函数的返回值，必然判失败，而失败与代码对错无关。
 *
 * 判据是「能不能当成一个 JSON/Python 字面量解析」。凡是不能的，都不参与判定。
 * 注意 `true` / `false` / `null` 在 JS 里是关键字，JSON.parse 不认，
 * 所以走词法判断而不是真解析。
 */
export function isUsableExpected(text: string): boolean {
  const t = text.trim();
  if (t.length === 0 || t.includes('...') || t.includes('…')) {
    return false;
  }
  return looksLikeLiteral(t);
}

/** 单个 JSON 风格字面量（字符串 / 数字 / 布尔 / null / 数组 / 对象） */
function looksLikeLiteral(t: string): boolean {
  if (/^(true|false|null)$/.test(t)) {
    return true;
  }
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) {
    return true;
  }
  const first = t[0];
  const last = t[t.length - 1];
  if (!'"(['.includes(first) || !'")]}'.includes(last)) {
    return false;
  }
  // 有中文就一定是散文（「5 棵不同的 BST」这种混在字面量里的也有）
  if (/[一-鿿]/.test(t)) {
    return false;
  }
  // 单引号字符串不是 JSON，但力扣题面偶尔就这么写
  if (first === "'" && last === "'" && !t.includes('"')) {
    return true;
  }
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}
