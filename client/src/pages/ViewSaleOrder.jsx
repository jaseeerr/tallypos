"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import MyAxiosInstance from "../utils/axios"
import jsPDF from "jspdf"
import { API_BASE } from "../utils/url"
import autoTable from "jspdf-autotable"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { ArrowLeft, FileText, Calendar, User, Building2, Package, Loader2, AlertCircle, DollarSign } from "lucide-react"

export default function ViewOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const axios = MyAxiosInstance()
const [showExcelModal, setShowExcelModal] = useState(false)

const [excelValues, setExcelValues] = useState({
  cRow1: "Murshid Bazar-Deira-Dubai",
  cRow2: "Tel: 04-5232322",
  cRow3: "--",
  vendor: "1121212",
})
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [converting, setConverting] = useState(false)
const [convertError, setConvertError] = useState(null)

  // =============================
  // FETCH ORDER
  // =============================
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const res = await axios.get(`/sale-orders/${id}`)
        setOrder(res.data.item)
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load sale order")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id])


  
  const handleConvertToSale = async () => {
  try {
    setConverting(true)
    setConvertError(null)

    const res = await axios.post(`/convertOrderToSale/${id}`)

    // update local order state
    setOrder((prev) => ({
      ...prev,
      converted: true,
      convertedAt: new Date().toISOString()
    }))
  } catch (err) {
    setConvertError(
      err.response?.data?.message || "Failed to convert sale order"
    )
  } finally {
    setConverting(false)
  }
}

const fetchInventoryImages = async (itemNames) => {
  try {
    const res = await axios.post("/inventoryBulkImages", {
      names: itemNames,
    })

    // API already returns a map by product name
    // Normalize to { [name]: images[] }
    const imageMap = {}

    const items = res.data?.items || {}

    for (const name of itemNames) {
      imageMap[name] = items[name]?.images || []
    }

    return imageMap
  } catch (err) {
    console.error("Failed to fetch inventory images", err)
    return {}
  }
}


async function loadImageAsBase64(imagePath) {
  const res = await fetch(
    `${API_BASE}/inventory-image?path=${encodeURIComponent(imagePath)}`
  )

  if (!res.ok) throw new Error("Image load failed")

  const blob = await res.blob()

  const base64 = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result.split(",")[1]) // ✅ strip data URL
    }
    reader.readAsDataURL(blob)
  })

  const img = new Image()
  const imgLoaded = new Promise((resolve) => (img.onload = resolve))
  img.src = URL.createObjectURL(blob)
  await imgLoaded

  return {
    base64,
    type: blob.type.includes("png") ? "PNG" : "JPEG",
    width: img.naturalWidth,
    height: img.naturalHeight,
  }
}







