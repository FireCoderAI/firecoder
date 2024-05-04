import React from "react";
import ReactDOM from "react-dom";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Root from "./routes/root/root";
import { ChatInstance } from "./routes/chat";
import ChatsHistory, {
  loader as ChatsHistoryLoader,
} from "./routes/chatsHistory";

const router = createMemoryRouter(
  [
    {
      path: "/",
      element: <Root />,
      children: [
        {
          path: "chats",
          element: <ChatsHistory />,
          loader: ChatsHistoryLoader,
        },
        {
          path: "chats/new-chat",
          element: <ChatInstance />,
        },
        {
          path: "chats/:chatId",
          element: <ChatInstance />,
        },
      ],
    },
  ],
  {
    initialEntries: ["/chats/new-chat"],
  }
);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.getElementById("root")
);
