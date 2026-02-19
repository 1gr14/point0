import nodePath from 'node:path'
import { useState } from 'react'
import * as z from 'zod'
import { client } from '@/lib/client'

export const filePage = client.lets('page', 'file').page(() => {
  const uploadFile = uploadFileMutation.useMutation()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) {
      console.info('No file selected')
      return
    }

    void (async () => {
      try {
        const result = await uploadFile.mutateAsync({ file: selectedFile })
        console.info('Upload mutation result:', result)
      } catch (error) {
        console.error('Upload mutation error:', error)
      }
    })()
  }

  return (
    <div>
      <h1>File Upload</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} accept="*/*" />
        <button type="submit" disabled={!selectedFile || uploadFile.isPending}>
          {uploadFile.isPending ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {selectedFile && (
        <div>
          <p>Selected file: {selectedFile.name}</p>
          <p>Size: {selectedFile.size} bytes</p>
        </div>
      )}
    </div>
  )
})

export const uploadFileMutation = client
  .lets('mutation', 'uploadFile')
  .input(z.object({ file: z.instanceof(File) }))
  .loader(async ({ input }) => {
    const size = input.file.size
    // save file to this directory
    const filePath = nodePath.join(import.meta.dirname, input.file.name)
    await Bun.write(filePath, input.file)
    return {
      size,
    }
  })
  .mutation()
