import { FirebaseUser } from "../types/firebase";

interface AppUserData {
  orgIds?: string[];
  [key: string]: any;
}

interface Capabilities {
  camera: boolean;
  notifications: boolean;
}

interface UserContextType {
  user: FirebaseUser & AppUserData & { orgIds: string[] };
  role: string;
  uid: string;
  capabilities: Capabilities;
  loading: boolean;
}

declare module "../contexts/UserContext" {
  import { Context } from "react";
  const UserContext: Context<UserContextType>;
  const useUser: () => UserContextType;
  export { UserContext, useUser };
}