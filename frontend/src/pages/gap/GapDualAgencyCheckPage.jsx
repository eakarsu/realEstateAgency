// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapDualAgencyCheckPage() {
  return (
    <GapFeaturePage
      title="Dual-Agency Conflict Checker"
      description="Dual-Agency Conflict Checker"
      slug="dual-agency-check"
      aiResultKey="flags"
      fields={[
  {
    "name": "agentId",
    "label": "Agent ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "buyerId",
    "label": "Buyer ID",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "sellerId",
    "label": "Seller ID",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