const generateSaleOrderPDFOLdStableTemplate = async () => {
  const doc = new jsPDF("p", "mm", "a4")

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 14
  let cursorY = 20

  // ===== HEADER - Company Name Centered =====
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 35, "F")

  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(order.companyName, pageWidth / 2, cursorY, { align: "center" })

  cursorY += 10
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("SALE ORDER", pageWidth / 2, cursorY, { align: "center" })

  cursorY += 20
  doc.setTextColor(0, 0, 0)

  // ===== ORDER DETAILS BOX =====
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 28, 3, 3, "F")

  cursorY += 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(`Order No: #${order.billNo}`, marginX + 6, cursorY)
  doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, pageWidth - marginX - 6, cursorY, { align: "right" })

  cursorY += 8
  doc.setFont("helvetica", "normal")
  doc.text(`Party: ${order.partyName || "-"}`, marginX + 6, cursorY)

  cursorY += 18

  // ===== ITEMS TABLE (Without Tax Column) =====
  autoTable(doc, {
    startY: cursorY,
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 4,
    },
    bodyStyles: {
      halign: "center",
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 10,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    head: [["Item", "Qty", "Unit", "Rate", "Amount"]],
    body: order.items.map((i) => [
      i.itemName,
      i.qty,
      i.unit,
      `AED ${Number(i.rate).toFixed(2)}`,
      `AED ${Number(i.amount).toFixed(2)}`,
    ]),
  })

  cursorY = doc.lastAutoTable.finalY + 10

  // ===== TOTALS BOX =====
  const totalsBoxWidth = 80
  const totalsX = pageWidth - marginX - totalsBoxWidth

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(totalsX, cursorY, totalsBoxWidth, 36, 3, 3, "F")

  cursorY += 8
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Subtotal:", totalsX + 6, cursorY)
  doc.text(`AED ${subtotal.toFixed(2)}`, totalsX + totalsBoxWidth - 6, cursorY, { align: "right" })

  cursorY += 8
  doc.text("VAT:", totalsX + 6, cursorY)
  doc.text(`AED ${vat.toFixed(2)}`, totalsX + totalsBoxWidth - 6, cursorY, { align: "right" })

  cursorY += 2
  doc.setDrawColor(200, 200, 200)
  doc.line(totalsX + 6, cursorY, totalsX + totalsBoxWidth - 6, cursorY)

  cursorY += 8
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Total:", totalsX + 6, cursorY)
  doc.setTextColor(37, 99, 235)
  doc.text(`AED ${total.toFixed(2)}`, totalsX + totalsBoxWidth - 6, cursorY, { align: "right" })

  cursorY += 20
  doc.setTextColor(0, 0, 0)

  // ===== PRODUCT IMAGES IN CARDS (3 per row) =====
  const itemNames = order.items.map((i) => i.itemName)
  const imageMap = await fetchInventoryImages(itemNames)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Product Images", marginX, cursorY)
  cursorY += 8

  const cardWidth = 58
  const cardHeight = 70
  const cardGap = 5
  const imgSize = 40
  let cardIndex = 0

  for (const item of order.items) {
    const images = imageMap[item.itemName] || []

    for (const img of images) {
      const col = cardIndex % 3
      const x = marginX + col * (cardWidth + cardGap)

      if (col === 0 && cardIndex > 0) {
        cursorY += cardHeight + cardGap
      }

      if (cursorY + cardHeight > 280) {
        doc.addPage()
        cursorY = 20
        cardIndex = 0
      }

      // Card background
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(x, cursorY, cardWidth, cardHeight, 3, 3, "FD")

      // Load and add image
      const image = await loadImageAsBase64(img)
      if (image) {
        const imgX = x + (cardWidth - imgSize) / 2
        const imgY = cursorY + 4
        doc.addImage(image.base64, image.type, imgX, imgY, imgSize, imgSize)
      }

      // Item name
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      const nameText = item.itemName.length > 18 ? item.itemName.substring(0, 18) + "..." : item.itemName
      doc.text(nameText, x + cardWidth / 2, cursorY + imgSize + 10, { align: "center" })

      // Quantity and Price
      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`Qty: ${item.qty}`, x + cardWidth / 2, cursorY + imgSize + 16, { align: "center" })

      doc.setTextColor(37, 99, 235)
      doc.text(`AED ${Number(item.rate).toFixed(2)}`, x + cardWidth / 2, cursorY + imgSize + 22, { align: "center" })

      cardIndex++
    }
  }

  doc.save(`SaleOrder-${order.billNo}.pdf`)
}




