from typing import *
import linecache as __lc__
import sys as __sys__
import io as __io__
import re as __re__
class __StdinBuf__:
    # 只借用 owner 的游标，不自己维护位置 —— 这样文本读与字节读天然同步，
    # 跟真实终端一致（stdin 是 TextIOWrapper 包着 BufferedReader）。
    def __init__(self, __owner__):
        self.__o__ = __owner__

    def read(self, __n__=-1):
        return self.__o__.__take__(__n__).encode()

    def readline(self):
        return self.__o__.__take_line__().encode()

    def readlines(self):
        return list(iter(self.readline, b''))

    def __iter__(self):
        return iter(self.readline, b'')

    def readable(self):
        return True


class __Stdin__:
    def __init__(self, __s__=''):
        self.__s__ = __s__
        self.__p__ = 0
        self.buffer = __StdinBuf__(self)

    def __take__(self, __n__=-1):
        if __n__ is None or __n__ < 0:
            __d__ = self.__s__[self.__p__:]
            self.__p__ = len(self.__s__)
            return __d__
        __d__ = self.__s__[self.__p__:self.__p__ + __n__]
        self.__p__ += len(__d__)
        return __d__

    def __take_line__(self):
        __i__ = self.__s__.find('\n', self.__p__)
        __end__ = len(self.__s__) if __i__ == -1 else __i__ + 1
        return self.__take__(__end__ - self.__p__)

    def read(self, __n__=-1):
        return self.__take__(__n__)

    def readline(self):
        return self.__take_line__()

    def readlines(self):
        return list(iter(self.readline, ''))

    def __iter__(self):
        return iter(self.readline, '')

    def readable(self):
        return True
__lc__.cache["/w/main.py"] = (0, None, [], "/w/main.py")
__sys__.stdin = __Stdin__("")
def __enc__(v, __d__=0):
    if __d__ > 64:
        return '...'
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    if isinstance(v, (list, tuple)):
        return [__enc__(x, __d__ + 1) for x in v]
    if isinstance(v, dict):
        return {str(k): __enc__(x, __d__ + 1) for k, x in v.items()}
    # **先判树再判链表**。
    #
    # 0114 把二叉树展开成「只有右孩子的链表」，返回的是 TreeNode，
    # 它既有 next 也有 left。判成链表会输出 [1,2,3,4,5,6]，
    # 而题面的期望值是树形态的 [1,null,2,null,3,null,4,null,5,null,6] ——
    # 判成树就正好对上。纯链表（0002/0019/0023）没有 left 属性，
    # 仍然走链表分支，不受影响。
    if hasattr(v, 'val') and hasattr(v, 'left'):
        return __enc_tree__(v)
    if hasattr(v, 'val') and hasattr(v, 'next'):
        if hasattr(v, 'random'):
            return __enc_rand__(v)
        __r__, __seen__ = [], set()
        while v is not None and id(v) not in __seen__:
            __seen__.add(id(v))
            __r__.append(__enc__(v.val, __d__ + 1))
            v = v.next
        return __r__
    return str(v)

def __enc_rand__(head):
    # 0138 的题面把 random 指针写成**下标**：[[7,null],[13,0],[11,4],...]
    # 里的 0 是「指向第 0 个节点」，不是「指向值为 0 的节点」（链表里没有 0）。
    # 示例 2 的 [[1,1],[2,1]] 也是下标：第 2 个节点的 random 指向下标 1。
    # 入参按这个约定还原、返回值也按同一个约定输出，两边才凑得齐。
    __idx__ = {}
    __n__, __i__ = head, 0
    while __n__ is not None and id(__n__) not in __idx__:
        __idx__[id(__n__)] = __i__
        __n__ = __n__.next
        __i__ += 1
    __out__ = []
    __n__ = head
    while __n__ is not None:
        __r__ = getattr(__n__, 'random', None)
        __out__.append([__enc__(__n__.val), None if __r__ is None else __idx__.get(id(__r__))])
        __n__ = __n__.next
    return __out__

