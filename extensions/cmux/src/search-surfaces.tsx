import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listSurfaces, SurfaceList } from "./surfaces";

export default function Command() {
  const { data: surfaces, isLoading, error } = usePromise(async () => listSurfaces());

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="cmux is not running" description={error.message} />
      </List>
    );
  }

  return <SurfaceList surfaces={surfaces ?? []} isLoading={isLoading} searchBarPlaceholder="Search surfaces..." />;
}
