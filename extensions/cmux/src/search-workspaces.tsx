import { ActionPanel, Action, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFileAsync, getErrorMessage, openCmuxApp } from "./cli";
import { listSurfaces, SurfaceList } from "./surfaces";

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

async function listWindows(): Promise<Window[]> {
  const output = await execFileAsync("cmux", ["tree", "--all"]);
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
  try {
    await openCmuxApp();
    await execFileAsync("cmux", ["select-workspace", "--workspace", ref]);
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to select workspace",
      message: getErrorMessage(error),
    });
  }
}

function WorkspaceSurfacesList({
  workspaceRef,
  workspaceName,
  surfaces,
}: {
  workspaceRef: string;
  workspaceName: string;
  surfaces: Awaited<ReturnType<typeof listSurfaces>>;
}) {
  return (
    <SurfaceList
      surfaces={surfaces.filter((surface) => surface.workspaceRef === workspaceRef)}
      isLoading={false}
      searchBarPlaceholder={`Search surfaces in ${workspaceName}...`}
      groupByWorkspace={false}
    />
  );
}

export default function Command() {
  const { data: windows, isLoading, error } = usePromise(listWindows);
  const { data: surfaces, error: surfacesError } = usePromise(listSurfaces);

  if (error || surfacesError) {
    const message = error?.message ?? surfacesError?.message ?? "Unknown error";

    return (
      <List isLoading={false}>
        <List.EmptyView icon={Icon.ExclamationMark} title="cmux is not running" description={message} />
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
                  <Action.Push
                    title="Show Surfaces"
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    target={
                      <WorkspaceSurfacesList
                        workspaceRef={workspace.ref}
                        workspaceName={workspace.name}
                        surfaces={surfaces ?? []}
                      />
                    }
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
