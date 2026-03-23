import { execSync } from "child_process";
import { ActionPanel, Action, closeMainWindow, Color, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

interface Workspace {
  ref: string;
  name: string;
  isSelected: boolean;
}

interface Window {
  ref: string;
  isCurrent: boolean;
  workspaces: Workspace[];
}

function listWindows(): Window[] {
  const output = execSync("cmux tree --all", { encoding: "utf8" });
  const lines = output.split("\n");

  const windows: Window[] = [];
  let currentWindow: Window | null = null;

  for (const line of lines) {
    const windowMatch = line.match(/^window\s+(window:\d+)(.*)/);
    if (windowMatch) {
      currentWindow = {
        ref: windowMatch[1],
        isCurrent: windowMatch[2].includes("[current]"),
        workspaces: [],
      };
      windows.push(currentWindow);
      continue;
    }

    const workspaceMatch = line.match(/workspace\s+(workspace:\d+)\s+"([^"]+)"(.*)/);
    if (workspaceMatch && currentWindow) {
      const ref = workspaceMatch[1];
      const name = workspaceMatch[2];
      const meta = workspaceMatch[3];
      const isSelected = meta.includes("[selected]");
      currentWindow.workspaces.push({ ref, name, isSelected });
    }
  }

  return windows;
}

async function selectWorkspace(ref: string) {
  await open("/Applications/cmux.app");
  execSync(`cmux select-workspace --workspace ${ref}`);
  await closeMainWindow();
}

export default function Command() {
  const { data: windows, isLoading, error } = usePromise(async () => listWindows());

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="cmux is not running" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {windows?.map((window, index) => (
        <List.Section
          key={window.ref}
          title={window.isCurrent ? `Window ${index + 1} (active)` : `Window ${index + 1}`}
        >
          {window.workspaces.map((workspace) => (
            <List.Item
              key={workspace.ref}
              title={workspace.name}
              accessories={[...(workspace.isSelected ? [{ tag: { value: "active", color: Color.Green } }] : [])]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Workspace"
                    icon={Icon.ArrowRight}
                    onAction={() => selectWorkspace(workspace.ref)}
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