def __enc_tree__(root):    # **层序**输出，和题解里的期望值一致。
    # 力扣题面的示例（也就是题解抄下来的那些）一律是层序：
    #   输入 [4,7,2,9,6,3,1] -> 输出 [1,2,4,7,3,6,9,5]
    # 而不是力扣内部用于比对的递归 [left, val, right]。
    # 输出成递归格式的话每一棵树题都会判失败，而错的是我们不是读者的代码。
    __out__ = []
    if root is None:
        return __out__
    __out__.append(__enc__(root.val))
    __q__ = [root]
    while __q__:
        __n__ = __q__.pop(0)
        for __slot__ in ('left', 'right'):
            __c__ = getattr(__n__, __slot__, None)
            __out__.append(None if __c__ is None else __enc__(__c__.val))
            if __c__ is not None:
                __q__.append(__c__)
    # 去掉尾部多余的 null：叶子节点会各补两个，力扣的期望值里没有
    while __out__ and __out__[-1] is None:
        __out__.pop()
    return __out__

def __j__(v):
    # json.dumps 会把 None 写成 Python 的 None，而题面写的是 JavaScript 的
    # null。不改的话两边的 JSON 都解析不了，比较必然失败。
    # 只替换不在引号里的 None（负向前瞻保证字符串里的 "None" 不受影响）。
    return __re__.sub(r'(?<!["\w])None(?!["\w])', 'null', __json__.dumps(v, default=str, ensure_ascii=False))

