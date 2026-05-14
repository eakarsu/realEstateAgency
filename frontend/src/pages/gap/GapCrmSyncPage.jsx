// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapCrmSyncPage() {
  return (
    <GapFeaturePage
      title="External CRM Sync (Salesforce/HubSpot)"
      description="External CRM Sync (Salesforce/HubSpot)"
      slug="crm-sync"
      aiResultKey="syncJob"
      fields={[
  {
    "name": "provider",
    "label": "Provider",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "direction",
    "label": "Direction",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
