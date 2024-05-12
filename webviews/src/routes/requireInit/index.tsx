import { Navigate, Outlet } from "react-router-dom";
import { useSettings } from "../../hooks/useSettings";

export function RequireInit() {
  const settings = useSettings();

  if (!settings.configuration.chatEnabled) {
    return <Navigate to="/init" />;
  }

  return <Outlet />;
}
