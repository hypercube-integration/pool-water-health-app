// FILE: src/components/Header.jsx  (DROP-IN REPLACEMENT)
import React from "react";
import LoginMenu from "./LoginMenu";
import { useAuth } from "../App";

export default function Header() {
  const { user, loading } = useAuth();
  const roleList = (user?.roles || []).filter(Boolean).join(", ");

  return (
    <header className="w-full px-4 py-3 border-b border-gray-800 flex items-center gap-3 bg-neutral-900 text-white">
      <h1 className="text-lg font-semibold">Pool Water Health</h1>
      <div className="ml-auto flex items-center gap-3">
        {!loading && user?.isAuthenticated ? (
          <span className="text-sm text-gray-300">Signed in • {roleList || "authenticated"}</span>
        ) : (
          <span className="text-sm text-gray-500">Not signed in</span>
        )}
        <LoginMenu compact />
      </div>
    </header>
  );
}
