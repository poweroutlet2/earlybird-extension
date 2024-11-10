import React, { useState } from "react"
import { Button } from "~components/ui/button"
import { Textarea } from "~components/ui/textarea"
import { Input } from "~components/ui/input"
import { MessageCircle, X } from "lucide-react"
import { Card, CardContent } from "~components/ui/card"

interface FeedbackFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (feedback: {
    type: string
    email: string
    subject: string
    description: string
  }) => void
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    type: "general",
    email: "",
    subject: "",
    description: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      type: "general",
      email: "",
      subject: "",
      description: ""
    })
    onClose()
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="bg-bg rounded-lg p-6 w-[500px] relative">
        <Button
          variant="neutral"
          size="icon"
          className="absolute right-2 top-2"
          onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold mb-4">Send Feedback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Feedback Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2 border rounded-md bg-background">
              <option value="general">General Feedback</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email (optional)
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Subject
            </label>
            <Input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief summary of your feedback"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Please provide detailed feedback..."
              className="min-h-[150px]"
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Submit Feedback
          </Button>
        </form>
      </Card>
    </div>
  )
} 