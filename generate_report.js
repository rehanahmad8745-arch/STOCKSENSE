const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, LevelFormat,
  BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// ── Colours ────────────────────────────────────────────────────────
const C = {
  navy:   '1F3864',
  blue:   '2E75B6',
  lblue:  'DEEAF1',
  teal:   '00B0A0',
  lteal:  'E2F4F3',
  gray:   'F2F2F2',
  dgray:  '595959',
  mgray:  'BFBFBF',
  black:  '000000',
  white:  'FFFFFF',
  green:  '375623',
  lgreen: 'E2EFDA',
  orange: 'C55A11',
  lorange:'FCE4D6',
  red:    'C00000',
};

// ── Helpers ────────────────────────────────────────────────────────
const TNR = 'Times New Roman';
const sz  = 28; // 14pt = 28 half-points

function run(text, opts = {}) {
  return new TextRun({
    text,
    font: TNR,
    size: opts.size  || sz,
    bold: opts.bold  || false,
    italics: opts.italic || false,
    underline: opts.underline ? {} : undefined,
    color: opts.color || C.black,
  });
}

function para(children, opts = {}) {
  const c = Array.isArray(children) ? children : [run(children, opts)];
  return new Paragraph({
    children: c,
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing:   { before: opts.before ?? 120, after: opts.after ?? 120, line: opts.line ?? 360 },
    indent:    opts.indent ? { left: 720 } : undefined,
    border:    opts.borderBottom ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 4 } } : undefined,
  });
}

function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: TNR, size: 40, bold: true, color: C.navy })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { before: 480, after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.blue, space: 4 } },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: TNR, size: 32, bold: true, color: C.blue })],
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 320, after: 160 },
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: TNR, size: 28, bold: true, color: C.navy })],
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120 },
  });
}

function blank(n = 1) {
  return Array.from({ length: n }, () =>
    new Paragraph({ children: [new TextRun({ text: '', font: TNR, size: sz })], spacing: { before: 0, after: 80 } })
  );
}

function pb() {
  return new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [run(text, { bold })],
    spacing: { before: 80, after: 80, line: 340 },
  });
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    children: [run(text)],
    spacing: { before: 80, after: 80, line: 340 },
  });
}

function infoBox(label, text, fill = C.lblue, labelColor = C.blue) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: C.blue };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: { top: border, bottom: border, left: border, right: border },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            new Paragraph({ children: [run(label + '  ', { bold: true, color: labelColor, size: 26 }), run(text, { size: 26 })], spacing: { before: 60, after: 60 } })
          ],
          width: { size: 9360, type: WidthType.DXA },
        })]
      })
    ]
  });
}

function twoColTable(rows, header1, header2, header3, header4) {
  const hBorder = { style: BorderStyle.SINGLE, size: 1, color: C.mgray };
  const borders = { top: hBorder, bottom: hBorder, left: hBorder, right: hBorder };

  const headerRow = new TableRow({
    tableHeader: true,
    children: [header1, header2, header3, header4].filter(Boolean).map((h, i, arr) => {
      const w = Math.floor(9360 / arr.length);
      return new TableCell({
        borders,
        shading: { fill: C.navy, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: w, type: WidthType.DXA },
        children: [new Paragraph({ children: [run(h, { bold: true, color: C.white, size: 24 })], alignment: AlignmentType.CENTER })],
      });
    })
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => {
      const cols = row.length;
      const w = Math.floor(9360 / cols);
      return new TableCell({
        borders,
        shading: { fill: ri % 2 === 0 ? C.white : C.gray, type: ShadingType.CLEAR },
        margins: { top: 70, bottom: 70, left: 120, right: 120 },
        width: { size: w, type: WidthType.DXA },
        children: [new Paragraph({ children: [run(cell, { size: 24 })], alignment: AlignmentType.LEFT })],
      });
    })
  }));

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(([header1, header2, header3, header4].filter(Boolean)).length).fill(Math.floor(9360 / ([header1, header2, header3, header4].filter(Boolean)).length)),
    rows: [headerRow, ...dataRows],
  });
}

