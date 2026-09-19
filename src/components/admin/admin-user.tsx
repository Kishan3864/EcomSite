"use client";

import { createContext, useContext } from "react";

/**
 * Who is signed in, for the few client components that remember a preference
 * per person — which product form sections are open, say. Two admins sharing
 * one computer each get their own, because the key carries this.
 */
const AdminUserContext = createContext<string>("anon");

export const AdminUserProvider = AdminUserContext.Provider;
export const useAdminUser = () => useContext(AdminUserContext);
