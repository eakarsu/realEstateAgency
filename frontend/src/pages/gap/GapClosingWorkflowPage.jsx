// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapClosingWorkflowPage() {
  return (
    <GapFeaturePage
      title="Closing/Title Workflow"
      description="Closing/Title Workflow"
      slug="closing-workflow"
      aiResultKey="milestone"
      fields={[
  {
    "name": "transactionId",
    "label": "Transaction ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "milestone",
    "label": "Milestone",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