const generateSaleOrderPDF = async () => {

 

  const doc = new jsPDF("p", "mm", "a4")

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  let cursorY = 20

  // ===== HEADER - Company Name Centered =====
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 35, "F")

  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(order.companyName, pageWidth / 2, cursorY, { align: "center" })

  cursorY += 10
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("SALE ORDER", pageWidth / 2, cursorY, { align: "center" })

  cursorY += 20
  doc.setTextColor(0, 0, 0)

  // ===== ORDER DETAILS BOX =====
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 28, 3, 3, "F")

  cursorY += 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(`Order No: #${order.billNo}`, marginX + 6, cursorY)
  doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, pageWidth - marginX - 6, cursorY, { align: "right" })

  cursorY += 8
  doc.setFont("helvetica", "normal")
  doc.text(`Party: ${order.partyName || "-"}`, marginX + 6, cursorY)

  cursorY += 18

  // ===== FETCH IMAGES =====
  const itemNames = order.items.map((i) => i.itemName)
  const imageMap = await fetchInventoryImages(itemNames)

  // ===== ITEMS TABLE (2 Columns: Image | Details) =====
  const imgSize = 45
  const rowHeight = 55

  const tableBody = []

  for (const item of order.items) {
    const images = imageMap[item.itemName] || []
    let imageBase64 = null

    if (images.length > 0) {
      const loaded = await loadImageAsBase64(images[0])
      if (loaded) {
        imageBase64 = loaded
      }
    }

    tableBody.push([
      { content: "", styles: { minCellHeight: rowHeight }, imageBase64: imageBase64 },
      {
        content: `${item.itemName}\n\nQty: ${item.qty} ${item.unit}    |    Rate: AED ${Number(item.rate).toFixed(2)}\n\nAmount: AED ${Number(item.amount).toFixed(2)}`,
        styles: { cellPadding: 8, fontSize: 10, minCellHeight: rowHeight },
      },
    ])
  }

  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 4,
    },
    bodyStyles: {
      valign: "middle",
      minCellHeight: rowHeight,
    },
    styles: {
      fontSize: 10,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 55, halign: "center" },
      1: { cellWidth: "auto" },
    },
    head: [["Product", "Details"]],
    body: tableBody.map((row) => [row[0].content, row[1].content]),
    rowPageBreak: "avoid",
    showHead: "firstPage",
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const rowData = tableBody[data.row.index]
        if (rowData && rowData[0].imageBase64) {
          const x = data.cell.x + (data.cell.width - imgSize) / 2
          const y = data.cell.y + (data.cell.height - imgSize) / 2
          doc.addImage(rowData[0].imageBase64.base64, rowData[0].imageBase64.type, x, y, imgSize, imgSize)
        }
      }
    },
  })

  cursorY = doc.lastAutoTable.finalY + 12

  // ===== TOTALS BOX =====
  const totalsBoxWidth = 90
  const totalsX = pageWidth - marginX - totalsBoxWidth

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(totalsX, cursorY, totalsBoxWidth, 42, 3, 3, "F")

  cursorY += 10
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80, 80, 80)
  doc.text("Subtotal:", totalsX + 8, cursorY)
  doc.text(`AED ${subtotal.toFixed(2)}`, totalsX + totalsBoxWidth - 8, cursorY, { align: "right" })

  cursorY += 8
  doc.text("VAT (5%):", totalsX + 8, cursorY)
  doc.text(`AED ${vat.toFixed(2)}`, totalsX + totalsBoxWidth - 8, cursorY, { align: "right" })

  cursorY += 4
  doc.setDrawColor(200, 200, 200)
  doc.line(totalsX + 8, cursorY, totalsX + totalsBoxWidth - 8, cursorY)

  cursorY += 10
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Grand Total:", totalsX + 8, cursorY)
  doc.setTextColor(37, 99, 235)
  doc.text(`AED ${total.toFixed(2)}`, totalsX + totalsBoxWidth - 8, cursorY, { align: "right" })

  // ===== FOOTER ON EACH PAGE =====
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const footerY = pageHeight - 15
    doc.setDrawColor(226, 232, 240)
    doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5)

    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(130, 130, 130)
    doc.text("This is a system-generated document. No signature required.", pageWidth / 2, footerY, { align: "center" })

    doc.setFontSize(7)
    doc.text(`Page ${i} of ${totalPages}  |  Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 5, { align: "center" })
  }

  doc.save(`SaleOrder-${order.billNo}.pdf`)
}



const generateSaleOrderExcel = async (values) => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Sale Order")

  // ======================
  // COLUMN DEFINITIONS
  // ======================
  sheet.columns = [
    { key: "sno", width: 8 },
    { key: "image", width: 22 },
    { key: "description", width: 40 },
    { key: "itemCode", width: 16 },
    { key: "qty", width: 10 },
    { key: "unit", width: 10 },
    { key: "rate", width: 14 },
    { key: "amount", width: 16 },
  ]

  // Force image column width (global)
  sheet.getColumn(2).width = 40

  // ======================
  // IMAGE SCALING CONSTANTS (SAFE TO COMPUTE NOW)
  // ======================
  const IMAGE_COLUMN_INDEX = 2
  const PX_PER_COL_UNIT = 17
  const PX_PER_ROW_UNIT = 0.75

  const MAX_IMAGE_WIDTH_PX =
    sheet.getColumn(IMAGE_COLUMN_INDEX).width * PX_PER_COL_UNIT
  const MAX_IMAGE_HEIGHT_PX = 280
  const MIN_ROW_HEIGHT = 90

  // ======================
  // HEADER
  // ======================
  sheet.mergeCells("A1:H1")
  const saleOrderRow = sheet.getRow(1)
  saleOrderRow.getCell(1).value = "SALE ORDER"
  saleOrderRow.height = 30
  saleOrderRow.font = { bold: true, size: 16 }
  saleOrderRow.alignment = { horizontal: "center", vertical: "middle" }
  saleOrderRow.getCell(1).border = { bottom: { style: "thin" } }

  sheet.mergeCells("A2:H2")
  const companyRow = sheet.getRow(2)
  companyRow.getCell(1).value = order.companyName
  companyRow.font = { bold: true, size: 14 }
  companyRow.alignment = { horizontal: "center", vertical: "middle" }
  companyRow.height = 26

  sheet.mergeCells("A3:H3")
  sheet.getRow(3).getCell(1).value = values.cRow1
  sheet.mergeCells("A4:H4")
  sheet.getRow(4).getCell(1).value = values.cRow2
  sheet.mergeCells("A5:H5")
  sheet.getRow(5).getCell(1).value = values.cRow3

  for (let i = 3; i <= 5; i++) {
    const row = sheet.getRow(i)
    row.font = { bold: true, size: 14 }
    row.alignment = { horizontal: "center", vertical: "middle" }
    row.height = 26
  }

  sheet.addRow([])

  // ======================
  // ORDER INFO
  // ======================
  sheet.addRow(["Vendor:", values.vendor]).font = { bold: true }
  sheet.addRow(["Order No", `#${order.billNo}`]).font = { bold: true }
  sheet.addRow(["Date", new Date(order.date).toLocaleDateString()]).font = {
    bold: true,
  }
  sheet.addRow(["Party", order.partyName || "-"]).font = { bold: true }

  sheet.addRow([])

  // ======================
  // TABLE HEADER
  // ======================
  const headerRow = sheet.addRow([
    "S No",
    "Image",
    "DESCRIPTION",
    "ITEM CODE",
    "Qty",
    "Unit",
    "Rate (AED)",
    "Amount (AED)",
  ])
  headerRow.height = 30
  headerRow.font = { bold: true, size: 12 }
  headerRow.alignment = { horizontal: "center", vertical: "middle" }

  // ======================
  // FETCH IMAGES
  // ======================
  const itemNames = order.items.map((i) => i.itemName)
  const imageMap = await fetchInventoryImages(itemNames)

  let rowIndex = sheet.rowCount + 1

  // ======================
  // ITEM ROWS
  // ======================
  for (const item of order.items) {
    const imageUrl = imageMap[item.itemName]?.[0] || ""

    const row = sheet.addRow([
      rowIndex - headerRow.number,
      imageUrl ? "View Image" : "",
      item.itemName,
      "",
      "",
      item.unit,
      Number(item.rate),
      "",
    ])

    row.font = { size: 11 }

    row.eachCell((cell) => {
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      }
    })

    // Clickable image link
    if (imageUrl) {
      row.getCell(2).value = {
        text: "View Image",
        hyperlink: API_BASE+'/'+ imageUrl,
      }
      row.getCell(2).font = {
        color: { argb: "FF0563C1" },
        underline: true,
      }
    }

    // ======================
    // EMBED IMAGE (DYNAMIC)
    // ======================
    if (imageUrl) {
      const img = await loadImageAsBase64(imageUrl)

      if (img) {
        const imageId = workbook.addImage({
          base64: img.base64, // PURE base64 (NO data URL)
          extension: img.type === "PNG" ? "png" : "jpeg",
        })

        // Scale image to column width
        const scale = MAX_IMAGE_WIDTH_PX / img.width
        const scaledWidth = img.width * scale
        let scaledHeight = img.height * scale

        // Cap very tall images
        if (scaledHeight > MAX_IMAGE_HEIGHT_PX) {
          scaledHeight = MAX_IMAGE_HEIGHT_PX
        }

        // Dynamic row height
        row.height = Math.max(
          scaledHeight / PX_PER_ROW_UNIT + 30, // space for link
          MIN_ROW_HEIGHT
        )

     const rowNumber = row.number

sheet.addImage(imageId, {
  tl: {
    col: IMAGE_COLUMN_INDEX - 1 + 0.05,
    row: rowNumber - 1 + 0.05,
  },
  br: {
    col: IMAGE_COLUMN_INDEX,
    row: rowNumber + 1,
  },
  editAs: "twoCell",
})


      }
    } else {
      row.height = MIN_ROW_HEIGHT
    }

    rowIndex++
  }

  // ======================
  // TOTALS
  // ======================
  sheet.addRow([])
  sheet.addRow(["", "", "", "", "Subtotal", subtotal]).font = { bold: true }
  sheet.addRow(["", "", "", "", "VAT (5%)", vat]).font = { bold: true }

  const totalRow = sheet.addRow(["", "", "", "", "Grand Total", total])
  totalRow.font = { bold: true, size: 13 }

  // ======================
  // EXPORT
  // ======================
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `SaleOrder-${order.billNo}.xlsx`
  )
}





