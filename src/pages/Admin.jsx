// src/pages/Admin.jsx
import React from "react";
import { Link } from "react-router-dom";

const roles = [
  {
    name: "admin",
    description: "Full access. Can perform all actions.",
    color: "bg-purple-200 text-purple-800",
  },
  {
    name: "writer",
    description: "Can add new readings.",
    color: "bg-green-200 text-green-800",
  },
  {
    name: "editor",
    description: "Can edit existing readings.",
    color: "bg-blue-200 text-blue-800",
  },
  {
    name: "deleter",
    description: "Can delete readings.",
    color: "bg-red-200 text-red-800",
  },
  {
    name: "exporter",
    description: "Can export CSV/XLSX via API.",
    color: "bg-yellow-200 text-yellow-800",
  },
  {
    name: "authenticated",
    description: "Signed-in users.",
    color: "bg-gray-200 text-gray-800",
  },
  {
    name: "anonymous",
    description: "Guest (unauthenticated) users.",
    color: "bg-gray-100 text-gray-600",
  },
];

export default function Admin() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page heading */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin</h1>
        {/* NEW: Proper link to Manage Users & Roles */}
        <Link
          to="/manage-users"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow"
        >
          Manage Users & Roles
        </Link>
      </div>

      {/* Signed in info (stub) */}
      <div className="mb-6">
        <div className="bg-gray-100 border rounded p-4 text-sm">
          <p>
            Signed in as <strong>hypercube-integration</strong> · Provider:{" "}
            <span className="font-mono">github</span>
          </p>
          <p className="mt-2">
            Roles:{" "}
            {roles.map((role) => (
              <span
                key={role.name}
                className={`inline-block px-2 py-0.5 mr-1 mb-1 text-xs font-semibold rounded ${role.color}`}
              >
                {role.name}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Roles section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Roles in this app</h2>
        <ul className="space-y-2">
          {roles.map((role) => (
            <li
              key={role.name}
              className="flex items-center space-x-2 text-sm"
            >
              <span
                className={`inline-block w-20 px-2 py-0.5 text-center text-xs font-semibold rounded ${role.color}`}
              >
                {role.name}
              </span>
              <span>{role.description}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Invite a tester section */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Invite a tester</h2>
        <p className="text-sm mb-3">
          This builds the Azure CLI command. Run it in your terminal to generate
          the invite link.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Static Web App name
            </label>
            <input
              type="text"
              placeholder="e.g., pool-health"
              className="w-full border rounded px-3 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Resource group
            </label>
            <input
              type="text"
              placeholder="e.g., rg-pool-app"
              className="w-full border rounded px-3 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Tester (GitHub username or email)
            </label>
            <input
              type="text"
              placeholder="octocat or name@example.com"
              className="w-full border rounded px-3 py-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["admin", "writer", "editor", "deleter", "exporter"].map((role) => (
              <label key={role} className="flex items-center space-x-1">
                <input type="checkbox" defaultChecked />
                <span className="capitalize">{role}</span>
              </label>
            ))}
          </div>

          <pre className="bg-gray-900 text-green-200 p-3 rounded text-xs overflow-x-auto">
            az staticwebapp users invite --name &lt;SWA_NAME&gt; --resource-group
            &lt;RESOURCE_GROUP&gt; --authentication-provider github
            --user-details &lt;github-username-or-email&gt; --roles
            "writer,editor,deleter,exporter"
          </pre>

          <button className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700">
            Copy CLI command
          </button>
        </div>
      </div>
    </div>
  );
}
