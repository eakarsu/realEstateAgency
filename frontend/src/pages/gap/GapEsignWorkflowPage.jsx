// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapEsignWorkflowPage() {
  return (
    <GapFeaturePage
      title="E-Signature Workflow Coordinator"
      description="E-Signature Workflow Coordinator"
      slug="esign-workflow"
      aiResultKey="plan"
      fields={[
  {
    "name": "signers",
    "label": "Signers (comma-separated emails)",
    "type": "array"
  },
  {
    "name": "docId",
    "label": "Doc ID",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
