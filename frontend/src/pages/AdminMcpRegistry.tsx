import RegistryStatusPage from "./RegistryStatusPage";

export default function AdminMcpRegistry() {
  return (
    <RegistryStatusPage
      source="mcp-registry"
      title="MCP Registry"
      description="This app never decides MCP tool deprecation itself — it only mirrors the external MCP registry. Read-only status plus a manual re-sync trigger."
      itemLabel="tools"
    />
  );
}