const generateSaleOrderExcelOldStable = async (values) => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Sale Order")

  // ======================
  // COLUMN DEFINITIONS
  // ======================
 sheet.columns = [
  { key: "sno", width: 8 },
  { key: "image", width: 22 },
  { key: "description", width: 40 },
  { key: "itemCode", width: 16 },
  { key: "qty", width: 10 },
  { key: "unit", width: 10 },
  { key: "rate", width: 14 },
  { key: "amount", width: 16 },
]


// ======================
// HEADER (NEW FORMAT)
// ======================

// SALE ORDER (TOP)
sheet.mergeCells("A1:H1")
const saleOrderRow = sheet.getRow(1)
saleOrderRow.getCell(1).value = "SALE ORDER"
saleOrderRow.height = 30
saleOrderRow.font = { bold: true, size: 16 }
saleOrderRow.alignment = { horizontal: "center", vertical: "middle" }
saleOrderRow.getCell(1).border = {
  bottom: { style: "thin" },
}

// COMPANY NAME
sheet.mergeCells("A2:H2")
const companyRow = sheet.getRow(2)
companyRow.getCell(1).value = order.companyName
companyRow.font = { bold: true, size: 14 }
companyRow.alignment = { horizontal: "center", vertical: "middle" }
companyRow.height = 26

