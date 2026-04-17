'use client'

import { useState, useCallback } from 'react'
import { LinkForm } from '../forms/LinkForm'
import { useAvatarUpload } from '../../hooks/useAvatarUpload'
import { validateLinkForm } from '../../utils/linkValidation'
import type { FormValues, FriendLink } from '../../types'

interface PublishTabProps {
  loading: boolean
  setLoading: (loading: boolean) => void
  onPublish: (friendLink: FriendLink) => Promise<boolean>
  onSuccess: () => void
}

const DEFAULT_FORM_VALUES: FormValues = {
  name: '',
  description: '',
  url: '',
  type: '',
  color: ''
}

export function PublishTab({ loading, setLoading, onPublish, onSuccess }: PublishTabProps) {
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM_VALUES)

  const {
    avatarUrl,
    dialogImageUrl,
    avatarInputMode,
    uploadRef,
    toggleAvatarInputMode,
    handleAvatarUrlChange,
    handleRemoveImage,
    handleFileChange,
    setDialogImageUrl,
    setAvatarUrl
  } = useAvatarUpload({ setLoading })

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validateLinkForm(formValues)) return

    const friendLinkData: FriendLink = {
      id: null,
      type: formValues.type,
      name: formValues.name,
      description: formValues.description,
      url: formValues.url,
      avatar: dialogImageUrl,
      color: formValues.color,
      recommend: false,
      createTime: new Date().toISOString()
    }

    const success = await onPublish(friendLinkData)
    if (success) {
      setFormValues(DEFAULT_FORM_VALUES)
      setDialogImageUrl('')
      setAvatarUrl('')
      onSuccess()
    }
  }, [formValues, dialogImageUrl, onPublish, onSuccess, setDialogImageUrl, setAvatarUrl])

  return (
    <LinkForm
      formValues={formValues}
      dialogImageUrl={dialogImageUrl}
      avatarUrl={avatarUrl}
      avatarInputMode={avatarInputMode}
      loading={loading}
      uploadRef={uploadRef}
      onInputChange={handleInputChange}
      onAvatarModeChange={toggleAvatarInputMode}
      onFileChange={handleFileChange}
      onAvatarUrlChange={handleAvatarUrlChange}
      onRemoveImage={handleRemoveImage}
      onUploadClick={() => uploadRef.current?.click()}
      onColorChange={(value) => setFormValues(prev => ({ ...prev, color: value }))}
      onSubmit={handleSubmit}
    />
  )
}
