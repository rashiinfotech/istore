const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const Order = require('../../model/orderModel');
const fs = require('fs');
const path = require('path');




// Server-side code (Node.js/Express)
const exportSalesToPDF = async (req, res) => {
  try {
    console.log("....pdf");
    const { startDate, endDate, status } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter).populate('userId', 'username').sort({ createdAt: -1 });

    // Calculate totals
    const totalSalesCount = orders.length;
    const totalOrderAmount = orders.reduce((total, order) => total + order.amount, 0);
    const totalDiscount = orders.reduce((total, order) => total + order.discount, 0);

    const browser = await puppeteer.launch({
      timeout: 60000, // 60 seconds
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
            .totals { margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Sales Overview</h1>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Coupon</th>
                <th>Created At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>${order.orderId}</td>
                  <td>${order.userId.username}</td>
                  <td>${order.amount}</td>
                  <td>${order.discount}</td>
                  <td>${order.coupon}</td>
                  <td>${order.createdAt.toDateString()}</td>
                  <td>${order.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Sales Count: ${totalSalesCount}</p>
            <p>Total Order Amount: ${totalOrderAmount}</p>
            <p>Total Discount: ${totalDiscount}</p>
          </div>
        </body>
      </html>
    `);

    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_overview.pdf');
    res.send(pdfBuffer);

    console.log("PDF export successful.");
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Additional logging
    console.error('Failed to generate PDF for order:', req.params.orderId);
    // Return appropriate response
    res.status(500).send('Server error');
  }
};

  

  
  // Client-side code (JavaScript/HTML)
  const fetchData = async () => {
    const startDate = '2024-01-01'; // Replace with your actual start date
    const endDate = '2024-06-30';   // Replace with your actual end date
    const status = 'completed';     // Replace with your actual status
  
    try {
      const response = await fetch(`/api/export-sales-pdf?startDate=${startDate}&endDate=${endDate}&status=${status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales_overview.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  // Example HTML structure integrating fetchData
  /*
    <button onclick="fetchData()">Fetch and Download PDF</button>
  */
  
  

    
    const exportSalesToExcel = async (req, res) => {
      try {
        const status = 'completed'; // Replace with your actual status
    
        let filter = {};
    
        if (status) {
          filter.status = status;
        }
    
        console.log('Filter:', filter); // Debugging: Output filter details
    
        const orders = await Order.find().populate('userId', 'username').sort({ createdAt: -1 });
    
        console.log('Orders:', orders); // Debugging: Output orders array to check if it contains data
    
        if (orders.length === 0) {
          console.log('No orders found for the given filter criteria.');
          return res.status(404).send('No data found for export.');
        }
    
        // Calculate totals
        const totalSalesCount = orders.length;
        const totalOrderAmount = orders.reduce((total, order) => total + order.amount, 0);
        const totalDiscount = orders.reduce((total, order) => total + order.discount, 0);
    
        console.log('Total Sales Count:', totalSalesCount);
        console.log('Total Order Amount:', totalOrderAmount);
        console.log('Total Discount:', totalDiscount);
    
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Overview');
    
        worksheet.columns = [
          { header: 'Order ID', key: 'orderId' },
          { header: 'User', key: 'username' },
          { header: 'Amount', key: 'amount' },
          { header: 'Discount', key: 'discount' },
          { header: 'Coupon', key: 'coupon' },
          { header: 'Created At', key: 'createdAt' },
          { header: 'Status', key: 'status' },
        ];
    
        orders.forEach(order => {
          worksheet.addRow({
            orderId: order.orderId,
            username: order.userId.username,
            amount: order.amount,
            discount: order.discount,
            coupon: order.coupon,
            createdAt: order.createdAt.toDateString(),
            status: order.status
          });
        });
    
        // Add totals row
worksheet.addRow({}); // Empty row for spacing
worksheet.addRow({ 'Order ID': 'Total:', 'Amount': totalOrderAmount, 'Discount': totalDiscount });

// Add empty rows for more spacing
worksheet.addRow({});
worksheet.addRow({ 'Order ID': 'Total Sales Count:', 'Amount': totalSalesCount });

        const filePath = 'C:\\Users\\user\\Desktop\\brocamp\\project\\istore\\server\\controller\\adminController\\sales_overview.xlsx';
    
        await workbook.xlsx.writeFile(filePath);
    
        console.log('Excel file saved:', filePath); // Debugging: Output file path to console
    
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_overview.xlsx');
        res.sendFile(filePath, () => {
          // Clean up file after sending
          fs.unlinkSync(filePath);
        });
      } catch (error) {
        console.error('Error exporting orders to Excel:', error);
        res.status(500).send('Internal Server Error');
      }
    };
    
    
    
module.exports = { exportSalesToExcel, exportSalesToPDF };
