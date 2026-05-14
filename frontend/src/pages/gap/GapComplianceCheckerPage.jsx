// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapComplianceCheckerPage() {
  return (
    <GapFeaturePage
      title="Regulatory Compliance Checker"
      description="Regulatory Compliance Checker"
      slug="compliance-checker"
      aiResultKey="flags"
      fields={[
  {
    "name": "state",
    "label": "State",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "listingCopy",
    "label": "Listing Copy",
    "type": "textarea",
    "rows": 4,
    "required": true
  }
]}
    />
  )
}
