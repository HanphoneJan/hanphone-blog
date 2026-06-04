import { SITE_CONFIG, SITE_URL } from '@/lib/seo-config'

// ============ 基础组件 ============

interface JsonLdProps {
  data: object
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// ============ 网站结构化数据 ============

export function WebsiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_URL,
    description: SITE_CONFIG.description,
    author: {
      '@type': 'Person',
      name: SITE_CONFIG.author.name,
      url: `${SITE_URL}/personal`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
  return <JsonLd data={data} />
}

// ============ 个人信息结构化数据 ============

export function PersonJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_CONFIG.author.name,
    alternateName: SITE_CONFIG.author.alternateName,
    url: SITE_URL,
    image: `${SITE_URL}${SITE_CONFIG.images.avatar}`,
    sameAs: [
      SITE_CONFIG.social.github,
      // 添加其他社交媒体链接
    ],
    jobTitle: '全栈开发者',
    description: '热爱技术，专注于Web开发和机器学习领域',
  }
  return <JsonLd data={data} />
}

// ============ 博客文章结构化数据 ============

interface BlogPostJsonLdProps {
  title: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  image?: string
  author?: string
}

export function BlogPostJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  image,
  author = SITE_CONFIG.author.name,
}: BlogPostJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(image && {
      image: {
        '@type': 'ImageObject',
        url: image,
      },
    }),
  }
  return <JsonLd data={data} />
}

// ============ 面包屑导航结构化数据 ============

interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return <JsonLd data={data} />
}

// ============ 组织/网站发布者结构化数据 ============

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    url: SITE_URL,
    logo: `${SITE_URL}${SITE_CONFIG.images.favicon}`,
    sameAs: [SITE_CONFIG.social.github],
  }
  return <JsonLd data={data} />
}
