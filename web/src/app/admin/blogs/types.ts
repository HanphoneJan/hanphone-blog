'use client'

export interface Type {
  id: number
  name: string
}

export interface Tag {
  id: number
  name: string
}

export interface Blog {
  id: number
  title: string
  type: Type
  tags: Tag[]
  views: number
  updateTime: string
  description: string
  firstPicture: string
  content: string
  inputVisible?: boolean
  inputValue?: string
  recommend: boolean
  published: boolean
  flag: string
}

export interface QueryInfo {
  title: string
  typeId: number | null
}

export interface EditBlogForm {
  title: string
  content: string
  description: string
}

export interface BlogListResponse {
  code: number
  data: {
    content: Blog[]
    totalElements: number
  }
}

export interface ApiResponse<T> {
  code: number
  data: T
  msg?: string
}
