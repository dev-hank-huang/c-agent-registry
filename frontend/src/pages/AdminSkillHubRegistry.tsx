import RegistryStatusPage from "./RegistryStatusPage";

export default function AdminSkillHubRegistry() {
  return (
    <RegistryStatusPage
      source="skillhub-registry"
      title="SkillHub Registry"
      description="This app never decides skill deprecation itself — it only mirrors the external SkillHub registry. Read-only status plus a manual re-sync trigger."
      itemLabel="skills"
    />
  );
}