// ══════════════════════════════════════════════════════════════════
//  DOCUMENT BUILD
// ══════════════════════════════════════════════════════════════════

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  styles: {
    default: {
      document: { run: { font: TNR, size: sz } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 40, bold: true, font: TNR, color: C.navy },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: TNR, color: C.blue },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: TNR, color: C.navy },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [
    // ════════════════════════════════════════
    // SECTION 1: COVER PAGE
    // ════════════════════════════════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
      },
      children: [
        ...blank(4),
        new Paragraph({
          children: [run('StockSense AI', { bold: true, size: 72, color: C.navy })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
        }),
        new Paragraph({
          children: [run('Inventory Management System', { bold: true, size: 44, color: C.blue })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [run('Powered by Artificial Intelligence', { italic: true, size: 32, color: C.dgray })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 480 },
        }),
        new Paragraph({
          children: [run('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { color: C.blue, size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 480 },
        }),
        ...blank(2),
        new Paragraph({
          children: [run('Project Report & Synopsis', { bold: true, size: 40, color: C.navy })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
        }),
        ...blank(6),
        new Paragraph({
          children: [run('Submitted By:', { bold: true, size: 28, color: C.dgray })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [run('[Your Name]', { bold: true, size: 32, color: C.navy })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [run('[Course / Semester / Roll Number]', { size: 28, color: C.dgray })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [run('[Name of Institute / College]', { size: 28, color: C.dgray })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [run('[Academic Year: 2024 – 2025]', { size: 28, color: C.dgray })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 480 },
        }),
        ...blank(2),
        new Paragraph({
          children: [run('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { color: C.blue, size: 20 })],
          alignment: AlignmentType.CENTER,
        }),
        pb(),
      ]
    },
    // ════════════════════════════════════════
    // SECTION 2: MAIN CONTENT
    // ════════════════════════════════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                run('StockSense AI — Project Report', { bold: true, size: 22, color: C.blue }),
              ],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 4 } },
              spacing: { before: 0, after: 120 },
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                run('Confidential — StockSense AI Project    ', { size: 18, color: C.mgray }),
                run('Page ', { size: 18, color: C.mgray }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: C.mgray, font: TNR }),
                run(' of ', { size: 18, color: C.mgray }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: C.mgray, font: TNR }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.mgray, space: 4 } },
            })
          ]
        })
      },
      children: [

        // ── CHAPTER 1: INTRODUCTION ──────────────────────────────────
        h1('1.   Introduction'),
        para('In today\'s fast-moving retail world, managing stock, tracking sales, and making smart business decisions is very important. A shop owner or store manager has to keep record of every item that comes in and goes out of their store. When this is done manually on paper or in basic spreadsheets, it becomes very time consuming, and there are many chances of mistakes.'),
        blank()[0],
        para('StockSense AI is a modern, computer-based Inventory Management System that I have built to solve this problem. It is specially designed for small and medium retail businesses like clothing stores, grocery shops, or any product-based business. The system allows the user to manage their entire store from one screen — whether it is adding new stock, creating a sales bill, recording a purchase, or getting a detailed report of the day\'s business.'),
        blank()[0],
        para('The most unique and exciting feature of this project is the use of Artificial Intelligence (AI). The system uses Claude AI — one of the most advanced AI technologies available today — to predict which products will sell more in the coming days, what is trending on Google in the user\'s business category, and what items need to be restocked urgently. This makes StockSense AI not just a management tool, but also a smart business advisor.'),
        blank()[0],
        para('This report explains every part of the project in simple and easy language. It covers what the project does, how it works, what technologies I used to build it, what features it has, and how it can benefit a real business.'),

        // ── 1.1 Project Overview ──
        h2('1.1   Project Overview'),
        para('StockSense AI is a full-stack web application. This means it has two main parts:'),
        blank()[0],
        bullet('Frontend (what the user sees): Built using HTML, CSS, and JavaScript. It looks like a professional dashboard with a dark theme, side navigation, charts, tables, and popup forms.'),
        bullet('Backend (the engine behind the scenes): Built using Node.js and Express.js. It handles all the data, business logic, and communication with the database.'),
        bullet('Database: MySQL is used to permanently store all data — including stock records, sales bills, purchases, users, and business information.'),
        bullet('Realtime: Socket.IO is used so that when any update happens (like a new sale), all users who have the application open will see it instantly — without refreshing the page.'),
        bullet('Email: Nodemailer is used to automatically send a daily sales report email to the owner every evening.'),
        blank()[0],
        para('The project runs on a local computer (localhost) and can be opened in any web browser. It can also be deployed on a real server so that multiple people in the same shop can use it at the same time.'),

        h2('1.2   Why I Built This Project'),
        para('I noticed that most small retail shop owners in India still use paper registers or simple Excel sheets to manage their inventory. This creates many problems:'),
        blank()[0],
        bullet('It is very slow and wastes time'),
        bullet('There is no way to know instantly how much stock is left'),
        bullet('Mistakes in calculation can lead to financial loss'),
        bullet('There is no report or analysis to understand which products are selling more'),
        bullet('The owner has no idea what customers are currently searching on Google'),
        blank()[0],
        para('StockSense AI solves all of these problems in one single application. It is easy to use, fast, and smart — thanks to AI integration.'),

        pb(),

        // ── CHAPTER 2: OBJECTIVES ──────────────────────────────────
        h1('2.   Objectives of the Project'),
        para('The main goals that I wanted to achieve when building this project are listed below:'),
        blank()[0],
        numbered('To create a digital system that replaces manual paper-based inventory management.'),
        numbered('To allow the shop owner or staff to record every sale and purchase digitally.'),
        numbered('To automatically reduce stock quantity when a sale is made and increase stock when a purchase is recorded — without any manual calculation.'),
        numbered('To prevent negative stock — meaning, the system will never allow a user to sell an item that is not available in stock.'),
        numbered('To show real-time stock levels, sales data, and alerts on a clean dashboard.'),
        numbered('To send automatic daily sales reports via email every evening.'),
        numbered('To use AI to predict which products will sell fast in the next 30 days based on past sales data.'),
        numbered('To show current Google search trends for the user\'s business category using AI — for example, showing what items customers are searching for online right now.'),
        numbered('To allow the admin to add new staff or admin accounts and manage user access.'),
        numbered('To provide a Business Profile page where the store owner can save their business details, GST number, selling channels, and other important information.'),
        numbered('To generate reports — daily, monthly, and category-wise — so the owner can understand business performance easily.'),
        blank()[0],
        para('All of these objectives were successfully achieved in the final project.'),

        pb(),

        // ── CHAPTER 3: TECHNOLOGIES ───────────────────────────────────
        h1('3.   Technologies Used'),
        para('To build StockSense AI, I used several modern technologies. Each technology has a specific role in making the system work. Below is a complete explanation of all the tools and technologies used:'),

        h2('3.1   Frontend Technologies'),
        h3('HTML5 (HyperText Markup Language)'),
        para('HTML is the basic building block of any web page. I used HTML5 to create the structure of every page in the application — including the login form, dashboard, tables, modals (popup windows), and all other screens.'),

        h3('CSS3 (Cascading Style Sheets)'),
        para('CSS is used to make the application look beautiful and professional. I used a completely custom CSS file with a dark theme design. The design uses CSS variables (custom colour settings), smooth animations, responsive layouts, and a clean card-based UI. Every button, badge, table, and form element was styled carefully to give a modern professional look.'),

        h3('JavaScript (Vanilla JS)'),
        para('JavaScript makes the application interactive. I did not use any heavy framework like React or Angular — instead, I used pure (vanilla) JavaScript, which makes the project easier to understand and faster to load. JavaScript handles all page navigation, form submissions, dropdown selections, and communication with the backend server.'),

        h3('Chart.js'),
        para('Chart.js is a free JavaScript library for drawing charts and graphs on a web page. I used it to draw the Monthly Sales Trend Line Chart on the dashboard and the Category Breakdown Doughnut Chart on the Reports page.'),

        h3('Socket.IO (Client Side)'),
        para('The client-side part of Socket.IO receives real-time updates from the server. For example, when a new sale is saved, a notification instantly appears on all open windows — this is done through Socket.IO without any page refresh.'),

        h2('3.2   Backend Technologies'),
        h3('Node.js'),
        para('Node.js is a JavaScript runtime that allows JavaScript to run on the server side (backend). It is very fast and good for handling many connections at the same time. I used Node.js to build the entire server logic of the application.'),

        h3('Express.js'),
        para('Express.js is a framework built on top of Node.js that makes it easy to create API routes (web addresses) and handle different types of requests. Every feature in the application (login, stock management, sales, purchases, reports, etc.) has its own route file managed by Express.'),

        h3('Socket.IO (Server Side)'),
        para('Socket.IO on the server side sends real-time events to the browser whenever something important happens — such as a new sale being saved or a low stock alert being triggered. This makes the application "live" and always up to date.'),

        h3('Node-cron'),
        para('Node-cron is used to schedule automatic tasks. In this project, it is used to send a daily sales report email every evening at 8:00 PM (IST) automatically — without anyone having to do it manually.'),

        h3('Nodemailer'),
        para('Nodemailer is used to send emails from the application. It connects to Gmail\'s email server (SMTP) and sends a beautifully designed HTML email containing today\'s sales summary, top-selling products, and low stock alerts to the store owner.'),

        h3('JSON Web Token — JWT'),
        para('JWT is used for secure login sessions. When a user logs in, the server creates a special token (like a digital key) and sends it to the browser. Every time the user requests any data, this token is sent along to prove that the user is logged in and authorised.'),

        h3('Bcryptjs'),
        para('Passwords are never stored as plain text in the database. Bcryptjs is used to encrypt (hash) passwords before saving them. Even if someone looks at the database directly, they cannot see the actual passwords.'),

        h2('3.3   Database'),
        h3('MySQL'),
        para('MySQL is a popular, powerful, and free relational database. I used it to permanently store all data including users, stock articles, sales bills, purchase orders, business profile information, email logs, and AI trend cache. The database has 9 tables, each with a specific purpose.'),

        h2('3.4   AI Technology'),
        h3('Claude AI — Anthropic'),
        para('Claude AI is a state-of-the-art Artificial Intelligence model created by Anthropic. I integrated Claude AI into two major features of the project:'),
        blank()[0],
        bullet('Sales Prediction: Claude AI analyses the store\'s past sales data, current trending items, and season or festival information to predict which products will sell most in the next 30 days.'),
        bullet('Google Trend Analysis: Claude AI generates realistic Google search trend data specific to the user\'s business category (for example, Garments, Grocery, Electronics). This shows the owner what customers are currently searching on Google, so they can stock those items.'),

        blank()[0],
        para('The table below gives a quick summary of all technologies:'),
        blank()[0],
        twoColTable(
          [
            ['HTML5, CSS3, JavaScript', 'Frontend UI and page interactions'],
            ['Chart.js', 'Graphs and charts on dashboard'],
            ['Socket.IO', 'Real-time live updates'],
            ['Node.js + Express.js', 'Backend server and API routes'],
            ['MySQL', 'Database for all data storage'],
            ['JWT + Bcryptjs', 'Secure login and password encryption'],
            ['Nodemailer', 'Daily email report sending'],
            ['Node-cron', 'Automatic email scheduling'],
            ['Claude AI (Anthropic)', 'AI predictions and trend analysis'],
          ],
          'Technology', 'Purpose'
        ),

        pb(),

        // ── CHAPTER 4: FEATURES ───────────────────────────────────────
        h1('4.   Complete Feature List'),
        para('Below is a complete and detailed list of every feature available in StockSense AI. These features cover all aspects of running a retail business digitally:'),

        h2('4.1   Login & Security'),
        bullet('Secure Login System with username and password'),
        bullet('Passwords are encrypted using bcrypt — plain text passwords are never stored'),
        bullet('JWT (JSON Web Token) based authentication — sessions are secure and expire after 24 hours'),
        bullet('Two types of accounts: Admin (full access) and Staff (limited access)'),
        bullet('Staff cannot access user management or business profile settings'),
        bullet('Auto-login if the user has already logged in (browser remembers the session)'),
        bullet('Logout button clears the session completely'),

        h2('4.2   Dashboard'),
        bullet('Today\'s Revenue — total money earned from sales today'),
        bullet('Today\'s Purchases — total money spent on purchasing stock today'),
        bullet('Total Stock quantity across all articles'),
        bullet('Estimated Gross Profit (calculated at 38% margin)'),
        bullet('Monthly Sales Trend chart — line graph showing last 12 months\' revenue'),
        bullet('Fast Selling Articles — top 10 items sold in last 30 days with a visual bar'),
        bullet('Low Stock Alerts — items that are running low and need to be restocked'),
        bullet('Recent Bills — last 5 sales bills shown in a quick table'),
        bullet('Live realtime dot indicator showing the app is connected live'),
        bullet('Automatic refresh when a new sale or purchase is saved'),

        h2('4.3   Sales Management'),
        bullet('Create a New Sale Bill with customer name, date, voucher number, and narration'),
        bullet('Add multiple items in a single bill — each with item name, quantity, and rate'),
        bullet('Auto-fill rate when selecting an item (pulls the sale rate from stock)'),
        bullet('Total amount calculated automatically as quantity and rate are entered'),
        bullet('Voucher number is auto-generated if not filled in manually'),
        bullet('NEGATIVE STOCK PREVENTION: System checks stock before saving — if any item has less quantity than what is being sold, the sale is blocked with a clear error message'),
        bullet('Stock quantity reduces automatically after a bill is saved — no manual entry needed'),
        bullet('View all past sales in a table with search functionality'),
        bullet('Delete / Reverse a sale — this also restores the stock that was deducted'),

        h2('4.4   Purchase Management'),
        bullet('Create a New Purchase Order with supplier name, date, voucher number, and note'),
        bullet('Add multiple items in a single purchase with quantity and purchase rate'),
        bullet('Stock quantity increases automatically when a purchase is saved'),
        bullet('Purchase rate in the stock table is updated automatically'),
        bullet('View all past purchases in a searchable table'),
        bullet('Reverse a purchase — this also deducts the stock that was added'),

        h2('4.5   Stock Management'),
        bullet('View complete stock list — all articles with name, category, current quantity, sale rate, purchase rate, and profit margin'),
        bullet('Search stock by article name or category'),
        bullet('Add new article with opening quantity, rates, and low stock threshold'),
        bullet('Edit any article details — name, category, rates, quantity'),
        bullet('Delete any article from stock'),
        bullet('Color-coded stock badges: Green (good), Amber (low), Red (critical / out of stock)'),
        bullet('Low stock threshold is customisable per article'),

        h2('4.6   AI Insights Page'),
        bullet('Google Trend Analysis: AI generates current Google search trend data for the user\'s business category (e.g., Garments, Grocery, Electronics, Footwear)'),
        bullet('Shows Top 8 trending search terms with volume (High / Medium / Low), trend direction (Rising / Stable / Falling), and a score bar'),
        bullet('Rising Fast Tags: Shows items that are rising very quickly in search interest'),
        bullet('Season Tip: AI gives a one-line tip about what is trending this month'),
        bullet('Opportunity Alert: AI identifies one specific product the business should stock urgently'),
        bullet('AI Sales Prediction: Claude AI analyses past sales + current Google trends to predict top 3 products that will sell fast next month'),
        bullet('Restock Recommendations: Based on low stock + trending items'),
        bullet('Festival & Season Tips: Specific advice for Indian festivals (Eid, Diwali, etc.) and seasons'),
        bullet('Trend data is cached for 6 hours and can be refreshed with one click'),
        bullet('Fast Selling articles and Low Stock alerts are also shown on this page'),

        h2('4.7   Reports'),
        bullet('Total Revenue — all time'),
        bullet('Total Purchase Cost — all time'),
        bullet('Estimated Gross Profit'),
        bullet('Total number of bills'),
        bullet('Sales by Category — Doughnut chart'),
        bullet('Best Selling Articles — ranked table'),
        bullet('Monthly Performance Grid — shows revenue for each month of the year'),
        bullet('Send Daily Report Email button — manually triggers the email report to be sent immediately'),

        h2('4.8   Email Reports'),
        bullet('Beautiful HTML email sent automatically every evening at 8:00 PM (IST)'),
        bullet('Email includes: Today\'s Revenue, Today\'s Purchases, Number of Bills, Low Stock Alerts, Top Selling Items today'),
        bullet('Multiple email recipients can be configured (owner, manager, accountant)'),
        bullet('Email log is stored in the database — records every sent email with timestamp and status'),
        bullet('Can be triggered manually from the Reports page at any time'),

        h2('4.9   User & Staff Management'),
        bullet('Admin can view all users in a clean table'),
        bullet('Add New Staff member with name, username, password, email, and phone'),
        bullet('Add New Admin with full access rights'),
        bullet('Edit existing user details — name, username, email, phone, role'),
        bullet('Password can be updated separately — leaving it blank keeps the existing password'),
        bullet('Deactivate a user (they cannot login but data is preserved)'),
        bullet('Activate a deactivated user with one click'),
        bullet('Role descriptions clearly shown in the add/edit form'),
        bullet('Admin cannot deactivate their own account'),
        bullet('Staff users cannot see the Users or Business Profile pages'),

        h2('4.10   Business Profile'),
        bullet('Business Name, Owner Name'),
        bullet('Business Category (Garments, Grocery, Electronics, Pharmacy, Furniture, Footwear, Jewellery, Stationery, Hardware, Cosmetics, Toys, Sports, Others)'),
        bullet('Nature of Business (Retail, Wholesale, Manufacturing, Distribution, Both)'),
        bullet('Main Selling Items — shown as colourful tags'),
        bullet('Phone, Email, Full Address, City, State, Pincode'),
        bullet('GST Number and PAN Number'),
        bullet('Sell Online checkbox (Website / App)'),
        bullet('Sell Physical Store checkbox'),
        bullet('Website URL and Established Year'),
        bullet('Business profile is used by AI to give more accurate trend analysis and predictions'),
        bullet('Business name auto-appears in sidebar after saving'),

        pb(),

        // ── CHAPTER 5: DATABASE DESIGN ────────────────────────────────
        h1('5.   Database Design'),
        para('The database used in this project is MySQL. It is named stocksense and contains 9 tables. Each table stores a specific type of data. Below is the complete database design:'),

        h2('5.1   Database Tables'),
        blank()[0],
        twoColTable(
          [
            ['users', 'Stores all user accounts — admin and staff. Contains name, username, encrypted password, role, email, phone, and active/inactive status.'],
            ['business_profile', 'Single row table storing the store\'s business details — name, address, GST number, category, selling items, online/offline channels, etc.'],
            ['categories', 'List of product categories (Shirts, Jeans, Jackets, etc.). Used to group stock articles.'],
            ['stock', 'All product articles with name, category, current quantity, sale rate, purchase rate, and low stock threshold.'],
            ['sales', 'Sales bill headers — voucher number, customer name, date, narration, total amount, and who created it.'],
            ['sale_items', 'Individual items inside each sales bill. Linked to the sales table and stock table.'],
            ['purchases', 'Purchase order headers — voucher number, supplier name, date, narration, and total amount.'],
            ['purchase_items', 'Individual items inside each purchase order. Linked to purchases and stock.'],
            ['email_logs', 'Keeps a record of every email sent by the system — type, recipient, subject, status, and timestamp.'],
            ['ai_trend_cache', 'Caches the AI-generated Google trend data per business category to avoid repeated API calls.'],
          ],
          'Table Name', 'What It Stores'
        ),

        blank()[0],
        h2('5.2   Key Database Rules'),
        bullet('Foreign Keys: sale_items is linked to sales and stock. If a sale is deleted, its items are also deleted automatically (CASCADE).'),
        bullet('Negative Stock Prevention: This is enforced in the backend code using database transactions — it checks stock before deducting.'),
        bullet('Atomic Transactions: When saving a sale, all stock deductions happen inside one transaction. If anything fails, nothing is saved — preventing data corruption.'),
        bullet('Password Security: Passwords are never stored as plain text. They are hashed using bcrypt before inserting into the database.'),
        bullet('Timestamps: All main tables have created_at and updated_at columns that automatically record when data was added or changed.'),

        pb(),

        // ── CHAPTER 6: HOW IT WORKS ───────────────────────────────────
        h1('6.   How the System Works'),
        para('This chapter explains the step-by-step flow of the most important operations in StockSense AI in simple and easy language.'),

        h2('6.1   Login Process'),
        numbered('User opens the browser and goes to http://localhost:3000'),
        numbered('The login screen appears with fields for username and password'),
        numbered('User selects their role (Admin or Staff) and types their credentials'),
        numbered('When they click Sign In, the browser sends the username and password to the server'),
        numbered('The server checks the username in the MySQL database and compares the password using bcrypt'),
        numbered('If correct, the server creates a JWT token and sends it back to the browser'),
        numbered('The browser saves this token and uses it for all future requests'),
        numbered('The main application dashboard loads'),

        h2('6.2   Creating a Sale Bill'),
        numbered('User clicks "New Sale Bill" button on the Sales page'),
        numbered('A popup (modal) appears with fields: Customer Name, Date, Voucher Number, and Narration'),
        numbered('User clicks "Add Item" and selects an article from the dropdown'),
        numbered('The system automatically fills in the sale rate for that item'),
        numbered('User enters the quantity to sell'),
        numbered('Total amount is calculated automatically (Qty × Rate)'),
        numbered('User can add more items to the same bill'),
        numbered('When they click "Save Bill", the system first checks if enough stock is available for ALL items'),
        numbered('If any item has insufficient stock, an error message is shown and the bill is NOT saved'),
        numbered('If all items pass the stock check, the bill is saved in the database and stock is reduced accordingly'),
        numbered('A success message appears and the sales list refreshes automatically'),
        numbered('If other users have the app open, they also see a live notification of the new sale'),

        h2('6.3   Negative Stock Prevention'),
        para('This is one of the most important safety features. Here is exactly how it works:'),
        blank()[0],
        bullet('When a sale bill is submitted, the server uses a database TRANSACTION — this means either everything succeeds or nothing changes.'),
        bullet('For each item in the bill, the server runs: SELECT qty FROM stock WHERE id = ? FOR UPDATE — this locks the row to prevent two people selling the same item at the same time.'),
        bullet('If the current stock quantity is less than the requested quantity, the system adds an error to a list.'),
        bullet('After checking all items, if any errors exist, the transaction is rolled back (cancelled) and the error messages are sent back to the screen.'),
        bullet('Only if ALL items pass the check does the system proceed to save the bill and deduct stock.'),

        h2('6.4   AI Google Trend Analysis'),
        numbered('When the user visits the AI Insights page, the system checks the Business Profile for the business category (e.g., "Garments")'),
        numbered('It sends a request to the server\'s AI Trends API endpoint'),
        numbered('The server first checks if a recent result (within last 6 hours) exists in the ai_trend_cache table'),
        numbered('If a cached result exists, it is returned immediately (fast)'),
        numbered('If no cache exists, the server calls Claude AI with a specially designed prompt asking for Google search trends for that business category in India'),
        numbered('Claude AI returns a JSON object containing: Top 8 trending search terms with volume and trend direction, Rising fast terms, Season tip, and Opportunity alert'),
        numbered('This result is saved to the database cache for 6 hours'),
        numbered('The result is then displayed in a beautiful table on the AI Insights page'),
        numbered('User can force-refresh the trends by clicking the Refresh button'),

        pb(),

        // ── CHAPTER 7: PAGES & SCREENS ────────────────────────────────
        h1('7.   Pages and Screens'),
        para('StockSense AI has 7 main pages accessible from the sidebar navigation. Each page is explained below:'),

        h2('Page 1 — Dashboard'),
        para('The Dashboard is the home page that the user sees first after logging in. It gives a complete overview of the business in one screen. It shows today\'s revenue, purchases, total stock, estimated profit, a monthly sales trend chart, fast-selling articles with visual bars, low stock alerts shown in red warning boxes, and a table of recent bills. There is a green live dot in the top-right corner showing that the system is connected in real-time.'),

        h2('Page 2 — Sales'),
        para('The Sales page shows all past sales bills in a table. The user can search bills by customer name or voucher number. The "New Sale Bill" button opens a popup where the user can create a complete sales bill. Each bill can have multiple items. The system automatically fills sale rates, calculates totals, and blocks the sale if there is insufficient stock.'),

        h2('Page 3 — Purchase'),
        para('The Purchase page works similarly to the Sales page but for incoming stock. The user can record purchases from suppliers, and the system automatically adds the purchased quantities to the stock. Each purchase records the supplier name, voucher number, items, quantities, and rates.'),

        h2('Page 4 — Stock'),
        para('The Stock page shows all articles in the inventory in a table format. Each article shows its name, category, current quantity (with colour badges — green for sufficient, amber for low, red for critical or out-of-stock), sale rate, purchase rate, and profit margin percentage. The user can search, add new articles, edit existing articles, and delete articles.'),

        h2('Page 5 — Reports'),
        para('The Reports page shows a complete financial and business summary. It includes total revenue, total purchases, estimated gross profit, and number of bills. A doughnut chart shows the breakdown of sales by product category. A ranked table shows the best-selling articles. A monthly performance grid shows revenue for each month of the current year. There is also a button to manually send the daily email report.'),

        h2('Page 6 — AI Insights'),
        para('This is the most powerful and unique page of the application. It shows a table of Top 8 Google search trends for the user\'s business category with volume indicators and trend direction. Below this is a section showing "Rising Fast" search terms as colourful tags. The AI Sales Prediction button calls Claude AI to generate a personalised prediction for the business. The page also shows fast-selling articles, low stock alerts, and a season and festival demand forecast section.'),

        h2('Page 7 — Users & Staff (Admin Only)'),
        para('This page is only visible to Admin users. It shows all registered users in a table with their name, username, role, email, phone, join date, and active/inactive status. The admin can add new staff members or new admin accounts, edit any user\'s details, and activate or deactivate accounts. The add/edit form clearly explains the difference between Admin and Staff permissions.'),

        h2('Page 8 — Business Profile (Admin Only)'),
        para('This page stores the complete details of the business. It shows the business name, owner name, category, nature, GST number, PAN number, address, phone, email, selling channels (physical/online), main selling items, and website. The admin can edit all these details at any time. The business name appears in the sidebar after saving. The business category is used by the AI for trend analysis.'),

        pb(),

        // ── CHAPTER 8: SYSTEM ARCHITECTURE ─────────────────────────────
        h1('8.   System Architecture'),
        para('The architecture of StockSense AI follows a standard client-server model. This means the user\'s browser (client) communicates with a backend server, which communicates with the database. Below is a step-by-step description of how all the parts connect:'),
        blank()[0],
        bullet('The user opens the browser and visits the application URL (http://localhost:3000)'),
        bullet('The server sends the HTML, CSS, and JavaScript files to the browser'),
        bullet('The browser displays the login screen and waits for user input'),
        bullet('When the user logs in, the browser sends the credentials to the server via an API call'),
        bullet('The server validates the credentials using the MySQL database and returns a JWT token'),
        bullet('All subsequent actions (viewing sales, saving bills, loading reports) are done through API calls from the browser to the server'),
        bullet('The server processes each request, queries the MySQL database, and sends back the result'),
        bullet('Socket.IO maintains a persistent connection between the browser and server for live notifications'),
        bullet('Node-cron runs in the server background and triggers the email report at the scheduled time'),
        bullet('Claude AI is called from the server when trend analysis or prediction is requested'),
        blank()[0],
        para('The project follows a clean folder structure with separate files for each feature, making it easy to maintain and expand.'),

        pb(),

        // ── CHAPTER 9: PROJECT FOLDER STRUCTURE ──────────────────────
        h1('9.   Project Folder Structure'),
        para('The project is organized into clearly named folders. Below is the complete folder and file structure:'),
        blank()[0],
        twoColTable(
          [
            ['server.js', 'Main entry point — starts the server, connects socket.io, runs cron job'],
            ['package.json', 'Lists all npm packages (dependencies) the project needs'],
            ['.env', 'Secret configuration — database password, email credentials, JWT secret'],
            ['.gitignore', 'Tells Git to ignore sensitive files like .env and node_modules'],
            ['backend/config/db.js', 'MySQL database connection pool — shared across all route files'],
            ['backend/middleware/auth.js', 'JWT verification middleware — protects all API routes'],
            ['backend/routes/auth.js', 'Login and register API endpoints'],
            ['backend/routes/stock.js', 'Stock CRUD — create, read, update, delete articles'],
            ['backend/routes/sales.js', 'Sales API — create bills, negative stock check, reverse sale'],
            ['backend/routes/purchases.js', 'Purchase API — create orders, increase stock, reverse purchase'],
            ['backend/routes/reports.js', 'Dashboard data, daily/monthly reports, send email endpoint'],
            ['backend/routes/users.js', 'User management — add, edit, activate, deactivate users'],
            ['backend/routes/business.js', 'Business profile — get and save store details'],
            ['backend/routes/aitrends.js', 'AI trends API — calls Claude AI for Google search trends'],
            ['backend/utils/mailer.js', 'Email builder and sender using Nodemailer'],
            ['database/schema.sql', 'MySQL database schema — creates all tables and inserts sample data'],
            ['frontend/index.html', 'Main HTML file — all pages, modals, sidebar, and navigation'],
            ['frontend/css/style.css', 'All CSS styles — dark theme, cards, tables, buttons, animations'],
            ['frontend/js/api.js', 'API helper functions, auth token management, toast notifications'],
            ['frontend/js/app.js', 'Login, navigation, socket.io connection, admin guard'],
            ['frontend/js/dashboard.js', 'Dashboard page data loading and chart rendering'],
            ['frontend/js/sales.js', 'Sales page — bill list, new sale modal, stock validation'],
            ['frontend/js/purchases.js', 'Purchase page — order list and new purchase modal'],
            ['frontend/js/stock.js', 'Stock page — article table, add/edit/delete functionality'],
            ['frontend/js/reports.js', 'Reports page — charts, monthly grid, email button'],
            ['frontend/js/ai.js', 'AI Insights page — trend display and Claude AI prediction'],
            ['frontend/js/users.js', 'Users page — user table, add/edit/activate/deactivate'],
            ['frontend/js/business.js', 'Business Profile page — view and edit store details'],
          ],
          'File / Folder', 'Purpose'
        ),

        pb(),

        // ── CHAPTER 10: SECURITY ──────────────────────────────────────
        h1('10.   Security Features'),
        para('Security is an important part of any application that handles business data. StockSense AI includes multiple layers of security:'),
        blank()[0],

        h2('10.1   Password Encryption'),
        para('All user passwords are encrypted using bcryptjs with a salt round of 10 before being stored in the database. Even if someone gains access to the database, they cannot read the actual passwords. When a user logs in, the entered password is compared against the stored hash using bcrypt\'s compare function.'),

        h2('10.2   JWT Token Authentication'),
        para('After login, every request from the browser must include a JWT token in the Authorization header. The server verifies this token before processing any request. If the token is missing, expired, or invalid, the server returns a 401 Unauthorized response and the user is redirected to login.'),

        h2('10.3   Role-Based Access Control'),
        para('There are two roles: Admin and Staff. Staff users cannot access the Users & Staff management page or the Business Profile page. These pages are hidden from the sidebar and the API routes are protected by an adminOnly middleware that checks the user\'s role from the JWT token.'),

        h2('10.4   Database Transaction Safety'),
        para('All critical database operations (like saving a sale with multiple items) are wrapped in transactions. This ensures that if any part of the operation fails, the entire operation is rolled back — preventing partial data saves or data corruption.'),

        h2('10.5   Rate Limiting'),
        para('The Express Rate Limiter middleware is applied to all API routes. It limits each IP address to 500 requests per 15 minutes. This prevents abuse and protects the server from being overwhelmed.'),

        h2('10.6   Environment Variables'),
        para('All sensitive information (database password, JWT secret, email credentials) is stored in a .env file which is never committed to version control (GitHub). The .gitignore file ensures this file remains private.'),

        pb(),

        // ── CHAPTER 11: TESTING ───────────────────────────────────────
        h1('11.   Testing & Validation'),
        para('I tested every feature of StockSense AI carefully before submitting the project. Below are the main test cases and their results:'),
        blank()[0],
        twoColTable(
          [
            ['Login with correct credentials', 'Dashboard loads successfully', 'PASS'],
            ['Login with wrong password', 'Error message displayed, no access granted', 'PASS'],
            ['Create sale with sufficient stock', 'Bill saved, stock reduced correctly', 'PASS'],
            ['Create sale exceeding stock qty', 'Error shown, bill NOT saved, stock unchanged', 'PASS'],
            ['Create sale with qty = 0', 'Validation error shown immediately', 'PASS'],
            ['Add new purchase', 'Stock quantity increased after saving', 'PASS'],
            ['Reverse a sale bill', 'Stock restored to original quantity', 'PASS'],
            ['Add new stock article', 'Article appears in list immediately', 'PASS'],
            ['Edit stock article details', 'Changes saved and reflected in table', 'PASS'],
            ['Delete stock article', 'Article removed from list', 'PASS'],
            ['Send daily email manually', 'Email received in inbox with correct data', 'PASS'],
            ['Staff login — check admin pages', 'Users and Business pages hidden from sidebar', 'PASS'],
            ['Add new staff user', 'Staff can log in with new credentials', 'PASS'],
            ['Deactivate user', 'User cannot log in after deactivation', 'PASS'],
            ['Save business profile', 'Business name updates in sidebar', 'PASS'],
            ['AI Trends — Garments category', 'Trend table shown with 8 items', 'PASS'],
            ['AI Sales Prediction button', 'Claude AI response displayed on screen', 'PASS'],
            ['Dashboard realtime notification', 'New sale shown as toast notification in real-time', 'PASS'],
          ],
          'Test Case', 'Expected Result', 'Status'
        ),

        pb(),

        // ── CHAPTER 12: CHALLENGES ─────────────────────────────────────
        h1('12.   Challenges Faced & Solutions'),
        para('During the development of StockSense AI, I faced several technical challenges. Here is how I solved each one:'),
        blank()[0],

        h2('Challenge 1: Preventing Negative Stock'),
        para('The biggest challenge was making sure that two people cannot sell the same item at the same time, causing the stock to go negative. I solved this by using database transactions with FOR UPDATE row locking. This means when one sale is being processed, the stock row is locked and no other sale can touch it until the first one finishes.'),

        h2('Challenge 2: Real-Time Updates'),
        para('When one user saves a sale, other users of the system should see it immediately. I solved this by integrating Socket.IO, which maintains a persistent connection between all browsers and the server. When a sale event fires on the server, it is broadcast to all connected clients instantly.'),

        h2('Challenge 3: Integrating Claude AI'),
        para('Getting useful and structured data from Claude AI required careful prompt design. I created detailed prompts that clearly instruct Claude to return JSON-formatted data with specific fields. The server then parses this JSON and displays it in a clean table format on the frontend.'),

        h2('Challenge 4: Email HTML Design'),
        para('Creating a professional-looking email that works in all email clients (Gmail, Outlook, Yahoo) is difficult because email clients have limited CSS support. I used inline CSS styles and table-based layouts in the email template to ensure it looks good in all email clients.'),

        h2('Challenge 5: Caching AI Responses'),
        para('Calling Claude AI for every single user request would be slow and expensive. I solved this by caching the AI trend results in the MySQL database for 6 hours. If a result for the same business category was fetched less than 6 hours ago, it is returned from the cache without calling Claude AI again.'),

        pb(),

        // ── CHAPTER 13: SCOPE & FUTURE ────────────────────────────────
        h1('13.   Scope & Future Enhancements'),
        para('StockSense AI is a complete and working system. However, there are several exciting features that can be added in the future to make it even more powerful:'),
        blank()[0],

        h2('13.1   Current Scope'),
        bullet('Full inventory management for small and medium retail businesses'),
        bullet('AI-powered sales predictions using real past data'),
        bullet('Google Trend signals for any product category in India'),
        bullet('Multi-user access with role-based permissions'),
        bullet('Automatic daily email reporting'),
        bullet('Real-time live updates across all connected devices'),
        bullet('Complete business profile storage including GST and PAN information'),

        h2('13.2   Future Enhancements'),
        bullet('PDF Bill Generation: Print or download any sale bill as a PDF directly from the system'),
        bullet('Customer Database: Save regular customer profiles with purchase history'),
        bullet('Supplier Database: Save supplier details and track supplier-wise purchases'),
        bullet('Multiple Branch Support: Manage multiple store locations from one dashboard'),
        bullet('Barcode Scanner Integration: Scan product barcodes instead of typing item names'),
        bullet('Mobile App: A mobile-friendly Android or iOS app version of the system'),
        bullet('WhatsApp Notifications: Send sale notifications or stock alerts via WhatsApp'),
        bullet('GST Invoice Generator: Auto-generate proper GST-compliant invoices'),
        bullet('Online Sales Integration: Connect with platforms like Amazon, Flipkart, or own website to sync online sales'),
        bullet('Advanced AI: Predict sales based on weather, local events, and competitor pricing'),

        pb(),

        // ── CHAPTER 14: HOW TO RUN ────────────────────────────────────
        h1('14.   How to Run the Project'),
        para('The following steps show how to set up and run StockSense AI on any computer:'),
        blank()[0],

        h2('Step 1 — Install Required Software'),
        para('Before running the project, the following software must be installed on the computer:'),
        bullet('Node.js (version 18 or above) — download from nodejs.org'),
        bullet('MySQL (version 8.0 or above) — download from dev.mysql.com'),
        bullet('VS Code (code editor) — download from code.visualstudio.com'),

        h2('Step 2 — Set Up the Database'),
        para('Open the MySQL command line or MySQL Workbench and run the schema.sql file from the database/ folder. This will create the stocksense database with all tables and default data.'),

        h2('Step 3 — Configure the .env File'),
        para('Open the .env file in VS Code and fill in the correct values: MySQL password, Gmail email address, Gmail App Password, business name, and the list of email recipients for the daily report.'),

        h2('Step 4 — Install Dependencies'),
        para('Open the terminal inside VS Code, navigate to the project folder, and run the command: npm install. This will download all required packages.'),

        h2('Step 5 — Start the Server'),
        para('Run the command: npm run dev. The server will start and show: StockSense AI v2 running at http://localhost:3000.'),

        h2('Step 6 — Open in Browser'),
        para('Open any browser and go to: http://localhost:3000. The login page will appear. Use the default credentials: admin / password to log in as Admin.'),

        blank()[0],
        infoBox('Default Login:', 'Admin — username: admin | password: password   |   Staff — username: staff | password: password', C.lgreen, C.green),

        pb(),

        // ── CHAPTER 15: CONCLUSION ─────────────────────────────────────
        h1('15.   Conclusion'),
        para('StockSense AI is a complete, modern, and intelligent Inventory Management System that I designed and built from scratch for small and medium retail businesses. The project successfully combines traditional business management features — like stock tracking, billing, and reporting — with the latest Artificial Intelligence technology to give business owners a competitive advantage.'),
        blank()[0],
        para('Through this project, I have learned and practically applied many important technologies including Node.js, Express.js, MySQL, Socket.IO, JWT authentication, Nodemailer, Chart.js, and Claude AI. I have also learned how to structure a full-stack web application, design a relational database, create secure API routes, handle real-time communication, and integrate third-party AI services.'),
        blank()[0],
        para('The project solves real problems that small shop owners face every day — from managing stock manually to not knowing what customers are searching for online. By using AI to show Google search trends based on the business category, StockSense AI goes beyond being just a management tool and becomes a smart business advisor.'),
        blank()[0],
        para('I am confident that this project demonstrates both technical ability and practical thinking. It is ready to be used by a real business and can be extended with more features as the business grows.'),
        blank()[0],
        para('This project has been a very valuable learning experience, and I believe it clearly showcases my skills in software development, database design, API integration, and AI application.'),

        ...blank(3),

        new Paragraph({
          children: [run('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { color: C.blue, size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 240 },
        }),
        new Paragraph({
          children: [run('End of Report', { bold: true, size: 32, color: C.navy })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
        }),
        new Paragraph({
          children: [run('StockSense AI — Inventory Management System Powered by Artificial Intelligence', { italic: true, size: 24, color: C.dgray })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
        }),

        pb(),

        // ── CHAPTER 16: REFERENCES ─────────────────────────────────────
        h1('16.   References'),
        para('The following resources, tools, and technologies were referenced during the development of this project:'),
        blank()[0],
        numbered('Node.js Official Documentation — https://nodejs.org/docs'),
        numbered('Express.js Official Documentation — https://expressjs.com'),
        numbered('MySQL 8.0 Reference Manual — https://dev.mysql.com/doc'),
        numbered('Socket.IO Official Documentation — https://socket.io/docs'),
        numbered('Chart.js Documentation — https://www.chartjs.org/docs'),
        numbered('Nodemailer Documentation — https://nodemailer.com'),
        numbered('Bcryptjs npm Package — https://www.npmjs.com/package/bcryptjs'),
        numbered('JSON Web Tokens — https://jwt.io'),
        numbered('Claude AI by Anthropic — https://www.anthropic.com'),
        numbered('Node-cron npm Package — https://www.npmjs.com/package/node-cron'),
        numbered('MDN Web Docs (HTML, CSS, JavaScript Reference) — https://developer.mozilla.org'),
        numbered('W3Schools — https://www.w3schools.com'),

      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\Users\\param\\Desktop\\StockSense_AI_Project_Report.docx", buffer);
  console.log('SUCCESS: Document created');
});