// COMPANY ROW 1
sheet.mergeCells("A3:H3")
sheet.getRow(3).getCell(1).value = values.cRow1

// COMPANY ROW 2
sheet.mergeCells("A4:H4")
sheet.getRow(4).getCell(1).value = values.cRow2

// COMPANY ROW 3
sheet.mergeCells("A5:H5")
sheet.getRow(5).getCell(1).value = values.cRow3

// STYLE COMPANY EXTRA ROWS (SAFE – NO VARIABLES)
for (let i = 3; i <= 5; i++) {
  const row = sheet.getRow(i)
  row.font = { bold: true, size: 14 }
  row.alignment = { horizontal: "center", vertical: "middle" }
  row.height = 26
}


// SPACE
sheet.addRow([])

// VENDOR
const vendorRow = sheet.addRow(["Vendor:", values.vendor])
vendorRow.font = { bold: true, size: 12 }

// ORDER INFO
const orderRow = sheet.addRow(["Order No", `#${order.billNo}`])
orderRow.font = { bold: true, size: 12 }

const dateRow = sheet.addRow([
  "Date",
  new Date(order.date).toLocaleDateString(),
])
dateRow.font = { bold: true, size: 12 }

const partyRow = sheet.addRow(["Party", order.partyName || "-"])
partyRow.font = { bold: true, size: 12 }

// SPACE BEFORE TABLE
sheet.addRow([])


  // ======================
  // TABLE HEADER
  // ======================
const headerRow = sheet.addRow([
  "S No",
  "Image",
  "DESCRIPTION",
  "ITEM CODE",
  "Qty",
  "Unit",
  "Rate (AED)",
  "Amount (AED)",
])

