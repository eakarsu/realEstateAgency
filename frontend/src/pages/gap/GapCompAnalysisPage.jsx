// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapCompAnalysisPage() {
  return (
    <GapFeaturePage
      title="AI-Driven Comp Analysis"
      description="AI-Driven Comp Analysis"
      slug="comp-analysis"
      aiResultKey="comps"
      fields={[
  {
    "name": "subject",
    "label": "Subject Property (JSON)",
    "type": "json"
  },
  {
    "name": "marketArea",
    "label": "Market Area (JSON)",
    "type": "json"
  }
]}
    />
  )
}
