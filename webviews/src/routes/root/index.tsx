import { useEffect } from "react";
import {
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useMessageListener } from "../../hooks/messageListener";
import { vscode } from "../../utilities/vscode";

export async function loader() {
  const settings = await vscode.getSettings();
  return settings;
}

type LoaderReturn = Awaited<ReturnType<typeof loader>>;

export default function Root() {
  const settings = useLoaderData() as LoaderReturn;

  let location = useLocation();

  useEffect(() => {
    console.log(location);
  }, [location]);

  const navigate = useNavigate();

  useMessageListener("start-new-chat", () => {
    console.log("callback start-new-chat");
    navigate("/chats/new-chat");
  });

  useEffect(() => {
    if (!settings.chatEnable) {
      navigate("/init");
    }
  }, [settings, navigate]);

  console.log(settings);

  return (
    <>
      <Outlet />
    </>
  );
}