def __dump_text__(v):
    # 按「程序打印出来」的样子序列化，而不是 JSON。
    # 期望值是 stdout 文本时必须用这个：函数返回字符串 "0"、程序打印 0，
    # 按 JSON 比会判成不一致，而代码其实是对的。
    # （注意：这个文件里的 Python 代码嵌在 TS 模板字符串中，
    #   注释里不能出现反引号，否则会提前结束模板字符串。）
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return '[' + ', '.join(__dump_text__(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ', '.join(str(k) + ': ' + __dump_text__(x) for k, x in v.items()) + '}'
    if v is None:
        return 'null'
    return str(v)
def __mk__(v, __k__, pos=None):
    if __k__ == 'list':
        if isinstance(v, list) and not v:
            # 空数组原样传：0023 的 mergeKLists([]) 里 lists 就是个空列表，
            # 建成 None 的话 enumerate(None) 直接 TypeError
            return v
        if isinstance(v, list) and all(x is None or isinstance(x, (int, float, str, bool)) for x in v):
            return __mk_list__(v, pos)
        # 链表**数组**：0023 的签名是 List[ListNode]，样例给的是 [[1,4,5],[1,3,4]]
        # 逐个建链表。不处理的话元素还是 list，代码里 l1.val 立刻 AttributeError。
        if isinstance(v, list) and all(isinstance(x, list) for x in v):
            return [__mk_list__(x, pos if i == 0 else None) for i, x in enumerate(v)]
        return v
    if __k__ == 'randlist':
        # 0138 的样例 [[7,null],[13,0],[11,4],...]：每项是「值 + random 指向的
        # **下标**」。先按值建出整条链，再按下标把 random 指针接上
        # （力扣的评测驱动就是这么构造输入的）。
        if isinstance(v, list) and v and all(isinstance(x, list) and len(x) == 2 for x in v):
            __head__ = __mk_list__([x[0] for x in v])
            __nodes__ = []
            __cur__ = __head__
            while __cur__ is not None:
                __nodes__.append(__cur__)
                __cur__ = __cur__.next
            __cur__ = __head__
            for __pair__ in v:
                __t__ = __pair__[1]
                __cur__.random = None if __t__ is None or not isinstance(__t__, int) or __t__ >= len(__nodes__) else __nodes__[__t__]
                __cur__ = __cur__.next
            return __head__
        return __mk__(v, 'list')
    if __k__ == 'tree':
        if isinstance(v, list) and v:
            return __mk_tree__(v)
        return v
    return v


def __find__(root, val):
    # 0236：题面给的 p / q 是**节点值**（p = 5），而签名要的是 TreeNode 对象。
    # 力扣的评测驱动就是到树里按值找节点，这里照做。
    if root is None:
        return None
    if hasattr(root, 'val') and root.val == val:
        return root
    for slot in ('left', 'right'):
        __c__ = getattr(root, slot, None)
        if __c__ is not None:
            __hit__ = __find__(__c__, val)
            if __hit__ is not None:
                return __hit__
    if hasattr(root, 'next'):
        return __find__(root.next, val)
    return None
__ns__ = globals()
if 'ListNode' not in __ns__:
    class ListNode:
        def __init__(self, val=0, next=None):
            self.val = val
            self.next = next

        def __repr__(self):
            return f'ListNode({self.val})'

if 'TreeNode' not in __ns__:
    class TreeNode:
        def __init__(self, val=0, left=None, right=None):
            self.val = val
            self.left = left
            self.right = right

        def __repr__(self):
            return f'TreeNode({self.val})'

if 'Node' not in __ns__:
    class Node:
        def __init__(self, val=0, left=None, right=None, next=None):
            self.val = val
            self.left = left
            self.right = right
            self.next = next

        def __repr__(self):
            return f'Node({self.val})'

def __mk_list__(values, pos=None):
    __cls__ = globals()['ListNode']
    __head__ = None
    __tail__ = None
    __nodes__ = []
    for __v__ in values:
        __n__ = __cls__(__v__)
        __nodes__.append(__n__)
        if __head__ is None:
            __head__ = __n__
        else:
            __tail__.next = __n__
        __tail__ = __n__
    # 力扣的「环形链表」约定：样例是 head = [3,2,0,-4], pos = 1，
    # 意思是把尾部接到第 pos 个节点上（0 起）。0141/0142 的样例都这么写，
    # 而题解的入口只收 head —— 不接环的话 hasCycle 返回 False，
    # 与题面期望的 True 判不上，录制直接判 result-mismatch 丢掉。
    if pos is not None and __tail__ is not None and 0 <= pos < len(__nodes__):
        __tail__.next = __nodes__[pos]
    return __head__

def __mk_tree__(v):
    # 按力扣的**层序**格式建树：[3,9,20,None,None,15,7]
    # 第一个是根，接下来是它的左右孩子，一层一层往下，None 表示没有孩子。
    #
    # 不是递归的 [left, val, right] 格式 —— 那是力扣「序列化」时的写法，
    # 而题面示例一律用层序。两种格式在字面量上无法区分（都是长度 3 的数组），
    # 所以只能按题面的实际约定来。
    __cls__ = globals()['TreeNode']
    if not v:
        return None
    __root__ = __cls__(v[0])
    __queue__ = [__root__]
    __i__ = 1
    while __queue__ and __i__ < len(v):
        __node__ = __queue__.pop(0)
        for __slot__ in ('left', 'right'):
            if __i__ >= len(v):
                break
            __val__ = v[__i__]
            __i__ += 1
            if __val__ is None:
                continue
            __child__ = __cls__(__val__)
            setattr(__node__, __slot__, __child__)
            __queue__.append(__child__)
    return __root__

def __mk_plain__(v, __d__=0):
    if __d__ > 32 or not isinstance(v, list):
        return v
    return [__mk_plain__(x, __d__ + 1) for x in v]
__ns__ = dict(globals())
__ns__['__name__'] = '__judge__'
exec(compile(open('/w/main.py', encoding='utf-8').read(), '/w/main.py', 'exec'), __ns__)
globals().update(__ns__)
import json as __json__
import traceback as __tb__
import ast as __ast__
__sol__ = Solution()
__kinds__ = ["none","none"]
__dummy_head__ = False
__r__ = []
for __a__ in [__json__.load(open("/w/case.json", encoding="utf-8"))["args"]]:
    try:
        __vals__ = [__ast__.literal_eval(x) for x in __a__]
        __p__ = [__mk__(v, __k__) for v, __k__ in zip(__vals__, __kinds__)]
        for __i__, (__v__, __k__) in enumerate(zip(__vals__, __kinds__)):
            if __k__ == 'byval':
                __t__ = next((t for t in __p__[:__i__] if hasattr(t, "val")), None)
                __p__[__i__] = __find__(__t__, __v__) if __t__ is not None else __v__
        __mut__ = False
        __v__ = __sol__.twoSum(*__p__)
        if __v__ is None:
            if __dummy_head__:
                # 用哑节点做原地删除（0019）：返回 None 就是「整个链表没了」。
                # 头节点对象本身还在（只是不再被引用），序列化它会得到原链表。
                __v__ = []
            else:
                __lst__ = [x for x in __p__ if isinstance(x, list) and all(isinstance(y, (int, float, str, bool, list)) for y in x)]
                __nd__ = [x for x in __p__ if hasattr(x, 'val')]
                if len(__lst__) == 1:
                    __v__ = __lst__[0]
                    __mut__ = True
                elif len(__nd__) == 1:
                    __v__ = __nd__[0]
                    __mut__ = True
                else:
                    __v__ = []
        __r__.append({"v": __j__(__enc__(__v__)), "m": __mut__})
    except Exception:
        __r__.append({"e": __tb__.format_exc()})
with open("/w/result.json", "w", encoding="utf-8") as __f__:
    __f__.write(__json__.dumps(__r__[0] if __r__ else {}, ensure_ascii=False))
