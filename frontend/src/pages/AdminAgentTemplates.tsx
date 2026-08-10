import RegistryStatusPage from "./RegistryStatusPage";

export default function AdminAgentTemplates() {
  return (
    <RegistryStatusPage
      source="agent-templates"
      title="Agent Templates"
      description="Scaffolding templates available when creating a new agent version — mirrored from the external template source, not edited here."
      itemLabel="templates"
    />
  );
}
