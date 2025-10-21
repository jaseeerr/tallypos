import React from "react";

const ApiSection = ({ title, method, url, description, request, response }) => (
  <div className="bg-white shadow-md rounded-lg p-6 mb-8 border border-gray-200">
    <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
    <p className="text-gray-600 mb-3">{description}</p>

    <div className="mb-2">
      <span className="font-mono text-sm bg-gray-100 text-blue-600 px-2 py-1 rounded">
        {method}
      </span>
      <span className="ml-2 text-sm text-gray-700 font-mono">{url}</span>
    </div>

    {request && (
      <div className="mt-4">
        <h3 className="text-gray-700 font-semibold mb-1">📥 Request Body:</h3>
        <pre className="bg-gray-900 text-gray-100 text-sm p-4 rounded overflow-x-auto">
          {JSON.stringify(request, null, 2)}
        </pre>
      </div>
    )}

    {response && (
      <div className="mt-4">
        <h3 className="text-gray-700 font-semibold mb-1">📤 Example Response:</h3>
        <pre className="bg-gray-900 text-gray-100 text-sm p-4 rounded overflow-x-auto">
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    )}
  </div>
);

const TallyApiDocs = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">
          📘 Tally Integration API Documentation
        </h1>

        {/* GET Sales API */}
        <ApiSection
          title="1️⃣ Get All Sales for Tally"
          method="GET"
          url="https://tallypos.syntegrateitsolutions.com/api/getAllSalesForTally"
          description="Fetches all sales entries sorted by date (latest first). Useful for syncing sales data from Tally."
          response={{
            success: true,
            count: 2,
            data: [
              {
                voucherNumber: "S-001",
                date: "2025-10-20T00:00:00.000Z",
                partyLedgerName: "ABC Traders",
                items: [
                  {
                    itemName: "Cement Bag",
                    itemCode: "P001",
                    quantity: 10,
                    unit: "Bags",
                    rate: 350,
                    netAmount: 3500,
                  },
                ],
                totalBeforeVAT: 3500,
                totalVAT: 175,
                netAmount: 3675,
              },
            ],
          }}
        />

        {/* GET Purchases API */}
        <ApiSection
          title="2️⃣ Get All Purchases for Tally"
          method="GET"
          url="https://tallypos.syntegrateitsolutions.com/api/getAllPurchasesForTally"
          description="Retrieves all purchase entries sorted by date (latest first). Useful for Tally to pull updated purchase records."
          response={{
            success: true,
            count: 3,
            data: [
              {
                voucherNumber: "P-012",
                date: "2025-10-19T00:00:00.000Z",
                partyLedgerName: "XYZ Suppliers",
                items: [
                  {
                    itemName: "Steel Rod",
                    itemCode: "P002",
                    quantity: 100,
                    unit: "Kg",
                    rate: 60,
                    netAmount: 6000,
                  },
                ],
                totalBeforeVAT: 6000,
                totalVAT: 300,
                netAmount: 6300,
              },
            ],
          }}
        />

        {/* POST Inventory Update API */}
        <ApiSection
          title="3️⃣ Update Inventory from Tally"
          method="POST"
          url="https://tallypos.syntegrateitsolutions.com/api/updateInventoryFromTally"
          description="Synchronizes inventory data from Tally with the local database. Updates existing products based on `itemCode` or adds new ones if not found."
          request={{
            inventory: [
              {
                itemCode: "P001",
                itemName: "Cement Bag",
                unit: "Bags",
                rate: 350,
                vatPercent: 5,
                closingStock: 100,
              },
              {
                itemCode: "P002",
                itemName: "Steel Rod",
                unit: "Kg",
                rate: 60,
                vatPercent: 5,
                closingStock: 250,
              },
            ],
          }}
          response={{
            success: true,
            message: "Inventory sync complete — 2 updated, 1 added",
          }}
        />

        <footer className="text-center text-gray-500 text-sm mt-10">
          © {new Date().getFullYear()} Syntegrate IT Solutions — Tally API Docs
        </footer>
      </div>
    </div>
  );
};

export default TallyApiDocs;
