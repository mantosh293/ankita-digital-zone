const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('./config/env');

async function migrate() {
  const admin = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password, multipleStatements: true });
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();
  const conn = await mysql.createConnection({ ...config.db, multipleStatements: true });
  const dir = path.join(config.root, 'database/migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, '');
    if (sql.trim()) await conn.query(sql);
    console.log(`Applied ${file}`);
  }
  await conn.end();
  console.log('Database migrated');
}

async function seed() {
  const { query } = require('./config/db');
  const hash = (p) => bcrypt.hashSync(p, 12);
  await query('INSERT INTO users (role,name,mobile,email,password_hash,status,email_verified_at) VALUES (?,?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE role=VALUES(role), email=VALUES(email), password_hash=VALUES(password_hash), status="active"', ['admin', 'Portal Admin', '9999999999', config.admin.email, hash(config.admin.password), 'active']);
  await query('INSERT INTO users (role,name,father_name,dob,gender,mobile,email,password_hash,state,district,address,status,email_verified_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE status="active"', ['customer','Rajesh Kumar','Ram Kumar','1995-05-12','Male','9876543210','customer@example.com',hash('Customer@12345'),'Uttar Pradesh','Lucknow','Demo address','active']);
  await query('INSERT INTO users (role,name,mobile,email,password_hash,status,email_verified_at) VALUES (?,?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE status="active"', ['creator','Amit Creator','9876543220','creator@example.com',hash('Creator@12345'),'active']);
  const services = [
    ['PAN Card New','identity',150,50,'Aadhaar Card, Photo, Signature','bi-person-vcard'],
    ['PAN Card Correction','identity',120,45,'Existing PAN, Aadhaar, Photo','bi-person-vcard'],
    ['Aadhaar Update','identity',50,20,'Current Aadhaar, DOB Proof, Address Proof','bi-fingerprint'],
    ['Voter ID New','identity',80,30,'Aadhaar, Photo, Address Proof','bi-card-list'],
    ['Income Certificate','govt',200,80,'Aadhaar, Ration Card, Salary Slip','bi-file-earmark-check'],
    ['Caste Certificate','govt',200,80,'Aadhaar, Birth Certificate, Father ID','bi-file-earmark-person'],
    ['Residence Certificate','govt',150,60,'Aadhaar, Utility Bill, Photo','bi-house-door'],
    ['Passport','travel',1500,300,'Photo ID, Address Proof, Photo','bi-book'],
    ['Train Ticket','travel',40,10,'Photo ID Proof, Mobile Number','bi-train-front'],
    ['Electricity Bill Payment','utility',20,5,'Consumer Number','bi-lightning-charge'],
    ['Mobile Recharge','utility',10,2,'Mobile Number, Operator','bi-phone']
  ];
  for (const s of services) await query('INSERT INTO services (name,category,fee,creator_commission,required_documents,icon) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE category=VALUES(category), fee=VALUES(fee), creator_commission=VALUES(creator_commission), required_documents=VALUES(required_documents), status="active"', s);
  const cms = [
    ['homepage','Welcome to Ankita Cyber Cafe','All online services, government forms, jobs, results, and cyber cafe support at one place.','/',1],
    ['banner','Ankita Cyber Cafe Portal','Fast service applications, secure payments, and live tracking.','/services',1],
    ['about','About Ankita Cyber Cafe','We help students, families, workers, and businesses complete digital services with care and accuracy.','/about-us',1],
    ['contact','Contact Details','Phone: +91 9123456789\nEmail: ankitadigitalzone@gmail.com\nAddress: Main Road, Your City','/contact',1],
    ['pricing','PAN Card New','150|Creator Commission 50','/pricing',1],
    ['pricing','Aadhaar Update','50|Creator Commission 20','/pricing',2],
    ['job','Railway Group D Recruitment','Apply before last date.','/latest-jobs',1],
    ['admit_card','SSC Admit Card','Application No: ADM1001','/admit-card',1],
    ['result','Board Exam Result','Application No: RES1001','/results',1],
    ['student_link','Scholarship Portal','Official student scholarship link.','https://scholarships.gov.in',1],
    ['review','Fast PAN Service','Very helpful and quick service.','/about-us',1]
  ];
  for (const item of cms) await query('INSERT INTO cms_items (type,title,body,url,sort_order,status) VALUES (?,?,?,?,?,"published") ON DUPLICATE KEY UPDATE body=VALUES(body), url=VALUES(url), status="published"', item);
  console.log('Database seeded');
}

const action = process.argv[2];
(action === 'seed' ? seed() : migrate()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });



