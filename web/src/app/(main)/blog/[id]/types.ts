// 父评论信息
export interface ParentComment {
  id: number;
  nickname: string;
}

// 博客类型
export interface Blog {
  id: number;
  title: string;
  content: string;
  description?: string;
  firstPicture: string;
  createTime: string;
  views: number;
  flag: string;
  likes: number;
  isLiked: boolean;
  published: boolean;
  user: {
    id: number;
    nickname: string;
    avatar: string;
  };
  type?: { id: number; name: string; pic_url?: string };
  tags: { id: number; name: string }[];
  comments: CommentItem[];
}

// 相关博客
export interface RelatedBlog {
  id: number;
  title: string;
}

// 评论项
export interface CommentItem {
  id: number;
  content: string;
  createTime: string;
  userId: number;
  nickname: string;
  avatar: string;
  parentComment?: ParentComment | null;
  parentCommentId?: number | null;
}

// 用户信息
export interface UserInfo {
  avatar?: string;
  nickname?: string;
  username?: string;
  type?: string;
  id?: number | null;
  email?: string;
  loginProvince?: string;
  loginCity?: string;
}

// 标题结构
export interface Heading {
  originalId: string;
  text: string;
  level: number;
}

// Reducer状态
export interface BlogState {
  blog: Blog;
  rpActiveId: number;
  comments: CommentItem[];
  formLoading: boolean;
  loading: boolean;
  likeLoading: boolean;
  headings: Heading[];
  activeHeading: string;
  isMobile: boolean;
  sidebarOpen: boolean;
  headerHeight: number;
  commentsLoaded: boolean;
  readingProgress: number;
}

// Reducer Action类型
export type BlogAction =
  | { type: 'SET_BLOG'; payload: Blog }
  | { type: 'SET_RP_ACTIVE_ID'; payload: number }
  | { type: 'SET_COMMENTS'; payload: CommentItem[] }
  | { type: 'SET_FORM_LOADING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LIKE_LOADING'; payload: boolean }
  | { type: 'SET_HEADINGS'; payload: Heading[] }
  | { type: 'SET_ACTIVE_HEADING'; payload: string }
  | { type: 'SET_IS_MOBILE'; payload: boolean }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_HEADER_HEIGHT'; payload: number }
  | { type: 'TOGGLE_LIKE' }
  | { type: 'ADD_COMMENT'; payload: CommentItem }
  | { type: 'DELETE_COMMENT'; payload: number }
  | { type: 'SET_COMMENTS_LOADED'; payload: boolean }
  | { type: 'SET_READING_PROGRESS'; payload: number };
