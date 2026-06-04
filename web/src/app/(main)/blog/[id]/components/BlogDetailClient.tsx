'use client'

import { useMemo, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRewrite from 'rehype-rewrite'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import ClipboardJS from 'clipboard'

import { ThumbsUp, Share2, Copy, ChevronLeft, Loader2 } from 'lucide-react'
import { showAlert } from '@/lib/Alert'
import { BLOG_DETAIL_LABELS } from '@/lib/labels'

import { useBlogDetail, useComments, useToc, useReadingProgress, useScrollSpy } from '../hooks'
import { CommentList, CommentForm, TableOfContents, MobileToc } from './'
import { CodeBlock, CustomHeading, CustomImage, CustomLink } from './markdown'
import type { Blog, RelatedBlog } from '../types'

// 动画变体定义
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  }
}

const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      delay: 0.2
    }
  }
}

const tagVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3
    }
  }
}

const actionButtonVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4
    }
  }
}

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3
    }
  }
} as const

interface BlogDetailClientProps {
  initialBlog: Blog
  initialRelatedBlogs: RelatedBlog[]
  blogId: string
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 复制分享链接
const handleShare = () => {
  try {
    const shareUrl = window.location.origin + window.location.pathname + window.location.search
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showAlert(BLOG_DETAIL_LABELS.LINK_COPIED, { type: 'success', duration: 3000 })
      })
      .catch(() => {
        showAlert(BLOG_DETAIL_LABELS.COPY_LINK_FAIL, { type: 'warning', duration: 3000 })
      })
  } catch (error) {
    console.error('分享功能出错:', error)
    showAlert(BLOG_DETAIL_LABELS.SHARE_UNAVAILABLE, { type: 'warning', duration: 3000 })
  }
}

// 复制内容
const handleCopyContent = (title: string, content: string) => {
  try {
    const contentToCopy = `${title}\n\n${content}`
    navigator.clipboard
      .writeText(contentToCopy)
      .then(() => {
        showAlert(BLOG_DETAIL_LABELS.CONTENT_COPIED, { type: 'success', duration: 3000 })
      })
      .catch(() => {
        showAlert(BLOG_DETAIL_LABELS.COPY_CONTENT_FAIL, { type: 'warning', duration: 3000 })
      })
  } catch (error) {
    console.error('复制内容出错:', error)
    showAlert(BLOG_DETAIL_LABELS.COPY_UNAVAILABLE, { type: 'warning', duration: 3000 })
  }
}

