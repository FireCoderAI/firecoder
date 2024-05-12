import React from "react";
import ReactDOM from "react-dom";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Root from "./routes/root";
import { ChatInstance } from "./routes/chat";
import ChatsHistory, {
  loader as ChatsHistoryLoader,
} from "./routes/chatsHistory";
import Init from "./routes/init";
import { SettingsProvider } from "./hooks/useSettings";
import { RequireInit } from "./routes/requireInit";

const router = createMemoryRouter(
  [
    {
      element: <Root />,
      children: [
        {
          path: "/init",
          element: <Init />,
        },
        {
          path: "/chats",
          element: <RequireInit />,
          children: [
            {
              path: "/chats/history",
              element: <ChatsHistory />,
              loader: ChatsHistoryLoader,
            },
            {
              path: "/chats/new-chat",
              element: <ChatInstance />,
            },
            {
              path: "/chats/:chatId",
              element: <ChatInstance />,
            },
          ],
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
    <SettingsProvider>
      <RouterProvider router={router} />
    </SettingsProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
