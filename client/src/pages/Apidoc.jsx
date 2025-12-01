import React from "react";

export default function TallyApiDoc() {
  return (
    <div className="bg-gray-100 py-10 text-gray-800 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-10">

        {/* HEADER */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          API Documentation for Tally Developer
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          This document defines all required API endpoints for cloud integration with TDL.
        </p>

        <hr className="my-8 border-gray-200" />

        {/* SECTION 1 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">
            1. Fetch Pending Sales (Tally → Server)
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded">
            <p>
              <strong>URL:</strong>{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                GET https://app.fancypalace.cloud/api/fetch-sales?company=&lt;COMPANY_NAME&gt;
              </code>
            </p>
            <p className="mt-2">
              <strong>Description:</strong> Returns pending sales vouchers to be imported into Tally.
            </p>
          </div>

          <h3 className="text-xl font-medium mt-6 mb-2">Sample Request</h3>
          <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-sm overflow-auto">
GET https://app.fancypalace.cloud/api/fetch-sales?company=ABC-Company
          </pre>

          <h3 className="text-xl font-medium mt-6 mb-2">Sample Response</h3>
          <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-sm overflow-auto">
{`{
  "Vouchers": [
    {
      "TYPE": "Sales Invoice",
      "BILLNO": "101",
      "DATE": "2025-02-20",
      "REFERENCE": "",
      "TOTALAMOUNT": "1100.00",
      "REMARKS": "",
      "PARTYVATNO": "11111111",
      "PARTYCODE": "C1001",
      "PARTYNAME": "ABC Customer",
      "PARTYADDRESS": [
        { "ADDRESS": "Address1" },
        { "ADDRESS": "Address2" }
      ],
      "ITEMS": [
        {
          "ITEMNAME": "TV Unit",
          "ITEMCODE": "TV1001",
          "ITEMGROUP": "TV",
          "DESCRIPTION": "Full size",
          "QTY": "1.0000",
          "UNIT": "PCS",
          "RATE": "1050.00",
          "AMOUNT": "1050.00",
          "Rateoftax": "5.00"
        }
      ],
      "LEDGERS": [
        {
          "LEDGERSNAME": "VAT@5%",
          "Percentage": "5.00",
          "Amount": "50.00"
        }
      ]
    }
  ]
}`}
          </pre>
        </section>

        <hr className="my-8 border-gray-200" />

        {/* SECTION 2 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">
            2. Sales Callback (Tally → Server)
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded">
            <p>
              <strong>URL:</strong>{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                POST https://app.fancypalace.cloud/api/sales-callback
              </code>
            </p>
            <p className="mt-2">
              <strong>Description:</strong> Called by TDL after processing each sales voucher.
            </p>
          </div>

          <h3 className="text-xl font-medium mt-6 mb-2">Sample Request Body</h3>
          <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-sm overflow-auto">
{`{
  "results": [
    {
      "billNo": "101",
      "status": "success",
      "tallyInvoiceNumber": "INV-00123"
    },
    {
      "billNo": "102",
      "status": "error",
      "message": "Invalid Ledger Name"
    }
  ]
}`}
          </pre>

          <h3 className="text-xl font-medium mt-6 mb-2">Sample Response</h3>
          <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-sm overflow-auto">
{`{ "ok": true, "message": "Callback processed" }`}
          </pre>
        </section>

        <hr className="my-8 border-gray-200" />

        {/* SECTION 3 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">
            3. New Customer Push (Tally → Server)
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded">
            <p>
              <strong>URL:</strong>{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                POST https://app.fancypalace.cloud/api/new-customer
              </code>
            </p>
            <p className="mt-2">
              <strong>Description:</strong> Called when a new customer ledger is created in Tally.
            </p>
          </div>

          <h3 className="text-xl font-medium mt-6 mb-2">Sample Request Body</h3>
          <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-sm overflow-auto">
{`{
  "companyName": "ABC Company Ltd",
  "customer": {
    "partyCode": "C2001",
    "partyName": "New Customer",
    "partyVatNo": "55667788",
    "address": ["Line 1", "Line 2"],
    "contactPerson": "",
    "phone": "",
    "email": "",
    "ledgerName": "New Customer",
    "ledgerGroup": "Sundry Debtors"
  }
}`}
          </pre>
        </section>

        <hr className="my-8 border-gray-200" />

        {/* SECTION 4 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">
            4. New Inventory Item Push (Tally → Server)
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded">
            <p>
              <strong>URL:</strong>{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                POST https://app.fancypalace.cloud/api/new-inventory
              </code>
            </p>
            <p className="mt-2">
              <strong>Description:</strong> Called when a new stock item is created in Tally.
            </p>
          </div>

          <h3 className="text-xl font-medium mt-6 mb-2">Sample Request Body</h3>
          <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-sm overflow-auto">
{`{
  "companyName": "ABC Company Ltd",
  "item": {
    "itemName": "New Product",
    "itemCode": "NP1001",
    "itemGroup": "Products",
    "description": "New stock item",
    "unit": "PCS",
    "openingQty": 0,
    "availableQty": 0,
    "closingQty": 0,
    "avgRate": 0,
    "closingValue": 0,
    "vatRate": 5
  }
}`}
          </pre>
        </section>

      </div>
    </div>
  );
}
