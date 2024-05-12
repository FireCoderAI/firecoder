import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { vscode } from "../utilities/vscode";

type ConfigurationType = {
  chatEnabled: boolean;
  userLoggined: boolean;
};

interface SettingsContextType {
  configuration: ConfigurationType;
}

const SettingsContext = createContext<SettingsContextType>(null!);

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [configuration, setConfiguration] = useState<ConfigurationType>(null!);

  useEffect(() => {
    let lastSettings: any = null;

    const getSettings = async () => {
      const settings = await vscode.getSettings();
      if (
        settings.chatEnabled !== lastSettings?.chatEnabled ||
        settings.userLoggined !== lastSettings?.userLoggined
      ) {
        lastSettings = settings;

        setConfiguration({
          chatEnabled: settings.chatEnabled,
          userLoggined: settings.userLoggined,
        });
      }
    };
    getSettings();

    const interval = setInterval(getSettings, 5000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const value = useMemo(() => ({ configuration }), [configuration]);

  if (configuration === null) {
    return null;
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};