export default function BlogDetailClient({ initialBlog, initialRelatedBlogs, blogId }: BlogDetailClientProps) {
  const {
    state,
    dispatch,
    userInfo,
    administrator,
    relatedBlogs,
    wordCount,
    readingTimeMinutes,
    fetchBlogInfo,
    fetchRelatedBlogs,
    handleLike,
    onShowLogin
  } = useBlogDetail(blogId, initialBlog, initialRelatedBlogs)

  const {
    content,
    setContent,
    handleSubmitComment,
    handleDeleteComment,
    submitReply
  } = useComments({
    blogId: state.blog.id,
    userInfo,
    onShowLogin,
    dispatch,
    comments: state.comments
  })

  const { blogContentRef, scrollToHeading } = useToc({
    content: state.blog.content,
    headerHeight: state.headerHeight,
    dispatch
  })

  // 阅读进度
  useReadingProgress({ dispatch, containerRef: blogContentRef })

  // Scroll Spy
  useScrollSpy({
    headings: state.headings,
    headerHeight: state.headerHeight,
    dispatch,
    containerRef: blogContentRef
  })

  // Markdown组件
  const markdownComponents = useMemo(
    () => ({
      code: (props: any) => <CodeBlock {...props} />,
      h1: (props: any) => <CustomHeading level={1} {...props} />,
      h2: (props: any) => <CustomHeading level={2} {...props} />,
      h3: (props: any) => <CustomHeading level={3} {...props} />,
      h4: (props: any) => <CustomHeading level={4} {...props} />,
      h5: (props: any) => <CustomHeading level={5} {...props} />,
      h6: (props: any) => <CustomHeading level={6} {...props} />,
      img: CustomImage,
      a: CustomLink,
      p: (props: any) => <div className="my-2 text-[rgb(var(--text))] leading-7" {...props} />,
      ul: (props: any) => <ul className="list-disc pl-6 my-2 space-y-1 text-[rgb(var(--text))]" {...props} />,
      ol: (props: any) => <ol className="list-decimal pl-6 my-2 space-y-1 text-[rgb(var(--text))]" {...props} />,
      li: (props: any) => <li className="my-1 text-[rgb(var(--text))]" {...props} />,
      blockquote: (props: any) => (
        <blockquote
          className="border-l-4 border-[rgb(var(--primary))] pl-4 italic my-2 text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg))] py-2 pr-2 rounded-r"
          {...props}
        />
      ),
      table: (props: any) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse" {...props} /></div>,
      th: (props: any) => (
        <th
          className="border border-[rgb(var(--border))] px-4 py-2 bg-[rgb(var(--bg))] font-semibold text-[rgb(var(--text))]"
          {...props}
        />
      ),
      td: (props: any) => (
        <td className="border border-[rgb(var(--border))] px-4 py-2 text-[rgb(var(--text))]" {...props} />
      )
    }),
    []
  )

  // 代码复制功能
  useEffect(() => {
    const clipboard = new ClipboardJS('.copy-code-btn')
    clipboard.on('success', () => {
      showAlert(BLOG_DETAIL_LABELS.CODE_COPIED)
    })
    return () => clipboard.destroy()
  }, [])

  return (
    <motion.div 
      className="flex flex-col" 
      style={{ height: 'calc(100vh - 64px)' }}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <BgOverlay />

      {/* 移动端目录 */}
      <MobileToc
        headings={state.headings}
        activeHeading={state.activeHeading}
        sidebarOpen={state.sidebarOpen}
        readingProgress={state.readingProgress}
        headerHeight={state.headerHeight}
        onToggleSidebar={() => dispatch({ type: 'SET_SIDEBAR_OPEN', payload: !state.sidebarOpen })}
        onHeadingClick={scrollToHeading}
      />

      <main className="blog-main-prose flex-1 w-full relative z-30 page-blog bg-[rgb(var(--bg)/0.8)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-0 min-w-0 max-w-[100vw] h-full">
          {/* 左侧：返回链接 + 同分类文章 - 独立滚动 */}
          <aside className="hidden lg:block py-6 pl-4 xl:pl-6 min-w-0 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[rgb(var(--border))] scrollbar-track-transparent">
            <motion.div
              variants={sidebarItemVariants}
              initial="hidden"
              animate="visible"
            >
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 blog-text-base text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--primary))] transition-colors mb-4"
              >
                <ChevronLeft className="h-4 w-4" />
                返回博客列表
              </Link>
            </motion.div>
            {relatedBlogs.length > 0 && (
              <motion.ul 
                className="space-y-1.5"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.08,
                      delayChildren: 0.2
                    }
                  }
                }}
              >
                {relatedBlogs.map((b) => (
                  <motion.li 
                    key={b.id}
                    variants={sidebarItemVariants}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href={`/blog/${b.id}`}
                      className="block blog-text-base text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--primary))] line-clamp-2 transition-colors leading-snug"
                    >
                      {b.title}
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </aside>

          {/* 中间：正文 - 独立滚动 */}
          <div ref={blogContentRef} className="min-w-0 py-6 px-4 sm:px-6 lg:px-6 xl:px-8 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[rgb(var(--border))] scrollbar-track-transparent">
            <article>
              <motion.header 
                className="blog-header-prose pb-2 mb-1"
                variants={fadeInUpVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="flex flex-wrap items-center text-[rgb(var(--text-muted))] blog-text-base gap-x-4 gap-y-1 mb-3">
                  <span className="text-[rgb(var(--primary))]">{state.blog.user.nickname}</span>
                  <span>{formatDate(state.blog.createTime)}</span>
                  <span>{wordCount} 字 · 预计阅读 {readingTimeMinutes} 分钟</span>
                  <span>{state.blog.views} 阅读</span>
                  <span>{state.blog.likes} 点赞</span>
                  {state.blog.flag && (
                    <span className="text-[rgb(var(--primary))]">{state.blog.flag}</span>
                  )}
                </div>
                <h1 className="blog-text-3xl font-bold text-[rgb(var(--text))] tracking-tight leading-tight">
                  {state.blog.title}
                </h1>
              </motion.header>

              <div className="blog-body">
                <motion.div
                  className="blog-content-prose mb-4 text-[rgb(var(--text))]"
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[
                      [
                        rehypeKatex,
                        {
                          strict: false,
                          trust: true,
                          macros: {
                            "\\begin{align*}": "\\begin{aligned}",
                            "\\end{align*}": "\\end{aligned}"
                          }
                        }
                      ],
                      [
                        rehypeRewrite,
                        {
                          rewrite: (node: any) => {
                            if (node.tagName === 'img') {
                            }
                          }
                        }
                      ],
                      [rehypeRaw]
                    ]}
                    components={markdownComponents}
                  >
                    {state.blog.content}
                  </ReactMarkdown>
                </motion.div>

                {/* 标签 */}
                <motion.div 
                  className="flex flex-wrap items-center mb-8 ml-2"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.3
                      }
                    }
                  }}
                >
                  {state.blog.tags.map(tag => (
                    <motion.div 
                      key={tag.id} 
                      className="flex items-center mr-4 mb-2"
                      variants={tagVariants}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-[rgb(var(--primary))] relative mr-1">
                        <div className="absolute -top-1.75 -left-px w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-[rgb(var(--primary)/0.3)]"></div>
                      </div>
                      <span className="bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] blog-text-sm px-3 py-1 rounded-full border border-[rgb(var(--primary)/0.2)] hover:bg-[rgb(var(--primary)/0.2)] transition-colors">
                        {tag.name}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* 操作按钮 */}
                <motion.div 
                  className="flex items-center gap-8 ml-4 mt-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.4
                      }
                    }
                  }}
                >
                  <motion.button
                    onClick={handleLike}
                    disabled={state.likeLoading || !userInfo}
                    className={`flex items-center gap-2 transition-all duration-200 ${
                      state.likeLoading
                        ? 'opacity-70 cursor-wait'
                        : state.blog.isLiked
                        ? 'text-[rgb(var(--primary))]'
                        : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))]'
                    } ${!userInfo ? 'opacity-60 cursor-not-allowed' : ''}`}
                    variants={actionButtonVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {state.likeLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--primary))]" />
                    ) : (
                      <ThumbsUp
                        className={`h-5 w-5 ${state.blog.isLiked ? 'fill-[rgb(var(--primary))]' : ''} transition-transform duration-300 hover:scale-110`}
                      />
                    )}
                    <span className="blog-text-sm font-medium">{state.blog.likes}</span>
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors duration-200"
                    variants={actionButtonVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Share2 className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
                    <span className="blog-text-sm font-medium">分享</span>
                  </motion.button>

                  <motion.button
                    onClick={() => handleCopyContent(state.blog.title, state.blog.content)}
                    className="flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors duration-200"
                    variants={actionButtonVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Copy className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
                    <span className="blog-text-sm font-medium">复制</span>
                  </motion.button>
                </motion.div>

                {/* 评论区域 */}
                <motion.div 
                  className="border-t border-[rgb(var(--border)/0.4)] my-6 pt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <CommentForm
                    content={content}
                    onChange={setContent}
                    onSubmit={() => handleSubmitComment()}
                    loading={state.formLoading}
                    currentUser={userInfo}
                  />
                </motion.div>

                <motion.div 
                  className={`space-y-3 pt-4 ${state.isMobile ? 'mb-4' : 'mb-10'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <CommentList
                    comments={state.comments}
                    isMobile={state.isMobile}
                    rpActiveId={state.rpActiveId}
                    currentUser={userInfo}
                    administrator={administrator}
                    blogAuthorId={state.blog.user.id}
                    dispatch={dispatch}
                    submitReply={submitReply}
                    handleDeleteComment={handleDeleteComment}
                  />
                </motion.div>
              </div>
            </article>
          </div>

          {/* 右侧：目录 - 独立滚动 */}
          <motion.aside 
            className="hidden lg:block py-6 pl-4 pr-4 xl:pr-6 min-w-0 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[rgb(var(--border))] scrollbar-track-transparent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <TableOfContents
              headings={state.headings}
              activeHeading={state.activeHeading}
              onHeadingClick={scrollToHeading}
            />
          </motion.aside>
        </div>
      </main>
    </motion.div>
  )
}
