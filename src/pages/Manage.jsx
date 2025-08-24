import React from "react";
import { Link } from "react-router-dom";

export default function Manage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Admin
          </h1>

          {/* Quick actions (add more admin links here later if you’d like) */}
          <div className="flex gap-3">
            {/* ✅ FIX: Use React Router Link to go to /admin/users (HashRouter renders as /#/admin/users) */}
            <Link
              to="/admin/users"
              className="inline-flex items-center rounded-lg px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition"
            >
              Manage Users &amp; Roles
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Admin overview card */}
          <section className="bg-white rounded-xl shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Administration Overview
              </h2>
              <p className="text-sm text-gray-600">
                Use the actions above to manage application users and their roles.  
                Only users with the <span className="font-medium">admin</span> role can access these tools.
              </p>

              {/* You can add more admin quick links here if needed */}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/admin/users"
                  className="inline-flex items-center rounded-lg px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                >
                  Open User Management
                </Link>
                {/* Placeholder for future admin tools
                <Link
                  to="/admin/settings"
                  className="inline-flex items-center rounded-lg px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition"
                >
                  App Settings
                </Link>
                */}
              </div>
            </div>
          </section>

          {/* Tips / help */}
          <section className="bg-white rounded-xl shadow-sm border">
            <div className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Tips
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>If you get a 401 while editing roles, ensure your account has the <code>admin</code> role.</li>
                <li>If you get a 403, check the function’s managed identity permissions on the Static Web App.</li>
                <li>If you see 404s from the user API, verify your <code>SWA_RESOURCE_ID</code> and API version.</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
