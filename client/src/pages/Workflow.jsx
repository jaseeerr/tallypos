import React from "react";

export default function Workflow() {
  return (
    <div className="bg-gray-100 py-10 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-10">
        
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Tally Integration Workflow Documentation
        </h1>

        {/* SECTION 1 */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-blue-600 mb-3">
            1. Systems Involved
          </h2>

          <div className="space-y-2">
            <p className="text-gray-700">This integration involves three components:</p>

            <ul className="list-disc pl-6 text-gray-700">
              <li>
                <strong>MERN Stack VPS Server</strong> – Central database and API server.
              </li>
              <li>
                <strong>Local Tally ERP</strong> – Runs on the client’s local machine.
              </li>
              <li>
                <strong>Local NodeJS Agent (PM2)</strong> – Fetches data from Tally and sends it to the VPS.
              </li>
            </ul>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-blue-600 mb-3">
            2. Inventory & Customer Sync Workflow
          </h2>

          {/* A) Periodic Sync */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              A) Periodic Full Sync (Local Agent → VPS)
            </h3>

            <p className="text-gray-700 mb-4">
              The Local NodeJS Agent runs every 1 minute and performs:
            </p>

            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Fetch Inventory</strong> from Tally using XML export.</li>
              <li><strong>Fetch Customers</strong> from Tally using XML export.</li>
              <li>Convert XML → JSON.</li>
              <li>Send the data to the VPS server:</li>
            </ul>

            <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-x-auto mb-3">
POST /inventory-sync
POST /customer-sync
            </pre>

            <p className="text-gray-700">
              The VPS then upserts (update or insert) this data into MongoDB.
            </p>
          </div>

          {/* B) Real-Time Push */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              B) Real-Time Push Sync (Tally TDL → VPS)
            </h3>

            <p className="text-gray-700 mb-4">
              When a new customer or inventory item is created inside Tally, the TDL directly pushes that record to the VPS:
            </p>

            <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-x-auto mb-3">
POST /new-customer
POST /new-inventory
            </pre>

            <p className="text-gray-700">
              This allows instant sync for newly created records without waiting for the periodic sync.
            </p>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-blue-600 mb-3">
            3. Sales Sync Workflow
          </h2>

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            {/* Fetch Pending Sales */}
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              A) Fetch Pending Sales (Tally → VPS)
            </h3>

            <p className="text-gray-700 mb-4">
              Every 2 minutes, Tally (via custom TDL) requests pending sales from the VPS:
            </p>

            <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-x-auto">
GET /fetch-sales?company=COMPANY_NAME
            </pre>

            <p className="text-gray-700 mt-3">
              VPS returns all sales with{" "}
              <code className="bg-gray-200 px-1 rounded">status = "pending"</code>.
              These sales are immediately marked as <strong>"processing"</strong> to avoid duplicates.
            </p>

            <hr className="my-6" />

            {/* Insert Sales */}
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              B) Insert Sales into Tally
            </h3>

            <p className="text-gray-700">
              TDL loops through the sales received, inserts them into Tally, and builds a success or error list.
            </p>

            <hr className="my-6" />

            {/* Callback */}
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              C) Callback to VPS (Tally → VPS)
            </h3>

            <p className="text-gray-700 mb-3">
              After inserting vouchers, Tally sends results back:
            </p>

            <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-x-auto">
POST /sales-callback
            </pre>

            <p className="text-gray-700">
              VPS updates each sale’s status:
            </p>

            <ul className="list-disc pl-6 text-gray-700">
              <li><strong>synced</strong> – successfully inserted</li>
              <li><strong>error</strong> – insertion failed</li>
              <li>
                All responses are stored in{" "}
                <code className="bg-gray-200 px-1 rounded">tallyResponseLogs</code>
              </li>
            </ul>
          </div>
        </div>

        {/* SECTION 4 */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-blue-600 mb-3">
            4. Summary of Data Flow
          </h2>

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Local Agent → VPS</strong>: Full inventory & customer sync (every minute)</li>
              <li><strong>Tally → VPS</strong>: Real-time new customer & new item sync</li>
              <li><strong>Tally → VPS</strong>: Fetch pending sales</li>
              <li><strong>Tally → VPS</strong>: Insert sales → send callback results</li>
            </ul>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-10 text-sm">
          End of Workflow Documentation
        </p>

      </div>
    </div>
  );
}
