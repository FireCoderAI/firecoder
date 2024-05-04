import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMessageListener } from "../../hooks/messageListener";

export default function Root() {
  let location = useLocation();

  useEffect(() => {
    console.log(location);
  }, [location]);

  const navigate = useNavigate();

  useMessageListener("start-new-chat", () => {
    console.log("callback start-new-chat");
    navigate("/chats/new-chat");
  });

  return (
    <>
      <Outlet />
    </>
  );
}
