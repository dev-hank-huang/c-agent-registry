import RegistryStatusPage from "./RegistryStatusPage";

export default function AdminModelRegistry() {
  return (
    <RegistryStatusPage
      source="model-registry"
      title="Model Registry"
      description="This app never decides model deprecation itself — it only mirrors the external model registry. Read-only status plus a manual re-sync trigger."
      itemLabel="models"
    />
  );
}
