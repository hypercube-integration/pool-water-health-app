// FILE: src/components/LoginMenu.jsx
import React from "react";

export default function LoginMenu({ compact = false }) {
  const next = encodeURIComponent(
    (typeof window !== "undefined" ? window.location.pathname : "/") +
    (typeof window !== "undefined" ? window.location.hash : "")
  );

  const aadUrl = `/.auth/login/aad?post_login_redirect_uri=${next}`;
  const ghUrl  = `/.auth/login/github?post_login_redirect_uri=${next}`;
  const outUrl = `/.auth/logout?post_logout_redirect_uri=/`;

  if (compact) {
    return (
      <div className="flex gap-2">
        <a className="px-3 py-2 rounded bg-blue-600 text-white hover:opacity-90" href={aadUrl}>Microsoft</a>
        <a className="px-3 py-2 rounded bg-gray-700 text-white hover:opacity-90" href={ghUrl}>GitHub</a>
        <a className="px-3 py-2 rounded border hover:bg-gray-50" href={outUrl}>Sign out</a>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap gap-2">
      <a className="px-3 py-2 rounded bg-blue-600 text-white hover:opacity-90" href={aadUrl}>
        Sign in with Microsoft
      </a>
      <a className="px-3 py-2 rounded bg-gray-700 text-white hover:opacity-90" href={ghUrl}>
        Sign in with GitHub
      </a>
      <a className="px-3 py-2 rounded border hover:bg-gray-50" href={outUrl}>
        Sign out
      </a>
    </div>
  );
}