headerRow.height = 30
headerRow.font = { bold: true, size: 12 }
headerRow.alignment = { horizontal: "center", vertical: "middle" }



  // ======================
  // FETCH IMAGES
  // ======================
  const itemNames = order.items.map((i) => i.itemName)
  const imageMap = await fetchInventoryImages(itemNames)

  let rowIndex = sheet.rowCount + 1

  for (const item of order.items) {
 const row = sheet.addRow([
  
  rowIndex - headerRow.number, // S No
  "",                           // Image
  item.itemName,                // Description
  "",                           // Item Code (empty)
  "",                           // Qty (empty)
  item.unit,                    // Unit
  Number(item.rate),            // Rate
  "",                           // Amount (empty)
])

// CENTER ALL ITEM ROW CELLS
row.eachCell((cell) => {
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  }
})

    // BIG ROW HEIGHT FOR IMAGE
    row.height = 120

    // Wrap product name
row.font = { size: 11 }
row.getCell(2).alignment = { wrapText: true, vertical: "middle" }

    const images = imageMap[item.itemName] || []

    if (images.length > 0) {
      const img = await loadImageAsBase64(images[0])

      if (img) {
        const imageId = workbook.addImage({
          base64: img.base64,
          extension: img.type === "image/png" ? "png" : "jpeg",
        })

     // --- FIT IMAGE TO CELL WIDTH ---
const imageColumnWidthPx = sheet.getColumn(2).width * 7 // column B (Image)
const imageHeightPx = imageColumnWidthPx * 0.9 // keep aspect ratio visually

sheet.addImage(imageId, {
  tl: {
    col: 1 + 0.1,              // horizontal centering
    row: rowIndex - 1 + 0.05,  // vertical centering
  },
  ext: {
    width: imageColumnWidthPx,
    height: imageHeightPx,
  },
  editAs: "oneCell",
})

      }
    }

    rowIndex++
  }

  // ======================
  // TOTALS (AUTO WIDTH SAFE)
  // ======================
  sheet.addRow([])
 sheet.addRow(["", "", "", "", "Subtotal", subtotal]).font = { bold: true, size: 12 }
sheet.addRow(["", "", "", "", "VAT (5%)", vat]).font = { bold: true, size: 12 }

const grandTotalRow = sheet.addRow(["", "", "", "", "Grand Total", total])
grandTotalRow.font = { bold: true, size: 13 }


  // ======================
  // AUTO-ADJUST ROW HEIGHTS
  // ======================
 const headerEndRow = headerRow.number

sheet.eachRow((row, rowNumber) => {
  row.eachCell((cell) => {
    cell.alignment = {
      ...(cell.alignment || {}),
      vertical: "middle",
      wrapText: true,
    }
  })
})




  // ======================
  // EXPORT FILE
  // ======================
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `SaleOrder-${order.billNo}.xlsx`
  )
}

  // =============================
  // STATES
  // =============================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading sale order...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-8 flex flex-col items-center gap-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-600 font-medium text-center">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!order) return null

  // =============================
  // TOTALS
  // =============================
  const subtotal = order.items.reduce((s, i) => s + (i.amount || 0), 0)
  const vat = order.items.reduce((s, i) => s + ((i.amount || 0) * (i.rateOfTax || 0)) / 100, 0)

  const total = subtotal + vat

  // =============================
  // RENDER
  // =============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 mb-16">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/20 text-gray-700 hover:shadow-md hover:scale-105 transition-all duration-200"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Orders</span>
        </button>

        {/* CONVERT TO SALE SECTION */}
<div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-shadow duration-300">
  <div className="flex items-center justify-between flex-wrap gap-4">
    <div>
      <h2 className="text-xl font-bold text-gray-800">
        Convert to Sale
      </h2>

      {order.converted ? (
        <p className="text-sm text-emerald-600 mt-1 font-medium">
          Converted to Sale on{" "}
          {new Date(order.convertedAt).toLocaleString()}
        </p>
      ) : (
        <p className="text-sm text-gray-500 mt-1">
          This sale order has not been converted yet
        </p>
      )}
    </div>

    {!order.converted && (
      <button
        onClick={handleConvertToSale}
        disabled={converting}
        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700
          hover:from-emerald-700 hover:to-emerald-800
          text-white rounded-xl font-semibold shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2 transition-all"
      >
        {converting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5" />
            Convert to Sale
          </>
        )}
      </button>
    )}
  </div>

  {convertError && (
    <div className="mt-4 flex items-center gap-2 text-red-600 text-sm font-medium">
      <AlertCircle className="w-4 h-4" />
      {convertError}
    </div>
  )}
