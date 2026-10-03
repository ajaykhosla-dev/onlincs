import { PostingScreen } from '@/components/console/PostingScreen'
import { postItems } from '@/lib/fixtures/console-screens'

export default function AdminPostingPage() {
  return (
    <PostingScreen
      intro="What's going out, when, and in what format — across every client."
      posts={postItems}
      initialKey="service"
      panelTone="sky"
    />
  )
}
