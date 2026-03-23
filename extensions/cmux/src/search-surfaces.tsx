import { execSync } from "child_process";
import { ActionPanel, Action, closeMainWindow, Color, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

interface Surface {
  ref: string;
  name: string;
  workspaceRef: string;
  workspaceName: string;
  isSelected: boolean;
  isActive: boolean;
}

function listSurfaces(): Surface[] {
  const output = execSync("cmux tree --all", { encoding: "utf8" });
  const lines = output.split("\n");

  const surfaces: Surface[] = [];
  let currentWorkspaceRef = "";
  let currentWorkspaceName = "";

  for (const line of lines) {
    const workspaceMatch = line.match(/workspace\s+(workspace:\d+)\s+"([^"]+)"/);
    if (workspaceMatch) {
      currentWorkspaceRef = workspaceMatch[1];
      currentWorkspaceName = workspaceMatch[2];
      continue;
    }

    const surfaceMatch = line.match(/surface\s+(surface:\d+)\s+\[[^\]]+\]\s+"([^"]+)"/);
    if (surfaceMatch) {
      const ref = surfaceMatch[1];
      const name = surfaceMatch[2];
      const isSelected = line.includes("[selected]");
      const isActive = line.includes("◀ active");
      surfaces.push({
        ref,
        name,
        workspaceRef: currentWorkspaceRef,
        workspaceName: currentWorkspaceName,
        isSelected,
        isActive,
      });
    }
  }

  return surfaces;
}

async function focusSurface(workspaceRef: string, ref: string) {
  await open("/Applications/cmux.app");
  execSync(
    `cmux select-workspace --workspace ${workspaceRef} && cmux move-surface --surface ${ref} --focus true --after-surface ${ref}`,
  );
  await closeMainWindow();
}

export default function Command() {
  const { data: surfaces, isLoading, error } = usePromise(async () => listSurfaces());

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="cmux is not running" description={error.message} />
      </List>
    );
  }

  // Group surfaces by workspace
  const workspaces = surfaces
    ? [...new Set(surfaces.map((s) => s.workspaceName))].map((ws) => ({
        name: ws,
        surfaces: surfaces.filter((s) => s.workspaceName === ws),
      }))
    : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search surfaces...">
      {workspaces.map((ws) => (
        <List.Section key={ws.name} title={ws.name}>
          {ws.surfaces.map((surface) => (
            <List.Item
              key={surface.ref}
              title={surface.name}
              accessories={[...(surface.isActive ? [{ tag: { value: "active", color: Color.Green } }] : [])]}
              actions={
                <ActionPanel>
                  <Action
                    title="Focus Surface"
                    icon={Icon.ArrowRight}
                    onAction={() => focusSurface(surface.workspaceRef, surface.ref)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