</div>



    <div className="relative bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-md hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6 lg:p-8">
  
  {/* Header */}
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
    
    {/* Title */}
    <div className="flex items-start sm:items-center gap-4">
      <div className="flex-shrink-0 p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
        <FileText className="text-white w-6 h-6" />
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 leading-tight">
          Sale Order #{order.billNo}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Order Details</p>
      </div>
    </div>

    {/* Actions */}
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
      <button
        onClick={generateSaleOrderPDF}
        className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <FileText className="w-5 h-5" />
        Download PDF
      </button>

     <button
  onClick={() => setShowExcelModal(true)}
  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600
    hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold
    shadow-lg flex items-center justify-center gap-2 transition-all"
>
  <FileText className="w-5 h-5" />
  Download Excel
</button>

    </div>
  </div>

  {/* Info Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    
    {/* Date */}
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
      <Calendar className="text-blue-600 w-5 h-5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
        <p className="font-semibold text-gray-800">
          {new Date(order.date).toLocaleDateString()}
        </p>
      </div>
    </div>

    {/* Party */}
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
      <User className="text-purple-600 w-5 h-5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Party</p>
        <p className="font-semibold text-gray-800 truncate max-w-[220px]">
          {order.partyName || "-"}
        </p>
      </div>
    </div>

    {/* Company */}
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50">
      <Building2 className="text-emerald-600 w-5 h-5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Company</p>
        <p className="font-semibold text-gray-800 truncate max-w-[220px]">
          {order.companyName}
        </p>
      </div>
    </div>

  </div>
</div>


        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div className="p-6 border-b border-gray-200/50 flex items-center gap-3">
            <Package className="text-blue-600" size={20} />
            <h2 className="text-xl font-bold text-gray-800">Order Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200/50">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{item.itemName}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700 font-medium">{item.qty}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.unit}</td>
                    <td className="px-6 py-4 text-right text-gray-700 font-medium">
                      AED {Number(item.rate).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">
                      AED {Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="text-emerald-600" size={20} />
            <h2 className="text-xl font-bold text-gray-800">Order Summary</h2>
          </div>

          <div className="max-w-md ml-auto space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
              <span className="text-gray-600 font-medium">Subtotal</span>
              <span className="text-gray-800 font-semibold">AED {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
              <span className="text-gray-600 font-medium">VAT</span>
              <span className="text-gray-800 font-semibold">AED {vat.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 mt-4">
              <span className="text-lg font-bold text-gray-800">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">AED {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>



      {showExcelModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          Excel Header Details
        </h2>
        <button
          onClick={() => setShowExcelModal(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Inputs */}
      <div className="space-y-4">

        <div>
          <label className="text-sm font-medium text-gray-600">
            Company Row 1
          </label>
          <input
            value={excelValues.cRow1}
            onChange={(e) =>
              setExcelValues({ ...excelValues, cRow1: e.target.value })
            }
            className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">
            Company Row 2
          </label>
          <input
            value={excelValues.cRow2}
            onChange={(e) =>
              setExcelValues({ ...excelValues, cRow2: e.target.value })
            }
            className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">
            Company Row 3
          </label>
          <input
            value={excelValues.cRow3}
            onChange={(e) =>
              setExcelValues({ ...excelValues, cRow3: e.target.value })
            }
            className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">
            Vendor
          </label>
          <input
            value={excelValues.vendor}
            onChange={(e) =>
              setExcelValues({ ...excelValues, vendor: e.target.value })
            }
            className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={() => setShowExcelModal(false)}
          className="px-5 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            setShowExcelModal(false)
            await generateSaleOrderExcel(excelValues)
          }}
          className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-semibold
            hover:bg-emerald-700 shadow-md"
        >
          Generate Excel
        </button>
      </div>
    </div>
  </div>
)}


    </div>

    
  )
}
