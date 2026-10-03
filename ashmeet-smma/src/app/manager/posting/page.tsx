import { PostingScreen } from '@/components/console/PostingScreen'
import { ScopeBanner } from '@/components/console/ScopeBanner'
import { jaspreetPostItems } from '@/lib/fixtures/console-screens'

export default function ManagerPostingPage() {
  return (
    <PostingScreen
      banner={<ScopeBanner>Your clients &mdash; Ramana Dental and Grover Motors only</ScopeBanner>}
      intro="What's going out for your two accounts."
      posts={jaspreetPostItems}
      initialKey="service"
      emptyDay={{ day: 24, label: '24 September' }}
      panelTone="lav"
    />
  )
}
