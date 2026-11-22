// Web: the browser keeps the login in its own storage.
import { getAuth } from "firebase/auth";

export function createAuth(app) {
  return getAuth(app);
}
