import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { vscode } from "../utilities/vscode";

type ConfigurationType = {
  chatEnabled: boolean;
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
    const getSettings = async () => {
      const settings = await vscode.getSettings();
      setConfiguration({
        chatEnabled: settings.chatEnable,
      });
    };
    getSettings();
  }, []);

  const value = useMemo(() => ({ configuration }), [configuration]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};
